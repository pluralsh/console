package block

import (
	"context"
	"strings"
	"testing"

	storagev1 "k8s.io/api/storage/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/utils/ptr"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/client/interceptor"
)

func csiDriver(name string, spec storagev1.CSIDriverSpec) *storagev1.CSIDriver {
	return &storagev1.CSIDriver{ObjectMeta: metav1.ObjectMeta{Name: name}, Spec: spec}
}

func csiNode(name string, drivers ...string) *storagev1.CSINode {
	n := &storagev1.CSINode{ObjectMeta: metav1.ObjectMeta{Name: name}}
	for _, d := range drivers {
		n.Spec.Drivers = append(n.Spec.Drivers, storagev1.CSINodeDriver{Name: d, NodeID: "i-" + name})
	}
	return n
}

func snapshotClass(name, driver string, isDefault bool) *unstructured.Unstructured {
	c := &unstructured.Unstructured{}
	c.SetGroupVersionKind(snapshotClassGVK)
	c.SetName(name)
	if isDefault {
		c.SetAnnotations(map[string]string{defaultSnapshotClass: "true"})
	}
	c.Object["driver"] = driver
	c.Object["deletionPolicy"] = "Delete"
	return c
}

func TestPreflightPassesAnInstalledDiskProvider(t *testing.T) {
	ctx := context.Background()
	c := fake.NewClientBuilder().WithObjects(
		csiDriver("disk.example.com", storagev1.CSIDriverSpec{AttachRequired: ptr.To(true)}),
		csiNode("node-a", "disk.example.com"),
		snapshotClass("other", "other.example.com", true),
		snapshotClass("plain", "disk.example.com", false),
		snapshotClass("preferred", "disk.example.com", true),
	).Build()
	k := &KubeDisks{Client: c, Namespace: "ate-system"}
	p, err := k.Check(ctx, "disk.example.com")
	if err != nil {
		t.Fatal(err)
	}
	if !p.OK() || p.Preflight() != PreflightOK || len(p.Warnings) != 0 || p.SnapshotClass != "preferred" {
		t.Fatalf("an installed disk provider should pass with its default snapshot class, got %+v", p)
	}
	if provider, class, err := k.checked(); err != nil || provider != "disk.example.com" || class != "preferred" {
		t.Fatalf("a passing check should configure the disks, got %q %q %v", provider, class, err)
	}
}

func TestPreflightDefaultsToTheDefaultStorageClassAndCreatesASnapshotClass(t *testing.T) {
	ctx := context.Background()
	def := &storagev1.StorageClass{
		ObjectMeta:  metav1.ObjectMeta{Name: "gp2", Annotations: map[string]string{defaultClassAnnotation: "true"}},
		Provisioner: "kubernetes.io/aws-ebs",
	}
	other := &storagev1.StorageClass{ObjectMeta: metav1.ObjectMeta{Name: "nfs"}, Provisioner: "nfs.csi.k8s.io"}
	c := fake.NewClientBuilder().WithObjects(def, other, csiDriver("ebs.csi.aws.com", storagev1.CSIDriverSpec{})).Build()
	k := &KubeDisks{Client: c}
	p, err := k.Check(ctx, "")
	if err != nil {
		t.Fatal(err)
	}
	if p.Name != "ebs.csi.aws.com" || !p.OK() {
		t.Fatalf("an unnamed provider is the default class's, through CSI migration, got %+v", p)
	}
	if len(p.Warnings) != 1 || !strings.Contains(p.Warnings[0], "no node runs") {
		t.Fatalf("a provider no node runs yet is only warned about, got %v", p.Warnings)
	}
	created := snapshotClass("", "", false)
	if err := c.Get(ctx, client.ObjectKey{Name: "devbox-block.ebs.csi.aws.com"}, created); err != nil {
		t.Fatalf("a snapshot class should be created for a provider without one: %v", err)
	}
	if d, _, _ := unstructured.NestedString(created.Object, "driver"); d != "ebs.csi.aws.com" || p.SnapshotClass != created.GetName() {
		t.Fatalf("the created class should be the provider's, got %v", created.Object)
	}
}

