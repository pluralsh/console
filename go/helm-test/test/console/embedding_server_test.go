package console_test

import (
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"

	"github.com/pluralsh/console/go/helm-test/internal/common"
	"github.com/pluralsh/console/go/helm-test/test/console"
)

var (
	embeddingServerDeployment = common.ManifestKey{
		Name: "console-embedding-server",
		GroupKind: schema.GroupKind{
			Group: common.GroupApps,
			Kind:  common.KindDeployment,
		},
	}
	embeddingServerService = common.ManifestKey{
		Name: "console-embedding-server",
		GroupKind: schema.GroupKind{
			Group: common.GroupCore,
			Kind:  common.KindService,
		},
	}
)

var _ = Describe("Local embedding server", func() {
	for _, chartEntry := range console.Charts() {
		Context(chartEntry.Name+" with local embeddings enabled", Ordered, func() {
			var (
				deployment appsv1.Deployment
				service    corev1.Service
				manifests  common.ManifestMap
				err        error
				values     = map[string]interface{}{
					"ai": map[string]interface{}{
						"localEmbeddings": map[string]interface{}{
							"enabled": true,
							"extraArgs": []interface{}{
								"--max-concurrent-requests=4",
							},
							"podLabels": map[string]interface{}{
								"app.kubernetes.io/name":     "wrong-name",
								"app.kubernetes.io/instance": "wrong-instance",
								"example.com/owner":          "test",
							},
						},
					},
				}
			)

			BeforeAll(func() {
				manifests, err = chartEntry.Load(values)
				Expect(err).NotTo(HaveOccurred())

				rawDeployment, exists := manifests[embeddingServerDeployment.String()]
				Expect(exists).To(BeTrue())
				err = runtime.DefaultUnstructuredConverter.FromUnstructured(rawDeployment.UnstructuredContent(), &deployment)
				Expect(err).NotTo(HaveOccurred())

				rawService, exists := manifests[embeddingServerService.String()]
				Expect(exists).To(BeTrue())
				err = runtime.DefaultUnstructuredConverter.FromUnstructured(rawService.UnstructuredContent(), &service)
				Expect(err).NotTo(HaveOccurred())
			})

			It("renders matching selectors and preserves custom pod labels", func() {
				expectedSelector := map[string]string{
					"app.kubernetes.io/name":     "embedding-server",
					"app.kubernetes.io/instance": chartEntry.ReleaseName,
				}

				Expect(deployment.Spec.Selector.MatchLabels).To(Equal(expectedSelector))
				Expect(service.Spec.Selector).To(Equal(expectedSelector))
				Expect(deployment.Spec.Template.Labels).To(HaveKeyWithValue("app.kubernetes.io/name", "embedding-server"))
				Expect(deployment.Spec.Template.Labels).To(HaveKeyWithValue("app.kubernetes.io/instance", chartEntry.ReleaseName))
				Expect(deployment.Spec.Template.Labels).To(HaveKeyWithValue("example.com/owner", "test"))
			})

			It("renders the image, probes, security context, and required arguments", func() {
				Expect(deployment.Spec.Template.Spec.Containers).To(HaveLen(1))
				container := deployment.Spec.Template.Spec.Containers[0]

				Expect(container.Image).To(Equal("ghcr.io/pluralsh/embedding-server:v0.1.0"))
				Expect(container.Args).To(Equal([]string{
					"--json-output",
					"--max-concurrent-requests=4",
				}))

				Expect(container.StartupProbe).NotTo(BeNil())
				Expect(container.StartupProbe.HTTPGet.Path).To(Equal("/health"))
				Expect(container.LivenessProbe).NotTo(BeNil())
				Expect(container.ReadinessProbe).NotTo(BeNil())
				Expect(container.ReadinessProbe.HTTPGet.Path).To(Equal("/health"))

				Expect(container.SecurityContext).NotTo(BeNil())
				Expect(container.SecurityContext.AllowPrivilegeEscalation).To(HaveValue(BeFalse()))
				Expect(container.SecurityContext.ReadOnlyRootFilesystem).To(HaveValue(BeTrue()))
				Expect(container.SecurityContext.Capabilities.Drop).To(ContainElement(corev1.Capability("ALL")))
				Expect(container.SecurityContext.SeccompProfile.Type).To(Equal(corev1.SeccompProfileTypeRuntimeDefault))
			})
		})
	}
})
