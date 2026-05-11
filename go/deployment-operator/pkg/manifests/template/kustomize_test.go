package template

import (
	"os"
	"path/filepath"
	"sort"
	"strings"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
)

var _ = Describe("Kustomize template", func() {

	dir := filepath.Join("..", "..", "..", "test", "kustomize", "overlays")
	svc := &console.ServiceDeploymentForAgent{
		Namespace: "default",
		Kustomize: &console.KustomizeFragment{
			Path:       "",
			EnableHelm: lo.ToPtr(false),
		},
	}
	Context("Render kustomize template", func() {
		It("should successfully render the dev template", func() {
			svc.Kustomize.Path = "dev"
			resp, err := NewKustomize(dir).Render(svc, mapper)
			Expect(err).NotTo(HaveOccurred())
			Expect(len(resp)).To(Equal(3))
			sort.Slice(resp, func(i, j int) bool {
				return resp[i].GetKind() < resp[j].GetKind()
			})
			Expect(resp[0].GetKind()).To(Equal("ConfigMap"))
			Expect(strings.HasPrefix(resp[0].GetName(), "app-config")).Should(BeTrue())
			Expect(resp[1].GetKind()).To(Equal("Deployment"))
			Expect(resp[2].GetKind()).To(Equal("Secret"))
			Expect(strings.HasPrefix(resp[2].GetName(), "credentials")).Should(BeTrue())
		})

	})
})

var _ = Describe("Kustomize liquid template", func() {
	const (
		name = "test"
	)

	dir := filepath.Join("..", "..", "..", "test", "kustomize", "liquid")
	AfterEach(func() {
		Expect(os.Remove(filepath.Join(dir, "dev", "kustomization.yaml"))).To(Succeed())
	})
	svc := &console.ServiceDeploymentForAgent{
		Namespace: "default",
		Kustomize: &console.KustomizeFragment{
			Path:       "",
			EnableHelm: lo.ToPtr(false),
		},
	}
	Context("Render kustomize liquid template", func() {
		It("should successfully render the liquid template", func() {
			svc.Kustomize.Path = "dev"
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
			resp, err := NewKustomize(dir).Render(svc, mapper)
			Expect(err).NotTo(HaveOccurred())
			Expect(len(resp)).To(Equal(3))
			sort.Slice(resp, func(i, j int) bool {
				return resp[i].GetKind() < resp[j].GetKind()
			})
			Expect(resp[0].GetKind()).To(Equal("ConfigMap"))
			Expect(strings.HasPrefix(resp[0].GetName(), name)).Should(BeTrue())
			Expect(resp[1].GetKind()).To(Equal("Deployment"))
			Expect(resp[2].GetKind()).To(Equal("Secret"))
			Expect(strings.HasPrefix(resp[2].GetName(), "credentials")).Should(BeTrue())
		})

	})
})
