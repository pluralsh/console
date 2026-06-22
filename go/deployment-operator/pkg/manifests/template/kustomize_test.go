package template

import (
	"os"
	"path/filepath"
	"sort"
	"strings"
	"testing"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
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

func TestKustomizeRenderTemplatesLiquidKustomizationFile(t *testing.T) {
	const name = "test"

	dir := filepath.Join("..", "..", "..", "test", "kustomize", "liquid")
	renderedKustomization := filepath.Join(dir, "dev", "kustomization.yaml")
	if err := os.Remove(renderedKustomization); err != nil && !os.IsNotExist(err) {
		t.Fatalf("cleanup before test failed: %v", err)
	}
	t.Cleanup(func() {
		_ = os.Remove(renderedKustomization)
	})

	svc := &console.ServiceDeploymentForAgent{
		Namespace: "default",
		Kustomize: &console.KustomizeFragment{
			Path:       "dev",
			EnableHelm: lo.ToPtr(false),
		},
		Configuration: []*console.ServiceDeploymentForAgent_Configuration{
			{
				Name:  "name",
				Value: name,
			},
		},
		Cluster: &console.ServiceDeploymentForAgent_Cluster{
			ID:   "123",
			Name: "test",
		},
	}

	resp, err := NewKustomize(dir).Render(svc, newKustomizeTestRESTMapper())
	if err != nil {
		t.Fatalf("render failed: %v", err)
	}
	if got := len(resp); got != 3 {
		t.Fatalf("expected 3 resources, got %d", got)
	}

	content, err := os.ReadFile(renderedKustomization)
	if err != nil {
		t.Fatalf("expected rendered kustomization file: %v", err)
	}
	text := string(content)
	if strings.Contains(text, "{{ configuration.name }}") {
		t.Fatalf("expected liquid placeholders to be rendered, got %q", text)
	}
	if !strings.Contains(text, "name: test") {
		t.Fatalf("expected rendered kustomization to include configmap name, got %q", text)
	}
	if !strings.Contains(text, "- ../../base") {
		t.Fatalf("expected rendered kustomization to preserve relative base resource, got %q", text)
	}

	configMap := mustFindResourceByKind(t, resp, "ConfigMap")
	if !strings.HasPrefix(configMap.GetName(), name) {
		t.Fatalf("expected configmap name to start with %q, got %q", name, configMap.GetName())
	}

	deployment := mustFindResourceByKind(t, resp, "Deployment")
	if envValue := mustFindContainerEnvValue(t, deployment, "foo"); envValue != "we-are-in-dev" {
		t.Fatalf("expected patched env value we-are-in-dev, got %q", envValue)
	}
}

func newKustomizeTestRESTMapper() meta.RESTMapper {
	mapper := meta.NewDefaultRESTMapper([]schema.GroupVersion{
		{Group: "", Version: "v1"},
		{Group: "apps", Version: "v1"},
	})
	mapper.Add(schema.GroupVersionKind{Group: "", Version: "v1", Kind: "ConfigMap"}, meta.RESTScopeNamespace)
	mapper.Add(schema.GroupVersionKind{Group: "", Version: "v1", Kind: "Secret"}, meta.RESTScopeNamespace)
	mapper.Add(schema.GroupVersionKind{Group: "apps", Version: "v1", Kind: "Deployment"}, meta.RESTScopeNamespace)
	return mapper
}

func mustFindResourceByKind(t *testing.T, items []unstructured.Unstructured, kind string) unstructured.Unstructured {
	t.Helper()
	for _, item := range items {
		if item.GetKind() == kind {
			return item
		}
	}
	t.Fatalf("resource kind %q not found", kind)
	return unstructured.Unstructured{}
}

func mustFindContainerEnvValue(t *testing.T, deployment unstructured.Unstructured, envName string) string {
	t.Helper()
	containers, found, err := unstructured.NestedSlice(deployment.Object, "spec", "template", "spec", "containers")
	if err != nil {
		t.Fatalf("read containers: %v", err)
	}
	if !found || len(containers) == 0 {
		t.Fatalf("deployment containers not found")
	}

	container, ok := containers[0].(map[string]interface{})
	if !ok {
		t.Fatalf("unexpected container type %T", containers[0])
	}
	env, ok := container["env"].([]interface{})
	if !ok {
		t.Fatalf("deployment env not found")
	}
	for _, item := range env {
		entry, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		if entry["name"] == envName {
			value, _ := entry["value"].(string)
			return value
		}
	}
	t.Fatalf("env %q not found", envName)
	return ""
}
