package console_test

import (
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/samber/lo"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"

	"github.com/pluralsh/console/go/helm-test/internal/common"
	"github.com/pluralsh/console/go/helm-test/test/console"
)

var _ = Describe("Console Chart", func() {
	Context("with custom console volumes values", Ordered, func() {
		var (
			deployment appsv1.Deployment
			err        error
			manifests  common.ManifestMap
			volumes    = []corev1.Volume{
				{
					Name: "extras",
					VolumeSource: corev1.VolumeSource{
						EmptyDir: &corev1.EmptyDirVolumeSource{},
					},
				},
			}
			volumeMounts = []corev1.VolumeMount{
				{
					Name:      "extras",
					MountPath: "/tmp/extras",
				},
			}
			values = map[string]interface{}{
				"global": map[string]interface{}{
					"additionalVolumes":      volumes,
					"additionalVolumeMounts": volumeMounts,
				},
			}
		)

		BeforeAll(func() {
			manifests, err = console.LoadConsoleChart(values)
			Expect(err).NotTo(HaveOccurred())

			rawDeployment, exists := manifests[console.DefaultResources().Console.Deployment.String()]
			Expect(exists).To(BeTrue())

			err = runtime.DefaultUnstructuredConverter.FromUnstructured(rawDeployment.UnstructuredContent(), &deployment)
			Expect(err).NotTo(HaveOccurred())
		})

		It("should have console pod with custom volumes", func() {
			Expect(deployment.Spec.Template.Spec.Volumes).To(ContainElements(volumes))
		})

		It("should have console container with custom volume mounts", func() {
			consoleContainer, exists := lo.Find(deployment.Spec.Template.Spec.Containers, func(container corev1.Container) bool {
				return container.Name == "console"
			})

			Expect(exists).To(BeTrue())
			Expect(consoleContainer.VolumeMounts).To(ContainElements(volumeMounts))
		})
	})
})
