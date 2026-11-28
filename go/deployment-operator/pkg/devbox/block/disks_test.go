package block

import (
	"context"
	"testing"
	"time"

	"github.com/go-logr/logr"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	corev1 "k8s.io/api/core/v1"
	storagev1 "k8s.io/api/storage/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/utils/ptr"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

const zoneLabel = "topology.example.com/zone"

func zonedNode(name, zone string) *corev1.Node {
	return &corev1.Node{ObjectMeta: metav1.ObjectMeta{Name: name, Labels: map[string]string{zoneLabel: zone}}}
}

// TestKubeDisksDriveTheProviderThroughKubernetes plays the provider's controllers by hand: binding the claim,
// running the anchor, attaching and readying the snapshot.
func TestKubeDisksDriveTheProviderThroughKubernetes(t *testing.T) {
	ctx := context.Background()
	c := fake.NewClientBuilder().WithObjects(
		zonedNode("node-a", "us-east-2a"), zonedNode("node-b", "us-east-2b"),
		csiNode("node-a", "disk.example.com"), csiNode("node-b"),
	).Build()
	template, err := ParseAnchorTemplate([]byte("spec:\n  priorityClassName: system-node-critical\n  imagePullSecrets: [{name: pull}]\n"))
	if err != nil {
		t.Fatal(err)
	}
	k := &KubeDisks{
		Client: c, Namespace: "ate-system", AnchorImage: "devbox-block:test", AnchorTemplate: template,
		Wait: 5 * time.Millisecond, PollInterval: time.Millisecond, Log: logr.Discard(),
	}
	if _, err := k.Create(ctx, "devbox-d1", DiskSpec{CapacityBytes: 10 << 30, Node: "node-a"}); status.Code(err) != codes.Unavailable {
		t.Fatalf("nothing is created before the provider is checked, got %v", err)
	}
	k.provider, k.snapshotClass = "disk.example.com", "snaps"

	spec := DiskSpec{CapacityBytes: 10 << 30, Params: map[string]string{"type": "gp3"}, Node: "node-a", Snapshot: "devbox-seed"}
	if _, err := k.Create(ctx, "devbox-d1", spec); status.Code(err) != codes.Unavailable {
		t.Fatalf("a disk that isn't provisioned yet should be Unavailable, got %v", err)
	}
	pvc := &corev1.PersistentVolumeClaim{}
	if err := c.Get(ctx, client.ObjectKey{Namespace: "ate-system", Name: "devbox-d1"}, pvc); err != nil {
		t.Fatal(err)
	}
	if pvc.Annotations[selectedNode] != "node-a" || pvc.Spec.DataSource.Name != "devbox-seed" || pvc.Spec.DataSource.Kind != "VolumeSnapshot" {
		t.Fatalf("the claim should be for the node, from the snapshot, got %+v", pvc)
	}
	sc := &storagev1.StorageClass{}
	if err := c.Get(ctx, client.ObjectKey{Name: *pvc.Spec.StorageClassName}, sc); err != nil {
		t.Fatal(err)
	}
	if sc.Provisioner != "disk.example.com" || *sc.VolumeBindingMode != storagev1.VolumeBindingWaitForFirstConsumer ||
		!*sc.AllowVolumeExpansion || sc.Parameters["type"] != "gp3" || sc.Parameters[fsTypeParam] != "ext4" {
		t.Fatalf("the provider's class should carry the parameters and wait for its node, got %+v", sc)
	}

	pv := &corev1.PersistentVolume{
		ObjectMeta: metav1.ObjectMeta{Name: "pvc-1"},
		Spec: corev1.PersistentVolumeSpec{
			PersistentVolumeSource: corev1.PersistentVolumeSource{CSI: &corev1.CSIPersistentVolumeSource{Driver: "disk.example.com", VolumeHandle: "vol-1"}},
			NodeAffinity: &corev1.VolumeNodeAffinity{Required: &corev1.NodeSelector{
				NodeSelectorTerms: []corev1.NodeSelectorTerm{{MatchExpressions: []corev1.NodeSelectorRequirement{
					{Key: zoneLabel, Operator: corev1.NodeSelectorOpIn, Values: []string{"us-east-2a"}},
				}}},
			}},
		},
	}
	if err := c.Create(ctx, pv); err != nil {
		t.Fatal(err)
	}
	pvc.Spec.VolumeName = "pvc-1"
	if err := c.Update(ctx, pvc); err != nil {
		t.Fatal(err)
	}
	pvc.Status.Phase = corev1.ClaimBound
	pvc.Status.Capacity = corev1.ResourceList{corev1.ResourceStorage: resource.MustParse("12Gi")}
	if err := c.Status().Update(ctx, pvc); err != nil {
		t.Fatal(err)
	}
	size, err := k.Create(ctx, "devbox-d1", spec)
	if err != nil || size != 12<<30 {
		t.Fatalf("a bound disk reports its size, got %d, %v", size, err)
	}

	for node, want := range map[string]bool{"node-a": true, "node-b": false} {
		if got, err := k.Reachable(ctx, "devbox-d1", node); err != nil || got != want {
			t.Fatalf("reachable from %s = %v, %v, want %v", node, got, err, want)
		}
	}

	if _, err := k.Attach(ctx, "devbox-d1", "node-b"); status.Code(err) != codes.FailedPrecondition {
		t.Fatalf("a node without the provider's plugin should fail with FailedPrecondition, got %v", err)
	}
	if _, err := k.Attach(ctx, "devbox-d1", "node-a"); status.Code(err) != codes.Unavailable {
		t.Fatalf("a disk that isn't attached yet should be Unavailable, got %v", err)
	}
	anchor := &corev1.Pod{}
	if err := c.Get(ctx, client.ObjectKey{Namespace: "ate-system", Name: "devbox-d1-anchor"}, anchor); err != nil {
		t.Fatal(err)
	}
	switch {
	case anchor.Spec.NodeName != "node-a":
		t.Fatalf("the anchor should run on the node, got %+v", anchor.Spec)
	case anchor.Spec.Volumes[0].PersistentVolumeClaim.ClaimName != "devbox-d1":
		t.Fatal("the anchor should mount the disk's claim")
	case anchor.Spec.Containers[0].Image != "devbox-block:test" || anchor.Spec.Containers[0].Args[0] != "--mode=anchor":
		t.Fatal("the anchor should run the anchor image")
	case anchor.Spec.PriorityClassName != "system-node-critical" || anchor.Spec.ImagePullSecrets[0].Name != "pull":
		t.Fatal("the anchor should carry its priority class and pull secrets")
	case len(anchor.Spec.Tolerations) != 1 || anchor.Spec.Tolerations[0].Operator != corev1.TolerationOpExists:
		t.Fatal("the anchor should tolerate every taint")
	}
	anchor.UID = "0b9f"
	if err := c.Update(ctx, anchor); err != nil {
		t.Fatal(err)
	}
	// The attach/detach controller's name for the attachment: csi-<sha256 of handle, driver and node>.
	va := &storagev1.VolumeAttachment{
		ObjectMeta: metav1.ObjectMeta{Name: "csi-06957212cb95986c44d4ad7358e845c337f828970b6197ad137f2a4a80c8ac8e"},
		Spec: storagev1.VolumeAttachmentSpec{Attacher: "disk.example.com", NodeName: "node-a",
			Source: storagev1.VolumeAttachmentSource{PersistentVolumeName: ptr.To("pvc-1")}},
	}
	if err := c.Create(ctx, va); err != nil {
		t.Fatal(err)
	}
	if _, err := k.Attach(ctx, "devbox-d1", "node-a"); status.Code(err) != codes.Unavailable {
		t.Fatalf("an attachment the provider hasn't finished should be Unavailable, got %v", err)
	}
	va.Status.Attached = true
	if err := c.Status().Update(ctx, va); err != nil {
		t.Fatal(err)
	}
	source, err := k.Attach(ctx, "devbox-d1", "node-a")
	if err != nil {
		t.Fatalf("an attached disk is attached while its anchor is still starting: %v", err)
	}
	if source != "pods/"+string(anchor.UID)+"/volumes/kubernetes.io~csi/pvc-1/mount" || anchor.UID == "" {
		t.Fatalf("attach should return the kubelet's mount of the disk, got %q", source)
	}

	if err := k.Detach(ctx, "devbox-d1", "node-b"); err != nil {
		t.Fatal(err)
	}
	if err := c.Get(ctx, client.ObjectKey{Namespace: "ate-system", Name: "devbox-d1-anchor"}, anchor); err != nil {
		t.Fatal("detaching from another node leaves the anchor")
	}
	if err := k.Detach(ctx, "devbox-d1", "node-a"); status.Code(err) != codes.Unavailable {
		t.Fatalf("a disk still attached should be Unavailable, got %v", err)
	}
	if err := c.Get(ctx, client.ObjectKey{Namespace: "ate-system", Name: "devbox-d1-anchor"}, anchor); err == nil {
		t.Fatal("detach should delete the anchor")
	}
	if err := c.Delete(ctx, va); err != nil {
		t.Fatal(err)
	}
	if err := k.Detach(ctx, "devbox-d1", "node-a"); err != nil {
		t.Fatalf("detach should finish once the attachment is gone: %v", err)
	}

	if ready, err := k.Snapshot(ctx, "devbox-snap", "devbox-d1"); err != nil || ready {
		t.Fatalf("a new snapshot isn't ready, got %v, %v", ready, err)
	}
	snap := &unstructured.Unstructured{}
	snap.SetGroupVersionKind(volumeSnapshotGVK)
	if err := c.Get(ctx, client.ObjectKey{Namespace: "ate-system", Name: "devbox-snap"}, snap); err != nil {
		t.Fatal(err)
	}
	if class, _, _ := unstructured.NestedString(snap.Object, "spec", "volumeSnapshotClassName"); class != "snaps" {
		t.Fatalf("the snapshot should use the provider's class, got %q", class)
	}
	if src, _, _ := unstructured.NestedString(snap.Object, "spec", "source", "persistentVolumeClaimName"); src != "devbox-d1" {
		t.Fatalf("the snapshot should be of the disk's claim, got %q", src)
	}
	_ = unstructured.SetNestedField(snap.Object, true, "status", "readyToUse")
	if err := c.Update(ctx, snap); err != nil {
		t.Fatal(err)
	}
	if ready, err := k.Snapshot(ctx, "devbox-snap", "devbox-d1"); err != nil || !ready {
		t.Fatalf("a ready snapshot should report ready, got %v, %v", ready, err)
	}

	if err := k.Expand(ctx, "devbox-d1", 20<<30); err != nil {
		t.Fatal(err)
	}
	if err := c.Get(ctx, client.ObjectKey{Namespace: "ate-system", Name: "devbox-d1"}, pvc); err != nil {
		t.Fatal(err)
	}
	if got := pvc.Spec.Resources.Requests[corev1.ResourceStorage]; got.Value() != 20<<30 {
		t.Fatalf("growing a disk grows its claim, got %v", got.String())
	}

	if err := k.DeleteSnapshot(ctx, "devbox-snap"); err != nil {
		t.Fatal(err)
	}
	if err := k.Delete(ctx, "devbox-d1"); err != nil {
		t.Fatal(err)
	}
	if err := k.Delete(ctx, "devbox-d1"); err != nil {
		t.Fatal("deleting twice should succeed")
	}
	if err := c.Get(ctx, client.ObjectKey{Namespace: "ate-system", Name: "devbox-d1"}, pvc); err == nil {
		t.Fatal("delete should remove the claim")
	}
}

func TestKubeDisksCountTheNodesFreeAttachSlots(t *testing.T) {
	ctx := context.Background()
	limited := csiNode("node-a", "disk.example.com")
	limited.Spec.Drivers[0].Allocatable = &storagev1.VolumeNodeResources{Count: ptr.To[int32](3)}
	va := func(name, node, attacher string) *storagev1.VolumeAttachment {
		return &storagev1.VolumeAttachment{ObjectMeta: metav1.ObjectMeta{Name: name}, Spec: storagev1.VolumeAttachmentSpec{Attacher: attacher, NodeName: node}}
	}
	c := fake.NewClientBuilder().WithObjects(
		limited, csiNode("node-b", "disk.example.com"),
		va("a1", "node-a", "disk.example.com"), va("a2", "node-a", "disk.example.com"),
		va("a3", "node-a", "other.example.com"), va("b1", "node-b", "disk.example.com"),
	).Build()
	k := &KubeDisks{Client: c, Namespace: "ate-system", Log: logr.Discard()}
	k.provider, k.snapshotClass = "disk.example.com", "snaps"

	if free, err := k.Free(ctx, "node-a"); err != nil || free != 1 {
		t.Fatalf("node-a should have one slot left for the provider's disks, got %d, %v", free, err)
	}
	if free, err := k.Free(ctx, "node-b"); err != nil || free != -1 {
		t.Fatalf("a node whose driver reports no limit should say so, got %d, %v", free, err)
	}
}
