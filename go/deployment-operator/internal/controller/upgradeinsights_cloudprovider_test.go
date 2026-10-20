package controller

import (
	"github.com/aws/aws-sdk-go-v2/service/eks/types"
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
)

var _ = Describe("EKSCloudProvider", func() {
	Describe("toUpgradeInsightAttributes", func() {
		It("skips malformed deprecation replacements while retaining the parent insight and valid sibling", func() {
			validReplacement := "apps/v1 Deployment"
			emptyReplacement := ""
			whitespaceReplacement := " \t\n "
			provider := &EKSCloudProvider{}

			attributes := provider.toUpgradeInsightAttributes([]*types.Insight{{
				Name: stringPointer("deprecated APIs"),
				CategorySpecificSummary: &types.InsightCategorySpecificSummary{
					DeprecationDetails: []types.DeprecationDetail{
						{Usage: stringPointer("nil replacement")},
						{Usage: stringPointer("empty replacement"), ReplacedWith: &emptyReplacement},
						{Usage: stringPointer("whitespace replacement"), ReplacedWith: &whitespaceReplacement},
						{Usage: stringPointer("valid usage"), ReplacedWith: &validReplacement},
					},
				},
			}})

			Expect(attributes).To(HaveLen(1))
			Expect(attributes[0].Name).To(Equal("deprecated APIs"))
			Expect(attributes[0].Details).To(HaveLen(1))
			Expect(attributes[0].Details[0].Used).ToNot(BeNil())
			Expect(*attributes[0].Details[0].Used).To(Equal("valid usage"))
			Expect(attributes[0].Details[0].Replacement).To(BeIdenticalTo(&validReplacement))
		})
	})
})

func stringPointer(value string) *string {
	return &value
}