func TestPreflightFailsWhatCantServeHomes(t *testing.T) {
	ctx := context.Background()

	k := &KubeDisks{Client: fake.NewClientBuilder().Build()}
	p, err := k.Check(ctx, "")
	if err != nil {
		t.Fatal(err)
	}
	if p.OK() || !strings.Contains(p.Preflight(), "no default StorageClass") {
		t.Fatalf("no provider and no default class should fail, got %+v", p)
	}

	nfs := csiDriver("nfs.csi.k8s.io", storagev1.CSIDriverSpec{
		AttachRequired:       ptr.To(false),
		VolumeLifecycleModes: []storagev1.VolumeLifecycleMode{storagev1.VolumeLifecycleEphemeral},
	})
	k = &KubeDisks{Client: fake.NewClientBuilder().WithObjects(nfs).Build()}
	if p, err = k.Check(ctx, "nfs.csi.k8s.io"); err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{"doesn't attach", "no persistent volumes"} {
		if !strings.Contains(p.Preflight(), want) {
			t.Fatalf("problems %q should mention %q", p.Preflight(), want)
		}
	}
	if _, _, err := k.checked(); err == nil {
		t.Fatal("a failing check must not configure the disks")
	}

	noSnapshots := interceptor.Funcs{List: func(ctx context.Context, c client.WithWatch, list client.ObjectList, opts ...client.ListOption) error {
		if u, ok := list.(*unstructured.UnstructuredList); ok && u.GroupVersionKind() == snapshotClassesGVK {
			return &meta.NoKindMatchError{GroupKind: snapshotClassGVK.GroupKind(), SearchedVersions: []string{"v1"}}
		}
		return c.List(ctx, list, opts...)
	}}
	k = &KubeDisks{Client: fake.NewClientBuilder().WithInterceptorFuncs(noSnapshots).Build()}
	if p, err = k.Check(ctx, "missing.example.com"); err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{"no CSIDriver missing.example.com", "doesn't serve VolumeSnapshots"} {
		if !strings.Contains(p.Preflight(), want) {
			t.Fatalf("problems %q should mention %q", p.Preflight(), want)
		}
	}
}

func TestPreflightIsReportedOnTheStorageClass(t *testing.T) {
	ctx := context.Background()
	sc := &storagev1.StorageClass{ObjectMeta: metav1.ObjectMeta{Name: "devbox-block"}, Provisioner: DriverName}
	c := fake.NewClientBuilder().WithObjects(sc).Build()
	if err := AnnotateStorageClass(ctx, c, "devbox-block", &Provider{Name: "disk.example.com", Problems: []string{"a", "b"}}); err != nil {
		t.Fatal(err)
	}
	if err := c.Get(ctx, client.ObjectKey{Name: "devbox-block"}, sc); err != nil {
		t.Fatal(err)
	}
	if sc.Annotations[AnnotationProvider] != "disk.example.com" || sc.Annotations[AnnotationPreflight] != "a; b" {
		t.Fatalf("got annotations %v", sc.Annotations)
	}
}

func TestUpstreamNames(t *testing.T) {
	for _, ok := range []string{"devbox-x", "a"} {
		if upstreamName(ok) != ok {
			t.Fatalf("%s is a valid name and should be kept", ok)
		}
	}
	for _, bad := range []string{"devbox-seed-ns.tmpl-1", "Upper", strings.Repeat("a", 57), "1abc", "substrate-7f3c2b1e-5d4a-4c3b-9a8f-0e1d2c3b4a59-home"} {
		got := upstreamName(bad)
		if !upstreamNamePattern.MatchString(got) || got != upstreamName(bad) || len(anchorName(got)) > 63 {
			t.Fatalf("%s should map to a stable valid name, got %s", bad, got)
		}
	}
	if upstreamName("a.b") == upstreamName("a.c") {
		t.Fatal("different names should map to different names")
	}
}
