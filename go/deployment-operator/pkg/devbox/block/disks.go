package block

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"maps"
	"slices"
	"strings"
	"sync"
	"time"

	"github.com/go-logr/logr"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	corev1 "k8s.io/api/core/v1"
	storagev1 "k8s.io/api/storage/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/utils/ptr"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// Disks is the provider: the cluster's own CSI driver for disks, which creates, attaches, mounts, snapshots and
// grows them. Disks and snapshots are named by the controller, and every call is idempotent on the name. A call
// that's waiting on the provider returns Unavailable once it has waited long enough, and picks up where it left
// off when called again.
type Disks interface {
	// Create creates a disk where node can reach it, from a snapshot when spec names one, and returns its size.
	Create(ctx context.Context, name string, spec DiskSpec) (int64, error)
	// Reachable reports whether node can attach the disk.
	Reachable(ctx context.Context, disk, node string) (bool, error)
	// Attach attaches the disk to node and returns where its filesystem is mounted there, relative to the
	// kubelet's root directory on the node. The mount may follow the attach by a moment.
	Attach(ctx context.Context, disk, node string) (string, error)
	// Detach unmounts the disk and detaches it from node, or from wherever it is when node is empty.
	Detach(ctx context.Context, disk, node string) error
	// Free reports how many more of the provider's disks node can attach, or -1 when it doesn't say.
	Free(ctx context.Context, node string) (int, error)
	Delete(ctx context.Context, disk string) error
	// Snapshot snapshots the disk under name and reports whether the snapshot can seed new disks yet.
	Snapshot(ctx context.Context, name, disk string) (bool, error)
	DeleteSnapshot(ctx context.Context, name string) error
	// Expand grows the disk to size. The filesystem grows when it's next mounted, or while it is.
	Expand(ctx context.Context, disk string, size int64) error
}

// DiskSpec is a disk to create.
type DiskSpec struct {
	CapacityBytes int64
	// Params are the provider's StorageClass parameters.
	Params map[string]string
	// Node is the Kubernetes node the disk is first attached to.
	Node string
	// Snapshot is the snapshot the disk starts from.
	Snapshot string
}

const (
	// selectedNode is the annotation the scheduler puts on a WaitForFirstConsumer claim; the provider's
	// provisioner creates the claim's disk where that node can reach it.
	selectedNode = "volume.kubernetes.io/selected-node"
	// DiskLabel marks the claims, anchor pods and snapshots of disks, valued with the disk's name.
	DiskLabel = "devboxes.plural.sh/block-disk"
	// ClassLabel marks the provider StorageClasses and VolumeSnapshotClasses the controller creates.
	ClassLabel = "devboxes.plural.sh/block-class"

	defaultClassAnnotation     = "storageclass.kubernetes.io/is-default-class"
	betaDefaultClassAnnotation = "storageclass.beta.kubernetes.io/is-default-class"
	defaultSnapshotClass       = "snapshot.storage.kubernetes.io/is-default-class"
	fsTypeParam                = "csi.storage.k8s.io/fstype"

	defaultDiskWait = 2 * time.Minute
)

var (
	snapshotGroup      = "snapshot.storage.k8s.io"
	volumeSnapshotGVK  = schema.GroupVersionKind{Group: snapshotGroup, Version: "v1", Kind: "VolumeSnapshot"}
	snapshotClassGVK   = schema.GroupVersionKind{Group: snapshotGroup, Version: "v1", Kind: "VolumeSnapshotClass"}
	snapshotClassesGVK = schema.GroupVersionKind{Group: snapshotGroup, Version: "v1", Kind: "VolumeSnapshotClassList"}
)

// KubeDisks drives the provider through Kubernetes, so the provider's own install does all the work: each disk is
// a PersistentVolumeClaim in Namespace, on a WaitForFirstConsumer StorageClass of the provider, with the node it's
// created for as its selected node. Each attachment is an anchor pod on the node that mounts the claim, so the
// kubelet attaches and mounts the disk the way it does any pod's, and the attach/detach controller keeps it
// attached while the pod runs. Snapshots are VolumeSnapshots, and growing a disk grows its claim.
type KubeDisks struct {
	Client    client.Client
	Namespace string
	// AnchorImage runs the anchor pods. It only needs to wait for SIGTERM: `devbox-block --mode=anchor`.
	AnchorImage string
	// AnchorTemplate is a strategic merge patch over the anchor pods' defaults (see ParseAnchorTemplate).
	AnchorTemplate []byte
	// Wait bounds how long a call waits on the provider. Defaults to two minutes.
	Wait         time.Duration
	PollInterval time.Duration
	Log          logr.Logger

	mu            sync.Mutex
	provider      string
	snapshotClass string
	classes       map[string]bool
}

