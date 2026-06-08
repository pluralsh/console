package console_test

import (
	"fmt"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/samber/lo"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"

	"github.com/pluralsh/console/go/helm-test/internal/common"
	"github.com/pluralsh/console/go/helm-test/test/console"
)

var _ = Describe("Volumes", func() {
	for _, chartEntry := range console.Charts() {
		Context(chartEntry.Name+" with custom additional volume values", Ordered, func() {
			var (
				err       error
				manifests common.ManifestMap
				resources = chartEntry.Resources()

				globalVolumes = []corev1.Volume{
					{
						Name: "global-extras",
						VolumeSource: corev1.VolumeSource{
							EmptyDir: &corev1.EmptyDirVolumeSource{},
						},
					},
				}
				globalVolumeMounts = []corev1.VolumeMount{
					{
						Name:      "global-extras",
						MountPath: "/tmp/global-extras",
					},
				}
				kasVolumes = []corev1.Volume{
					{
						Name: "kas-extras",
						VolumeSource: corev1.VolumeSource{
							EmptyDir: &corev1.EmptyDirVolumeSource{},
						},
					},
				}
				kasVolumeMounts = []corev1.VolumeMount{
					{
						Name:      "kas-extras",
						MountPath: "/tmp/kas-extras",
					},
				}
				values = map[string]interface{}{
					"global": map[string]interface{}{
						"additionalVolumes":      globalVolumes,
						"additionalVolumeMounts": globalVolumeMounts,
					},
					"aiProxy": map[string]interface{}{
						"enabled": true,
					},
					"kas": map[string]interface{}{
						"global": map[string]interface{}{
							"additionalVolumes":      kasVolumes,
							"additionalVolumeMounts": kasVolumeMounts,
						},
					},
				}
				deployments = []struct {
					name         string
					key          common.ManifestKey
					container    string
					volumes      []corev1.Volume
					volumeMounts []corev1.VolumeMount
				}{
					{
						name:         "console",
						key:          resources.Console.Deployment,
						container:    "console",
						volumes:      globalVolumes,
						volumeMounts: globalVolumeMounts,
					},
					{
						name:         "nexus",
						key:          resources.Nexus.Deployment,
						container:    "nexus",
						volumes:      globalVolumes,
						volumeMounts: globalVolumeMounts,
					},
					{
						name:         "cloud-query",
						key:          resources.CloudQuery.Deployment,
						container:    "cloud-query",
						volumes:      globalVolumes,
						volumeMounts: globalVolumeMounts,
					},
					{
						name:         "kas",
						key:          resources.Kas.Deployment,
						container:    "kas",
						volumes:      kasVolumes,
						volumeMounts: kasVolumeMounts,
					},
				}
			)

			BeforeAll(func() {
				manifests, err = chartEntry.Load(values)
				Expect(err).NotTo(HaveOccurred())
			})

			for _, deploymentEntry := range deployments {
				deploymentEntry := deploymentEntry

				It(fmt.Sprintf("should mount additional volumes to %s", deploymentEntry.name), func() {
					deployment := deploymentFromManifests(manifests, deploymentEntry.key)

					Expect(deployment.Spec.Template.Spec.Volumes).To(ContainElements(deploymentEntry.volumes))

					container, exists := lo.Find(deployment.Spec.Template.Spec.Containers, func(container corev1.Container) bool {
						return container.Name == deploymentEntry.container
					})

					Expect(exists).To(BeTrue())
					Expect(container.VolumeMounts).To(ContainElements(deploymentEntry.volumeMounts))
				})
			}
		})
	}
})

func deploymentFromManifests(manifests common.ManifestMap, key common.ManifestKey) appsv1.Deployment {
	var deployment appsv1.Deployment

	rawDeployment, exists := manifests[key.String()]
	Expect(exists).To(BeTrue())

	err := runtime.DefaultUnstructuredConverter.FromUnstructured(rawDeployment.UnstructuredContent(), &deployment)
	Expect(err).NotTo(HaveOccurred())

	return deployment
}
