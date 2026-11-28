package controller

import (
	"testing"

	. "github.com/onsi/gomega"
	"github.com/samber/lo"
	storagev1 "k8s.io/api/storage/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/block"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/guest"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate/ateapi"
)

func TestDevboxHomeVolumeSource(t *testing.T) {
	t.Run("the home is a Block disk by default", func(t *testing.T) {
		g := NewWithT(t)
		vol := devboxHomeVolumeSource(&v1alpha1.DevboxRunner{})
		g.Expect(vol.Name).To(Equal(devboxHomeVolume))
		g.Expect(vol.DurableDir).To(BeNil())
		g.Expect(vol.External.GetTemplate().GetStorageClassName()).To(Equal(v1alpha1.DevboxDefaultBlockStorageClass))
		g.Expect(devboxTemplateNeedsPreview(&ateapi.ActorTemplate{Volumes: []*ateapi.Volume{vol}})).To(BeTrue())
	})

	t.Run("a Snapshot home is a durable dir", func(t *testing.T) {
		g := NewWithT(t)
		vol := devboxHomeVolumeSource(snapshotHomeRunner())
		g.Expect(vol.DurableDir).NotTo(BeNil())
		g.Expect(vol.External).To(BeNil())
	})

	t.Run("a JuiceFS home is an external volume sized by spec.home.size", func(t *testing.T) {
		g := NewWithT(t)
		runner := &v1alpha1.DevboxRunner{Spec: v1alpha1.DevboxRunnerSpec{Home: &v1alpha1.DevboxHome{
			Storage: lo.ToPtr(v1alpha1.DevboxHomeJuiceFS),
			Size:    lo.ToPtr(resource.MustParse("100Gi")),
		}}}
		vol := devboxHomeVolumeSource(runner)
		g.Expect(vol.DurableDir).To(BeNil())
		g.Expect(vol.External.GetTemplate().GetCapacityBytes()).To(Equal(100 * gib))
		g.Expect(vol.External.GetTemplate().GetStorageClassName()).To(Equal(v1alpha1.DevboxDefaultJuiceFSStorageClass))
		g.Expect(devboxTemplateNeedsPreview(&ateapi.ActorTemplate{Volumes: []*ateapi.Volume{vol}})).To(BeTrue())
	})

	t.Run("its size defaults to spec.resources.disk", func(t *testing.T) {
		g := NewWithT(t)
		runner := &v1alpha1.DevboxRunner{Spec: v1alpha1.DevboxRunnerSpec{
			Home:      &v1alpha1.DevboxHome{Storage: lo.ToPtr(v1alpha1.DevboxHomeJuiceFS), StorageClassName: lo.ToPtr("fast-homes")},
			Resources: &v1alpha1.DevboxResources{Disk: lo.ToPtr(resource.MustParse("50Gi"))},
		}}
		vol := devboxHomeVolumeSource(runner)
		g.Expect(vol.External.GetTemplate().GetCapacityBytes()).To(Equal(50 * gib))
		g.Expect(vol.External.GetTemplate().GetStorageClassName()).To(Equal("fast-homes"))
	})

	t.Run("a ZeroFS home is an external volume on the devbox-zerofs class", func(t *testing.T) {
		g := NewWithT(t)
		runner := &v1alpha1.DevboxRunner{Spec: v1alpha1.DevboxRunnerSpec{Home: &v1alpha1.DevboxHome{
			Storage: lo.ToPtr(v1alpha1.DevboxHomeZeroFS),
			Size:    lo.ToPtr(resource.MustParse("20Gi")),
		}}}
		vol := devboxHomeVolumeSource(runner)
		g.Expect(vol.DurableDir).To(BeNil())
		g.Expect(vol.External.GetTemplate().GetCapacityBytes()).To(Equal(20 * gib))
		g.Expect(vol.External.GetTemplate().GetStorageClassName()).To(Equal(v1alpha1.DevboxDefaultZeroFSStorageClass))
		g.Expect(devboxTemplateNeedsPreview(&ateapi.ActorTemplate{Volumes: []*ateapi.Volume{vol}})).To(BeTrue())
	})

	t.Run("a durable dir home needs no preview", func(t *testing.T) {
		g := NewWithT(t)
		g.Expect(devboxTemplateNeedsPreview(&ateapi.ActorTemplate{Volumes: []*ateapi.Volume{devboxHomeVolumeSource(snapshotHomeRunner())}})).To(BeFalse())
	})
}

