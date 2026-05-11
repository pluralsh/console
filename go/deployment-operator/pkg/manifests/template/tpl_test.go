package template

import (
	"fmt"
	"os"
	"path/filepath"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	console "github.com/pluralsh/console/go/client"
)

var _ = Describe(".tpl Template Rendering", func() {
	var svc *console.ServiceDeploymentForAgent

	BeforeEach(func() {
		// Setup the mock service deployment each time
		svc = mockServiceDeployment()
	})

	Describe("Render .tpl with valid data", func() {
		templateFile := "_simpleConfigMap.tpl"
		It(fmt.Sprintf("should render %s correctly", templateFile), func() {
			tplFile := filepath.Join("..", "..", "..", "test", "tpl", templateFile)
			tplData, err := os.ReadFile(tplFile)
			Expect(err).NotTo(HaveOccurred())

			rendered, err := renderTpl(tplData, svc)
			fmt.Println("ℹ️  rendered template:", templateFile)
			fmt.Println(string(rendered))
			Expect(err).NotTo(HaveOccurred())
			Expect(string(rendered)).To(ContainSubstring("name: test-config-configmap"))
			Expect(string(rendered)).To(ContainSubstring("version: \"v1\""))
		})
	})

	Describe("Render template with include", func() {
		templateFile := "_templateWithInclude.tpl"
		It(fmt.Sprintf("should render %s correctly", templateFile), func() {
			tplFile := filepath.Join("..", "..", "..", "test", "tpl", templateFile)
			tplData, err := os.ReadFile(tplFile)
			Expect(err).NotTo(HaveOccurred())

			rendered, err := renderTpl(tplData, svc)
			fmt.Println("ℹ️  rendered template:", templateFile)
			fmt.Println(string(rendered))
			Expect(err).NotTo(HaveOccurred())
			Expect(string(rendered)).To(ContainSubstring("name: test-config-main"))
			Expect(string(rendered)).To(ContainSubstring("more-data: test-config-included"))
			Expect(string(rendered)).To(ContainSubstring("version: \"v1\""))
		})
	})
})

func mockServiceDeployment() *console.ServiceDeploymentForAgent {
	return &console.ServiceDeploymentForAgent{
		Namespace: "default",
		Name:      "test-service",
		Cluster: &console.ServiceDeploymentForAgent_Cluster{
			ID:   "123",
			Name: "test-cluster",
		},
		Configuration: []*console.ServiceDeploymentForAgent_Configuration{
			{Name: "name", Value: "test-config"},
			{Name: "version", Value: "v1"},
		},
	}
}
