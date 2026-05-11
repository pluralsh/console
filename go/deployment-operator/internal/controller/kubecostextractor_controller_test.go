package controller

import (
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"

	"github.com/pluralsh/deployment-operator/api/v1alpha1"
)

var _ = Describe("KubecostExtractor Controller", Ordered, func() {
	Context("Filter function", func() {

		recommendations := v1alpha1.RecommendationsSettings{}

		It("should return empty string", func() {
			result := recommendationsFilter(recommendations)
			Expect(result).To(BeEmpty())
		})

		It("should return excluded namespaces", func() {
			recommendations.ExcludeNamespaces = []string{
				"one", "two", "three",
			}
			result := recommendationsFilter(recommendations)
			Expect(result).To(Equal(`namespace!:"one","two","three"`))
		})
		It("should return required annotations", func() {
			recommendations.ExcludeNamespaces = nil
			recommendations.RequireAnnotations = map[string]string{
				"one": "1", "two": "2", "three": "3",
			}
			result := recommendationsFilter(recommendations)
			Expect(result).To(Equal(`annotation[one]:"1"+annotation[three]:"3"+annotation[two]:"2"`))
		})
		It("should return full filter", func() {
			recommendations.ExcludeNamespaces = []string{
				"one",
			}
			recommendations.RequireAnnotations = map[string]string{
				"one": "1",
			}
			result := recommendationsFilter(recommendations)
			Expect(result).To(Equal(`namespace!:"one"+annotation[one]:"1"`))
		})
	})
})
