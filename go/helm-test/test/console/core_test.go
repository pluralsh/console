package console_test

import (
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"

	"github.com/pluralsh/console/go/helm-test/internal/common"
	"github.com/pluralsh/console/go/helm-test/test/console"
)

var _ = Describe("Console Chart", func() {
	Context("with default values", Ordered, func() {
		var (
			err       error
			manifests common.ManifestMap
		)

		BeforeAll(func() {
			manifests, err = console.LoadConsoleChart(nil)
			Expect(err).NotTo(HaveOccurred())
		})

		It("should have core console resources", func() {
			By("deployment")
			_, exists := manifests[console.DefaultResources().Console.Deployment.String()]
			Expect(exists).To(BeTrue())

			By("service")
			_, exists = manifests[console.DefaultResources().Console.Service.String()]
			Expect(exists).To(BeTrue())

			By("ingress")
			_, exists = manifests[console.DefaultResources().Console.Ingress.String()]
			Expect(exists).To(BeTrue())
		})

		It("should have dashboard api resources", func() {
			By("deployment")
			_, exists := manifests[console.DefaultResources().Dashboard.Deployment.String()]
			Expect(exists).To(BeTrue())

			By("service")
			_, exists = manifests[console.DefaultResources().Dashboard.Service.String()]
			Expect(exists).To(BeTrue())
		})

		It("should have kas resources", func() {
			By("deployment")
			_, exists := manifests[console.DefaultResources().Kas.Deployment.String()]
			Expect(exists).To(BeTrue())

			By("service")
			_, exists = manifests[console.DefaultResources().Kas.Service.String()]
			Expect(exists).To(BeTrue())

			By("ingress")
			_, exists = manifests[console.DefaultResources().Kas.Ingress.String()]
			Expect(exists).To(BeTrue())
		})

		It("should have operator controller deployment", func() {
			By("deployment")
			_, exists := manifests[console.DefaultResources().Operator.Deployment.String()]
			Expect(exists).To(BeTrue())
		})

		It("should have redis resources", func() {
			By("statefulSet")
			_, exists := manifests[console.DefaultResources().Redis.StatefulSet.String()]
			Expect(exists).To(BeTrue())

			By("service")
			_, exists = manifests[console.DefaultResources().Redis.Service.String()]
			Expect(exists).To(BeTrue())
		})
	})
})
