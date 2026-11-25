package controller

import (
	"testing"

	. "github.com/onsi/gomega"
	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/api/resource"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate/ateapi"
)

func TestDevboxHomeVolumeSource(t *testing.T) {
	t.Run("the home is a durable dir by default", func(t *testing.T) {
		g := NewWithT(t)
		vol := devboxHomeVolumeSource(&v1alpha1.DevboxRunner{})
		g.Expect(vol.Name).To(Equal(devboxHomeVolume))
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

	t.Run("a durable dir home needs no preview", func(t *testing.T) {
		g := NewWithT(t)
		g.Expect(devboxTemplateNeedsPreview(&ateapi.ActorTemplate{Volumes: []*ateapi.Volume{devboxHomeVolumeSource(&v1alpha1.DevboxRunner{})}})).To(BeFalse())
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