func TestDevboxSystemEnv(t *testing.T) {
	storageConf := &ateapi.EnvVar{Name: "CONTAINERS_STORAGE_CONF", Value: devboxContainerStorageConf}
	for storage, onHome := range map[v1alpha1.DevboxHomeStorage]bool{
		v1alpha1.DevboxHomeSnapshot: false,
		v1alpha1.DevboxHomeJuiceFS:  false,
		v1alpha1.DevboxHomeZeroFS:   false,
		v1alpha1.DevboxHomeBlock:    true,
	} {
		t.Run(string(storage), func(t *testing.T) {
			g := NewWithT(t)
			runner := &v1alpha1.DevboxRunner{Spec: v1alpha1.DevboxRunnerSpec{Home: &v1alpha1.DevboxHome{Storage: lo.ToPtr(storage)}}}
			env := devboxSystemEnv(runner, "{}")
			g.Expect(env[0].GetName()).To(Equal(guest.EnvVar))
			if onHome {
				g.Expect(env).To(ContainElement(storageConf), "a Block home keeps container storage out of snapshots")
			} else {
				g.Expect(env).To(HaveLen(1), "container storage stays on the root filesystem")
			}
		})
	}

	t.Run("spec.env overrides it", func(t *testing.T) {
		g := NewWithT(t)
		runner := &v1alpha1.DevboxRunner{Spec: v1alpha1.DevboxRunnerSpec{
			Home: &v1alpha1.DevboxHome{Storage: lo.ToPtr(v1alpha1.DevboxHomeBlock)},
			Env:  []v1alpha1.DevboxEnvVar{{Name: "CONTAINERS_STORAGE_CONF", Value: lo.ToPtr("/etc/containers/storage.conf")}},
		}}
		g.Expect(devboxSystemEnv(runner, "{}")).To(HaveLen(1))
	})
}

func TestDevboxInstanceCapacityWithJuiceFSHomes(t *testing.T) {
	g := NewWithT(t)
	runner := capacityRunner("16", "64Gi", lo.ToPtr("200Gi"))
	runner.Spec.Home = &v1alpha1.DevboxHome{Storage: lo.ToPtr(v1alpha1.DevboxHomeJuiceFS)}
	c, err := devboxInstanceCapacity(runner, v1alpha1.DevboxSandboxGVisor)
	g.Expect(err).NotTo(HaveOccurred())
	// The disk only holds snapshots, 160Gi over 8Gi, so CPU binds first instead of disk at 5.
	g.Expect(c.PerWorker).To(Equal(int64(8)))
	g.Expect(c.LimitedBy).To(Equal(devboxLimitedByCPU))
}

func TestDevboxInstanceCapacityWithZeroFSHomes(t *testing.T) {
	g := NewWithT(t)
	durable := capacityRunner("16", "64Gi", lo.ToPtr("200Gi"))
	want, err := devboxInstanceCapacity(durable, v1alpha1.DevboxSandboxGVisor)
	g.Expect(err).NotTo(HaveOccurred())

	runner := capacityRunner("16", "64Gi", lo.ToPtr("200Gi"))
	runner.Spec.Home = &v1alpha1.DevboxHome{Storage: lo.ToPtr(v1alpha1.DevboxHomeZeroFS)}
	c, err := devboxInstanceCapacity(runner, v1alpha1.DevboxSandboxGVisor)
	g.Expect(err).NotTo(HaveOccurred())
	// The ZeroFS writer caches each home on node disk, so homes still count against it.
	g.Expect(c).To(Equal(want))
}

func TestBlockPreflight(t *testing.T) {
	g := NewWithT(t)
	sc := func(annotations map[string]string) *storagev1.StorageClass {
		return &storagev1.StorageClass{ObjectMeta: metav1.ObjectMeta{Name: "devbox-block", Annotations: annotations}}
	}
	g.Expect(blockPreflight(sc(map[string]string{block.AnnotationProvider: "ebs.csi.aws.com", block.AnnotationPreflight: block.PreflightOK}))).To(Succeed())
	g.Expect(blockPreflight(sc(nil))).To(MatchError(ContainSubstring("hasn't checked its provider yet")))
	g.Expect(blockPreflight(sc(map[string]string{block.AnnotationProvider: "nfs.csi.k8s.io", block.AnnotationPreflight: "CSIDriver nfs.csi.k8s.io doesn't attach its volumes to nodes"}))).
		To(MatchError("block storage provider nfs.csi.k8s.io can't serve homes: CSIDriver nfs.csi.k8s.io doesn't attach its volumes to nodes"))
}

// snapshotHomeRunner keeps its home on the node, in its snapshots.
func snapshotHomeRunner() *v1alpha1.DevboxRunner {
	return &v1alpha1.DevboxRunner{Spec: v1alpha1.DevboxRunnerSpec{Home: &v1alpha1.DevboxHome{Storage: lo.ToPtr(v1alpha1.DevboxHomeSnapshot)}}}
}
