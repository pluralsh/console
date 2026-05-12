package console_test

import (
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"

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

				By("ingress")
				_, exists = manifests[resources.Kas.Ingress.String()]
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
	}
})