func (k *KubeDisks) checked() (provider, snapshotClass string, err error) {
	k.mu.Lock()
	defer k.mu.Unlock()
	if k.provider == "" {
		return "", "", status.Error(codes.Unavailable, "the provider hasn't been checked yet")
	}
	return k.provider, k.snapshotClass, nil
}

func (k *KubeDisks) Create(ctx context.Context, name string, spec DiskSpec) (int64, error) {
	pvc := &corev1.PersistentVolumeClaim{}
	err := k.Client.Get(ctx, client.ObjectKey{Namespace: k.Namespace, Name: name}, pvc)
	if apierrors.IsNotFound(err) {
		class, err := k.storageClass(ctx, spec.Params)
		if err != nil {
			return 0, err
		}
		pvc = &corev1.PersistentVolumeClaim{
			ObjectMeta: metav1.ObjectMeta{
				Name: name, Namespace: k.Namespace,
				Labels:      map[string]string{DiskLabel: name},
				Annotations: map[string]string{selectedNode: spec.Node},
			},
			Spec: corev1.PersistentVolumeClaimSpec{
				AccessModes:      []corev1.PersistentVolumeAccessMode{corev1.ReadWriteOnce},
				StorageClassName: ptr.To(class),
				VolumeMode:       ptr.To(corev1.PersistentVolumeFilesystem),
				Resources: corev1.VolumeResourceRequirements{Requests: corev1.ResourceList{
					corev1.ResourceStorage: *resource.NewQuantity(spec.CapacityBytes, resource.BinarySI),
				}},
			},
		}
		if spec.Snapshot != "" {
			pvc.Spec.DataSource = &corev1.TypedLocalObjectReference{APIGroup: ptr.To(snapshotGroup), Kind: volumeSnapshotGVK.Kind, Name: spec.Snapshot}
		}
		if err := k.Client.Create(ctx, pvc); err != nil && !apierrors.IsAlreadyExists(err) {
			return 0, status.Errorf(codes.Internal, "creating the claim of disk %s: %v", name, err)
		}
	} else if err != nil {
		return 0, status.Errorf(codes.Internal, "reading the claim of disk %s: %v", name, err)
	}

	err = k.poll(ctx, fmt.Sprintf("disk %s isn't provisioned yet", name), func() (bool, error) {
		if err := k.Client.Get(ctx, client.ObjectKey{Namespace: k.Namespace, Name: name}, pvc); err != nil {
			return false, status.Errorf(codes.Internal, "reading the claim of disk %s: %v", name, err)
		}
		return pvc.Status.Phase == corev1.ClaimBound, nil
	})
	if err != nil {
		return 0, err
	}
	size := pvc.Status.Capacity[corev1.ResourceStorage]
	return size.Value(), nil
}

// storageClass is the provider's StorageClass for a set of parameters, created the first time they're used.
func (k *KubeDisks) storageClass(ctx context.Context, params map[string]string) (string, error) {
	provider, _, err := k.checked()
	if err != nil {
		return "", err
	}
	params = maps.Clone(params)
	if params == nil {
		params = map[string]string{}
	}
	if params[fsTypeParam] == "" {
		params[fsTypeParam] = "ext4"
	}
	keys := slices.Sorted(maps.Keys(params))
	h := sha256.New()
	h.Write([]byte(provider))
	for _, key := range keys {
		fmt.Fprintf(h, "\n%s=%s", key, params[key])
	}
	name := "devbox-block-" + hex.EncodeToString(h.Sum(nil))[:12]

	k.mu.Lock()
	known := k.classes[name]
	k.mu.Unlock()
	if known {
		return name, nil
	}
	sc := &storagev1.StorageClass{
		ObjectMeta:           metav1.ObjectMeta{Name: name, Labels: map[string]string{ClassLabel: "true"}},
		Provisioner:          provider,
		Parameters:           params,
		ReclaimPolicy:        ptr.To(corev1.PersistentVolumeReclaimDelete),
		VolumeBindingMode:    ptr.To(storagev1.VolumeBindingWaitForFirstConsumer),
		AllowVolumeExpansion: ptr.To(true),
	}
	if err := k.Client.Create(ctx, sc); err != nil && !apierrors.IsAlreadyExists(err) {
		return "", status.Errorf(codes.Internal, "creating StorageClass %s: %v", name, err)
	}
	k.mu.Lock()
	if k.classes == nil {
		k.classes = map[string]bool{}
	}
	k.classes[name] = true
	k.mu.Unlock()
	return name, nil
}

