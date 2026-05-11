package template

import (
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
)

var _ = Describe("Utils", func() {
	svc := &console.ServiceDeploymentForAgent{
		Namespace: "default",
		Kustomize: &console.KustomizeFragment{
			Path:       "",
			EnableHelm: lo.ToPtr(false),
		},
		Imports: []*console.ServiceDeploymentForAgent_Imports{
			{
				ID: "1",
				Stack: &console.ServiceDeploymentForAgent_Imports_Stack{
					ID:   lo.ToPtr("1"),
					Name: "1",
				},
				Outputs: []*console.ServiceDeploymentForAgent_Imports_Outputs{
					{
						Name:  "ansible_instance_ids",
						Value: "[\"i-05066719bbd2ea672\",\"i-0810e18d30b5cd564\",\"i-0c2a356e403cd67ec\"]",
					},
					{
						Name:  "ansible_key_pair_name",
						Value: "ansible-ssh-key",
					},
				},
			},
			{
				ID: "2",
				Stack: &console.ServiceDeploymentForAgent_Imports_Stack{
					ID:   lo.ToPtr("2"),
					Name: "2",
				},
				Outputs: []*console.ServiceDeploymentForAgent_Imports_Outputs{
					{
						Name:  "stacks_iam_role",
						Value: "arn:aws:iam::312272277431:role/boot-test-plrl-stacks",
					},
				},
			},
		},
	}
	Context("Render imports", func() {
		It("should successfully render the imports", func() {
			resp := imports(svc)
			Expect(len(resp)).To(Equal(2))
			Expect(len(resp["1"])).To(Equal(2))
			Expect(len(resp["2"])).To(Equal(1))
		})
	})

	Context("tagsMap", func() {
		It("returns empty map when tags is nil", func() {
			Expect(tagsMap(nil)).To(BeEmpty())
		})
		It("returns empty map when tags is empty", func() {
			Expect(tagsMap([]*console.ClusterTags{})).To(BeEmpty())
		})
		It("maps tag name to value for a single tag", func() {
			tags := []*console.ClusterTags{
				{Name: "env", Value: "prod"},
			}
			Expect(tagsMap(tags)).To(Equal(map[string]string{"env": "prod"}))
		})
		It("maps all tag names to values for multiple tags", func() {
			tags := []*console.ClusterTags{
				{Name: "env", Value: "prod"},
				{Name: "team", Value: "platform"},
				{Name: "region", Value: "us-east-1"},
			}
			Expect(tagsMap(tags)).To(Equal(map[string]string{
				"env":    "prod",
				"team":   "platform",
				"region": "us-east-1",
			}))
		})
	})

	Context("Cluster configuration", func() {
		It("includes Tags from cluster and exposes tags (lowercase) for liquid templating", func() {
			cluster := &console.ServiceDeploymentForAgent_Cluster{
				ID:   "cluster-1",
				Name: "my-cluster",
				Tags: []*console.ClusterTags{
					{Name: "env", Value: "staging"},
					{Name: "owner", Value: "sre"},
				},
			}
			cfg := clusterConfiguration(cluster)
			Expect(cfg).To(HaveKey("Tags"))
			Expect(cfg["Tags"]).To(Equal(map[string]string{
				"env":   "staging",
				"owner": "sre",
			}))
			Expect(cfg).To(HaveKey("tags"))
			Expect(cfg["tags"]).To(Equal(map[string]string{
				"env":   "staging",
				"owner": "sre",
			}))
		})
		It("includes empty Tags when cluster has no tags", func() {
			cluster := &console.ServiceDeploymentForAgent_Cluster{
				ID:   "cluster-1",
				Name: "my-cluster",
			}
			cfg := clusterConfiguration(cluster)
			Expect(cfg).To(HaveKey("Tags"))
			Expect(cfg["Tags"]).To(Equal(map[string]string{}))
			Expect(cfg).To(HaveKey("tags"))
			Expect(cfg["tags"]).To(Equal(map[string]string{}))
		})
	})
})
