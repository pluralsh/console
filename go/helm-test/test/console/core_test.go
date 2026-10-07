package console_test

import (
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	"github.com/pluralsh/console/go/helm-test/internal/common"
	"github.com/pluralsh/console/go/helm-test/test/console"
)

var _ = Describe("Core", func() {
	for _, chartEntry := range console.Charts() {
		Context(chartEntry.Name+" with default values", Ordered, func() {
			var (
				err       error
				manifests common.ManifestMap
				resources = chartEntry.Resources()
			)

			BeforeAll(func() {
				manifests, err = chartEntry.Load(nil)
				Expect(err).NotTo(HaveOccurred())
			})

			It("should have core console resources", func() {
				By("deployment")
				_, exists := manifests[resources.Console.Deployment.String()]
				Expect(exists).To(BeTrue())

				By("service")
				_, exists = manifests[resources.Console.Service.String()]
				Expect(exists).To(BeTrue())

				By("ingress")
				_, exists = manifests[resources.Console.Ingress.String()]
				Expect(exists).To(BeTrue())
			})

			It("should have kas resources", func() {
				By("deployment")
				_, exists := manifests[resources.Kas.Deployment.String()]
				Expect(exists).To(BeTrue())

				By("service")
				_, exists = manifests[resources.Kas.Service.String()]
				Expect(exists).To(BeTrue())
			})

			It("should have operator controller deployment", func() {
				By("deployment")
				_, exists := manifests[resources.Operator.Deployment.String()]
				Expect(exists).To(BeTrue())
			})

			It("should have redis resources", func() {
				By("statefulSet")
				_, exists := manifests[resources.Redis.StatefulSet.String()]
				Expect(exists).To(BeTrue())

				By("service")
				_, exists = manifests[resources.Redis.Service.String()]
				Expect(exists).To(BeTrue())
			})
		})

		Context(chartEntry.Name+" with pod TLS enabled", Ordered, func() {
			var (
				err       error
				manifests common.ManifestMap
				resources = chartEntry.Resources()
			)

			BeforeAll(func() {
				manifests, err = chartEntry.Load(map[string]interface{}{
					"console": map[string]interface{}{
						"tls": map[string]interface{}{"enabled": true},
					},
					"controller": map[string]interface{}{
						"console": map[string]interface{}{
							"tls": map[string]interface{}{"enabled": true},
						},
					},
				})
				Expect(err).NotTo(HaveOccurred())
			})

			It("uses HTTPS for KAS token exchange and skips certificate verification", func() {
				deployment := deploymentFromManifests(manifests, resources.Kas.Deployment)
				container, found := lo.Find(deployment.Spec.Template.Spec.Containers, func(container corev1.Container) bool {
					return container.Name == "api"
				})
				Expect(found).To(BeTrue())
				Expect(container.Args).To(ContainElements(
					"--token-exchange-endpoint=https://$(CONSOLE_HOST)/v1/dashboard/cluster",
					"--token-exchange-skip-tls-verify",
				))
			})

			It("uses HTTPS for KAS GraphQL calls and skips certificate verification", func() {
				configMap, found := manifests[resources.Kas.ConfigMap.String()]
				Expect(found).To(BeTrue())
				config, found, err := unstructured.NestedString(configMap.Object, "data", "config.yaml")
				Expect(err).NotTo(HaveOccurred())
				Expect(found).To(BeTrue())
				Expect(config).To(ContainSubstring("plural_url: \"https://console."))
				Expect(config).To(ContainSubstring(":4000/gql\""))
				Expect(config).To(ContainSubstring("plural_insecure_skip_tls_verify: true"))
			})

			It("uses HTTPS for operator GraphQL calls", func() {
				deployment := deploymentFromManifests(manifests, resources.Operator.Deployment)
				container, found := lo.Find(deployment.Spec.Template.Spec.Containers, func(container corev1.Container) bool {
					return container.Name == "manager"
				})
				Expect(found).To(BeTrue())
				Expect(container.Args).To(ContainElement(MatchRegexp(`^--console-url=https://console\..*:4000/gql$`)))
				Expect(container.Args).To(ContainElement("--console-insecure-skip-tls-verify"))
			})
		})

		Context(chartEntry.Name+" with dedicated kas hostname", Ordered, func() {
			var (
				err       error
				manifests common.ManifestMap
				resources = chartEntry.Resources()
				values    = map[string]interface{}{
					"ingress": map[string]interface{}{
						"console_dns": "console.example.com",
					},
					"kas": map[string]interface{}{
						"ingress": map[string]interface{}{
							"kas_dns": "kas.example.com",
						},
					},
				}
			)

			BeforeAll(func() {
				manifests, err = chartEntry.Load(values)
				Expect(err).NotTo(HaveOccurred())
			})

			It("should have kas ingress", func() {
				_, exists := manifests[resources.Kas.Ingress.String()]
				Expect(exists).To(BeTrue())
			})
		})
	}
})