func (k *KubeDisks) volume(ctx context.Context, disk string) (*corev1.PersistentVolume, error) {
	pvc := &corev1.PersistentVolumeClaim{}
	if err := k.Client.Get(ctx, client.ObjectKey{Namespace: k.Namespace, Name: disk}, pvc); err != nil {
		if apierrors.IsNotFound(err) {
			return nil, status.Errorf(codes.NotFound, "disk %s doesn't exist", disk)
		}
		return nil, status.Errorf(codes.Internal, "reading the claim of disk %s: %v", disk, err)
	}
	if pvc.Spec.VolumeName == "" {
		return nil, status.Errorf(codes.Unavailable, "disk %s isn't provisioned yet", disk)
	}
	pv := &corev1.PersistentVolume{}
	if err := k.Client.Get(ctx, client.ObjectKey{Name: pvc.Spec.VolumeName}, pv); err != nil {
		return nil, status.Errorf(codes.Internal, "reading the volume of disk %s: %v", disk, err)
	}
	return pv, nil
}

func (k *KubeDisks) Reachable(ctx context.Context, disk, node string) (bool, error) {
	pv, err := k.volume(ctx, disk)
	if err != nil {
		return false, err
	}
	n := &corev1.Node{}
	if err := k.Client.Get(ctx, client.ObjectKey{Name: node}, n); err != nil {
		if apierrors.IsNotFound(err) {
			return false, status.Errorf(codes.NotFound, "node %s doesn't exist", node)
		}
		return false, status.Errorf(codes.Internal, "reading node %s: %v", node, err)
	}
	return nodeMatches(pv.Spec.NodeAffinity, n), nil
}

func (k *KubeDisks) Attach(ctx context.Context, disk, node string) (string, error) {
	provider, _, err := k.checked()
	if err != nil {
		return "", err
	}
	if err := k.nodeHasProvider(ctx, node, provider); err != nil {
		return "", err
	}
	pv, err := k.volume(ctx, disk)
	if err != nil {
		return "", err
	}
	name := anchorName(disk)
	pod := &corev1.Pod{}
	err = k.Client.Get(ctx, client.ObjectKey{Namespace: k.Namespace, Name: name}, pod)
	switch {
	case err == nil && (pod.Spec.NodeName != node || pod.Status.Phase == corev1.PodFailed || pod.Status.Phase == corev1.PodSucceeded):
		// An anchor left on another node, or one that ended, goes first.
		if err := k.deleteAnchor(ctx, disk); err != nil {
			return "", err
		}
		if err := k.waitAnchorGone(ctx, disk); err != nil {
			return "", err
		}
		fallthrough
	case apierrors.IsNotFound(err):
		if pod, err = anchorPod(k.AnchorTemplate, k.AnchorImage, disk, node, k.Namespace); err != nil {
			return "", status.Errorf(codes.Internal, "building the anchor of disk %s: %v", disk, err)
		}
		if err := k.Client.Create(ctx, pod); err != nil && !apierrors.IsAlreadyExists(err) {
			return "", status.Errorf(codes.Internal, "creating the anchor of disk %s: %v", disk, err)
		}
	case err != nil:
		return "", status.Errorf(codes.Internal, "reading the anchor of disk %s: %v", disk, err)
	}

	// The kubelet mounts the disk as soon as it's attached, before it starts the anchor's sandbox and container, so
	// the attach is done once the VolumeAttachment is; the node plugin waits for the mount.
	attachment := attachmentName(pv, node)
	err = k.poll(ctx, fmt.Sprintf("disk %s isn't attached to node %s yet", disk, node), func() (bool, error) {
		if err := k.Client.Get(ctx, client.ObjectKey{Namespace: k.Namespace, Name: name}, pod); err != nil {
			return false, status.Errorf(codes.Internal, "reading the anchor of disk %s: %v", disk, err)
		}
		switch pod.Status.Phase {
		case corev1.PodRunning:
			return true, nil
		case corev1.PodFailed, corev1.PodSucceeded:
			return false, status.Errorf(codes.Unavailable, "the anchor of disk %s on node %s ended: %s", disk, node, pod.Status.Message)
		}
		if attachment == "" {
			return false, nil
		}
		va := &storagev1.VolumeAttachment{}
		if err := k.Client.Get(ctx, client.ObjectKey{Name: attachment}, va); err != nil {
			if apierrors.IsNotFound(err) {
				return false, nil
			}
			return false, status.Errorf(codes.Internal, "reading the attachment of disk %s: %v", disk, err)
		}
		return va.Status.Attached, nil
	})
	if err != nil {
		return "", err
	}
	// Where the kubelet mounts a CSI volume for a pod.
	return fmt.Sprintf("pods/%s/volumes/kubernetes.io~csi/%s/mount", pod.UID, pv.Name), nil
}

