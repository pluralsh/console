package template

import (
	"path/filepath"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

var _ = Describe("Raw template", func() {

	svc := &console.ServiceDeploymentForAgent{
		Namespace:     "default",
		Configuration: make([]*console.ServiceDeploymentForAgent_Configuration, 0),
	}
	Context("Render raw template", func() {
		const name = "nginx"
		It("should successfully render the raw template", func() {
			dir := filepath.Join("..", "..", "..", "test", "raw")
			svc.Configuration = []*console.ServiceDeploymentForAgent_Configuration{
				{
					Name:  "name",
					Value: name,
				},
			}
			svc.Cluster = &console.ServiceDeploymentForAgent_Cluster{
				ID:   "123",
				Name: "test",
			}
			resp, err := NewRaw(dir).Render(svc, mapper)
			Expect(err).NotTo(HaveOccurred())
			Expect(len(resp)).To(Equal(1))
			Expect(resp[0].GetName()).To(Equal(name))
		})
		It("should skip templating liquid", func() {
			dir := filepath.Join("..", "..", "..", "test", "rawTemplated")
			svc.Templated = lo.ToPtr(false)
			resp, err := NewRaw(dir).Render(svc, mapper)
			Expect(err).NotTo(HaveOccurred())
			Expect(len(resp)).To(Equal(5))

			var podManifest *unstructured.Unstructured
			for i := range resp {
				if resp[i].GetKind() == "Pod" && resp[i].GetName() == name {
					podManifest = &resp[i]
					break
				}
			}
			Expect(podManifest).NotTo(BeNil())
			Expect(podManifest.GetName()).To(Equal(name))
		})

	})
})
