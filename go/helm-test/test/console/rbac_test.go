package console_test

import (
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	rbacv1 "k8s.io/api/rbac/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"

	"github.com/pluralsh/console/go/helm-test/internal/common"
	"github.com/pluralsh/console/go/helm-test/test/console"
)

var _ = Describe("RBAC", func() {
	for _, chartEntry := range console.Charts() {
		bindingKey := common.ManifestKey{
			Name: "plrl-" + chartEntry.ReleaseName + "-console-binding",
			GroupKind: schema.GroupKind{
				Group: "rbac.authorization.k8s.io",
				Kind:  "ClusterRoleBinding",
			},
		}

		Context(chartEntry.Name+" with default values", Ordered, func() {
			var manifests common.ManifestMap

			BeforeAll(func() {
				var err error
				manifests, err = chartEntry.Load(nil)
				Expect(err).NotTo(HaveOccurred())
			})

			It("should bind the Console service account to cluster-admin", func() {
				rawBinding, exists := manifests[bindingKey.String()]
				Expect(exists).To(BeTrue())

				var binding rbacv1.ClusterRoleBinding
				Expect(runtime.DefaultUnstructuredConverter.FromUnstructured(rawBinding.UnstructuredContent(), &binding)).To(Succeed())
				Expect(binding.RoleRef.Name).To(Equal("cluster-admin"))
				Expect(binding.Subjects).To(ContainElement(rbacv1.Subject{
					Kind: "ServiceAccount",
					Name: "console",
				}))
			})
		})

		Context(chartEntry.Name+" with legacy values without RBAC configuration", Ordered, func() {
			var manifests common.ManifestMap

			BeforeAll(func() {
				chart, err := common.LoadChart(common.WithLocalPath(chartEntry.Path))
				Expect(err).NotTo(HaveOccurred())
				delete(chart.Values, "rbac")

				manifestList, err := common.RenderChart(chart, nil)
				Expect(err).NotTo(HaveOccurred())
				manifests, err = common.NewManifestMap(manifestList)
				Expect(err).NotTo(HaveOccurred())
			})

			It("should preserve the Console cluster role binding", func() {
				_, exists := manifests[bindingKey.String()]
				Expect(exists).To(BeTrue())
			})
		})

		Context(chartEntry.Name+" with the Console cluster role binding disabled", Ordered, func() {
			var manifests common.ManifestMap

			BeforeAll(func() {
				var err error
				manifests, err = chartEntry.Load(map[string]interface{}{
					"rbac": map[string]interface{}{
						"clusterRoleBinding": map[string]interface{}{
							"enabled": false,
						},
					},
				})
				Expect(err).NotTo(HaveOccurred())
			})

			It("should omit the Console cluster role binding", func() {
				_, exists := manifests[bindingKey.String()]
				Expect(exists).To(BeFalse())
			})
		})
	}
})