// attachmentName is the name the attach/detach controller gives the VolumeAttachment of a CSI volume on a node, or
// empty for a volume that isn't CSI.
func attachmentName(pv *corev1.PersistentVolume, node string) string {
	if pv.Spec.CSI == nil {
		return ""
	}
	return fmt.Sprintf("csi-%x", sha256.Sum256([]byte(pv.Spec.CSI.VolumeHandle+pv.Spec.CSI.Driver+node)))
}

func (k *KubeDisks) nodeHasProvider(ctx context.Context, node, provider string) error {
	csiNode := &storagev1.CSINode{}
	if err := k.Client.Get(ctx, client.ObjectKey{Name: node}, csiNode); err != nil {
		if apierrors.IsNotFound(err) {
			return status.Errorf(codes.FailedPrecondition, "node %s has no CSI drivers registered", node)
		}
		return status.Errorf(codes.Internal, "reading CSINode %s: %v", node, err)
	}
	for _, d := range csiNode.Spec.Drivers {
		if d.Name == provider {
			return nil
		}
	}
	return status.Errorf(codes.FailedPrecondition, "node %s doesn't run the node plugin of %s", node, provider)
}

func (k *KubeDisks) Free(ctx context.Context, node string) (int, error) {
	provider, _, err := k.checked()
	if err != nil {
		return 0, err
	}
	csiNode := &storagev1.CSINode{}
	if err := k.Client.Get(ctx, client.ObjectKey{Name: node}, csiNode); err != nil {
		return 0, status.Errorf(codes.Internal, "reading CSINode %s: %v", node, err)
	}
	limit := -1
	for _, d := range csiNode.Spec.Drivers {
		if d.Name == provider && d.Allocatable != nil && d.Allocatable.Count != nil {
			limit = int(*d.Allocatable.Count)
		}
	}
	if limit < 0 {
		return -1, nil
	}
	var list storagev1.VolumeAttachmentList
	if err := k.Client.List(ctx, &list); err != nil {
		return 0, status.Errorf(codes.Internal, "listing VolumeAttachments: %v", err)
	}
	for _, va := range list.Items {
		if va.Spec.NodeName == node && va.Spec.Attacher == provider {
			limit--
		}
	}
	return max(limit, 0), nil
}

func (k *KubeDisks) deleteAnchor(ctx context.Context, disk string) error {
	pod := &corev1.Pod{ObjectMeta: metav1.ObjectMeta{Name: anchorName(disk), Namespace: k.Namespace}}
	if err := client.IgnoreNotFound(k.Client.Delete(ctx, pod)); err != nil {
		return status.Errorf(codes.Internal, "deleting the anchor of disk %s: %v", disk, err)
	}
	return nil
}

func (k *KubeDisks) waitAnchorGone(ctx context.Context, disk string) error {
	return k.poll(ctx, fmt.Sprintf("disk %s isn't unmounted yet", disk), func() (bool, error) {
		err := k.Client.Get(ctx, client.ObjectKey{Namespace: k.Namespace, Name: anchorName(disk)}, &corev1.Pod{})
		if apierrors.IsNotFound(err) {
			return true, nil
		}
		return false, client.IgnoreNotFound(err)
	})
}

