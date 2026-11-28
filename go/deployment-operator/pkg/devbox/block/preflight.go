package block

import (
	"context"
	"fmt"
	"slices"
	"sort"
	"strings"
	"time"

	storagev1 "k8s.io/api/storage/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

const (
	// AnnotationProvider and AnnotationPreflight report on the driver's StorageClass which provider it uses, and
	// whether that provider can serve homes: PreflightOK, or what's wrong with it.
	AnnotationProvider  = "block.devbox.plural.sh/provider"
	AnnotationPreflight = "block.devbox.plural.sh/preflight"
	PreflightOK         = "ok"
)

// Provider is what the controller's preflight found out about the provider.
type Provider struct {
	// Name is the provider's CSI driver name.
	Name string
	// SnapshotClass is the VolumeSnapshotClass homes are snapshotted with.
	SnapshotClass string
	// Problems keep the driver from serving homes; Warnings don't.
	Problems []string
	Warnings []string
}

func (p *Provider) OK() bool { return p != nil && len(p.Problems) == 0 }

// Preflight is the AnnotationPreflight value.
func (p *Provider) Preflight() string {
	if p.OK() {
		return PreflightOK
	}
	return strings.Join(p.Problems, "; ")
}

// Check finds the provider and checks the cluster can run homes on it. The provider is want, or when want is
// empty the provisioner of the cluster's default StorageClass. Its CSIDriver must exist and describe disks that
// are attached to nodes and persistent, and the cluster must serve VolumeSnapshots; the VolumeSnapshotClass is the
// provider's default one, or one Check creates. Errors are reaching the cluster, which is worth retrying;
// incompatibilities are Problems. A provider that passes is the one disks are created with from then on.
func (k *KubeDisks) Check(ctx context.Context, want string) (*Provider, error) {
	p := &Provider{Name: want}
	if p.Name == "" {
		name, err := k.defaultProvider(ctx)
		if err != nil {
			return nil, err
		}
		if name == "" {
			p.Problems = append(p.Problems, "no provider is configured and the cluster has no default StorageClass; set block.provider")
			return p, nil
		}
		p.Name = name
	}

	d := &storagev1.CSIDriver{}
	if err := k.Client.Get(ctx, client.ObjectKey{Name: p.Name}, d); err != nil {
		if !apierrors.IsNotFound(err) {
			return nil, fmt.Errorf("reading CSIDriver %s: %w", p.Name, err)
		}
		p.Problems = append(p.Problems, fmt.Sprintf("the cluster has no CSIDriver %s; install the provider's CSI driver", p.Name))
	} else {
		if a := d.Spec.AttachRequired; a != nil && !*a {
			p.Problems = append(p.Problems, fmt.Sprintf("CSIDriver %s doesn't attach its volumes to nodes, so they aren't disks", p.Name))
		}
		if modes := d.Spec.VolumeLifecycleModes; len(modes) > 0 && !slices.Contains(modes, storagev1.VolumeLifecyclePersistent) {
			p.Problems = append(p.Problems, fmt.Sprintf("CSIDriver %s has no persistent volumes", p.Name))
		}
	}

	class, problem, err := k.snapshotClassFor(ctx, p.Name)
	if err != nil {
		return nil, err
	}
	if problem != "" {
		p.Problems = append(p.Problems, problem)
	}
	p.SnapshotClass = class

	var nodes storagev1.CSINodeList
	if err := k.Client.List(ctx, &nodes); err != nil {
		return nil, fmt.Errorf("listing CSINodes: %w", err)
	}
	if !slices.ContainsFunc(nodes.Items, func(n storagev1.CSINode) bool {
		return slices.ContainsFunc(n.Spec.Drivers, func(d storagev1.CSINodeDriver) bool { return d.Name == p.Name })
	}) {
		p.Warnings = append(p.Warnings, fmt.Sprintf("no node runs the node plugin of %s yet", p.Name))
	}
	sort.Strings(p.Problems)

	if p.OK() {
		k.mu.Lock()
		k.provider, k.snapshotClass = p.Name, p.SnapshotClass
		k.mu.Unlock()
	}
	return p, nil
}

func (k *KubeDisks) defaultProvider(ctx context.Context) (string, error) {
	var list storagev1.StorageClassList
	if err := k.Client.List(ctx, &list); err != nil {
		return "", fmt.Errorf("listing StorageClasses: %w", err)
	}
	for _, sc := range list.Items {
		if !isDefaultClass(&sc) {
			continue
		}
		if csi, ok := migratedProvisioners[sc.Provisioner]; ok {
			return csi, nil
		}
		return sc.Provisioner, nil
	}
	return "", nil
}

// snapshotClassFor is the provider's default VolumeSnapshotClass, else any of its classes, else one it creates.
// problem is set when the cluster doesn't serve VolumeSnapshots.
func (k *KubeDisks) snapshotClassFor(ctx context.Context, provider string) (class, problem string, err error) {
	list := &unstructured.UnstructuredList{}
	list.SetGroupVersionKind(snapshotClassesGVK)
	if err := k.Client.List(ctx, list); err != nil {
		if meta.IsNoMatchError(err) || apierrors.IsNotFound(err) {
			return "", "the cluster doesn't serve VolumeSnapshots, which seed and move homes; install the external-snapshotter CRDs and snapshot controller", nil
		}
		return "", "", fmt.Errorf("listing VolumeSnapshotClasses: %w", err)
	}
	for _, c := range list.Items {
		driver, _, _ := unstructured.NestedString(c.Object, "driver")
		if driver != provider {
			continue
		}
		if class == "" || strings.EqualFold(c.GetAnnotations()[defaultSnapshotClass], "true") {
			class = c.GetName()
		}
	}
	if class != "" {
		return class, "", nil
	}
	class = "devbox-block." + provider
	c := &unstructured.Unstructured{}
	c.SetGroupVersionKind(snapshotClassGVK)
	c.SetName(class)
	c.SetLabels(map[string]string{ClassLabel: "true"})
	c.Object["driver"] = provider
	c.Object["deletionPolicy"] = "Delete"
	if err := k.Client.Create(ctx, c); err != nil && !apierrors.IsAlreadyExists(err) {
		return "", "", fmt.Errorf("creating VolumeSnapshotClass %s: %w", class, err)
	}
	return class, "", nil
}

// AnnotateStorageClass reports the provider's preflight on the named StorageClass, where the operator reads it.
func AnnotateStorageClass(ctx context.Context, c client.Client, name string, p *Provider) error {
	patch := fmt.Sprintf(`{"metadata":{"annotations":{%q:%q,%q:%q}}}`, AnnotationProvider, p.Name, AnnotationPreflight, p.Preflight())
	sc := &storagev1.StorageClass{}
	sc.Name = name
	if err := c.Patch(ctx, sc, client.RawPatch(types.MergePatchType, []byte(patch))); err != nil {
		return fmt.Errorf("annotating StorageClass %s: %w", name, err)
	}
	return nil
}

// RunPreflight runs check until ctx ends: every retry after a check fails, every interval after one completes.
func RunPreflight(ctx context.Context, check func(context.Context) error, retry, interval time.Duration) error {
	wait := time.Duration(0)
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(wait):
		}
		if err := check(ctx); err != nil {
			wait = retry
			continue
		}
		wait = interval
	}
}