func (k *KubeDisks) Detach(ctx context.Context, disk, node string) error {
	pod := &corev1.Pod{}
	err := k.Client.Get(ctx, client.ObjectKey{Namespace: k.Namespace, Name: anchorName(disk)}, pod)
	switch {
	case apierrors.IsNotFound(err):
	case err != nil:
		return status.Errorf(codes.Internal, "reading the anchor of disk %s: %v", disk, err)
	case node != "" && pod.Spec.NodeName != node:
		// Attached elsewhere since; that attachment isn't this detach's to end.
		return nil
	default:
		if node == "" {
			node = pod.Spec.NodeName
		}
		if err := k.deleteAnchor(ctx, disk); err != nil {
			return err
		}
		if err := k.waitAnchorGone(ctx, disk); err != nil {
			return err
		}
	}
	if node == "" {
		return nil
	}
	pv, err := k.volume(ctx, disk)
	if status.Code(err) == codes.NotFound {
		return nil
	}
	if err != nil {
		return err
	}
	attachment := attachmentName(pv, node)
	return k.poll(ctx, fmt.Sprintf("disk %s isn't detached from node %s yet", disk, node), func() (bool, error) {
		if attachment != "" {
			err := k.Client.Get(ctx, client.ObjectKey{Name: attachment}, &storagev1.VolumeAttachment{})
			if apierrors.IsNotFound(err) {
				return true, nil
			}
			if err != nil {
				return false, status.Errorf(codes.Internal, "reading the attachment of disk %s: %v", disk, err)
			}
			return false, nil
		}
		var list storagev1.VolumeAttachmentList
		if err := k.Client.List(ctx, &list); err != nil {
			return false, status.Errorf(codes.Internal, "listing VolumeAttachments: %v", err)
		}
		for _, va := range list.Items {
			if va.Spec.NodeName == node && ptr.Deref(va.Spec.Source.PersistentVolumeName, "") == pv.Name {
				return false, nil
			}
		}
		return true, nil
	})
}

// Delete deletes the disk's anchor and claim. The provider deletes the disk once it's detached.
func (k *KubeDisks) Delete(ctx context.Context, disk string) error {
	if err := k.deleteAnchor(ctx, disk); err != nil {
		return err
	}
	pvc := &corev1.PersistentVolumeClaim{ObjectMeta: metav1.ObjectMeta{Name: disk, Namespace: k.Namespace}}
	if err := client.IgnoreNotFound(k.Client.Delete(ctx, pvc)); err != nil {
		return status.Errorf(codes.Internal, "deleting the claim of disk %s: %v", disk, err)
	}
	return nil
}

func (k *KubeDisks) Snapshot(ctx context.Context, name, disk string) (bool, error) {
	_, class, err := k.checked()
	if err != nil {
		return false, err
	}
	snap := &unstructured.Unstructured{}
	snap.SetGroupVersionKind(volumeSnapshotGVK)
	err = k.Client.Get(ctx, client.ObjectKey{Namespace: k.Namespace, Name: name}, snap)
	if apierrors.IsNotFound(err) {
		snap.SetName(name)
		snap.SetNamespace(k.Namespace)
		snap.SetLabels(map[string]string{DiskLabel: disk})
		snap.Object["spec"] = map[string]any{
			"volumeSnapshotClassName": class,
			"source":                  map[string]any{"persistentVolumeClaimName": disk},
		}
		if err := k.Client.Create(ctx, snap); err != nil && !apierrors.IsAlreadyExists(err) {
			return false, status.Errorf(codes.Internal, "creating snapshot %s of disk %s: %v", name, disk, err)
		}
		return false, nil
	}
	if err != nil {
		return false, status.Errorf(codes.Internal, "reading snapshot %s: %v", name, err)
	}
	if msg, _, _ := unstructured.NestedString(snap.Object, "status", "error", "message"); msg != "" {
		k.Log.Info("snapshot reports an error; the provider retries it", "snapshot", name, "disk", disk, "error", msg)
	}
	ready, _, _ := unstructured.NestedBool(snap.Object, "status", "readyToUse")
	return ready, nil
}

func (k *KubeDisks) DeleteSnapshot(ctx context.Context, name string) error {
	snap := &unstructured.Unstructured{}
	snap.SetGroupVersionKind(volumeSnapshotGVK)
	snap.SetName(name)
	snap.SetNamespace(k.Namespace)
	if err := client.IgnoreNotFound(k.Client.Delete(ctx, snap)); err != nil {
		return status.Errorf(codes.Internal, "deleting snapshot %s: %v", name, err)
	}
	return nil
}

func (k *KubeDisks) Expand(ctx context.Context, disk string, size int64) error {
	pvc := &corev1.PersistentVolumeClaim{}
	if err := k.Client.Get(ctx, client.ObjectKey{Namespace: k.Namespace, Name: disk}, pvc); err != nil {
		return status.Errorf(codes.Internal, "reading the claim of disk %s: %v", disk, err)
	}
	current := pvc.Spec.Resources.Requests[corev1.ResourceStorage]
	if current.Value() >= size {
		return nil
	}
	patch := client.MergeFrom(pvc.DeepCopy())
	pvc.Spec.Resources.Requests[corev1.ResourceStorage] = *resource.NewQuantity(size, resource.BinarySI)
	if err := k.Client.Patch(ctx, pvc, patch); err != nil {
		return status.Errorf(codes.Internal, "growing the claim of disk %s: %v", disk, err)
	}
	return nil
}

func (k *KubeDisks) poll(ctx context.Context, waiting string, check func() (bool, error)) error {
	wait := k.Wait
	if wait <= 0 {
		wait = defaultDiskWait
	}
	interval := k.PollInterval
	if interval <= 0 {
		interval = 500 * time.Millisecond
	}
	ctx, cancel := context.WithTimeout(ctx, wait)
	defer cancel()
	for {
		done, err := check()
		if err != nil || done {
			return err
		}
		select {
		case <-ctx.Done():
			return status.Error(codes.Unavailable, waiting)
		case <-time.After(interval):
		}
	}
}

// nodeMatches reports whether a volume's node affinity admits node.
func nodeMatches(affinity *corev1.VolumeNodeAffinity, node *corev1.Node) bool {
	if affinity == nil || affinity.Required == nil || len(affinity.Required.NodeSelectorTerms) == 0 {
		return true
	}
	for _, term := range affinity.Required.NodeSelectorTerms {
		if termMatches(term, node) {
			return true
		}
	}
	return false
}

func termMatches(term corev1.NodeSelectorTerm, node *corev1.Node) bool {
	if len(term.MatchExpressions) == 0 && len(term.MatchFields) == 0 {
		return false
	}
	for _, r := range term.MatchExpressions {
		if !requirementMatches(r, node.Labels) {
			return false
		}
	}
	for _, r := range term.MatchFields {
		if r.Key != "metadata.name" || !requirementMatches(r, map[string]string{r.Key: node.Name}) {
			return false
		}
	}
	return true
}

func requirementMatches(r corev1.NodeSelectorRequirement, labels map[string]string) bool {
	v, ok := labels[r.Key]
	switch r.Operator {
	case corev1.NodeSelectorOpIn:
		return ok && slices.Contains(r.Values, v)
	case corev1.NodeSelectorOpNotIn:
		return !ok || !slices.Contains(r.Values, v)
	case corev1.NodeSelectorOpExists:
		return ok
	case corev1.NodeSelectorOpDoesNotExist:
		return !ok
	}
	return false
}

// migratedProvisioners are in-tree provisioners a default StorageClass may still name, and the CSI driver that
// replaced each.
var migratedProvisioners = map[string]string{
	"kubernetes.io/aws-ebs":        "ebs.csi.aws.com",
	"kubernetes.io/gce-pd":         "pd.csi.storage.gke.io",
	"kubernetes.io/azure-disk":     "disk.csi.azure.com",
	"kubernetes.io/cinder":         "cinder.csi.openstack.org",
	"kubernetes.io/vsphere-volume": "csi.vsphere.vmware.com",
}

func isDefaultClass(sc *storagev1.StorageClass) bool {
	return strings.EqualFold(sc.Annotations[defaultClassAnnotation], "true") || strings.EqualFold(sc.Annotations[betaDefaultClassAnnotation], "true")
}
