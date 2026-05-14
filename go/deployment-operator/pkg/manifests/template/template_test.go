package template

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

var _ = Describe("Default template", func() {

	svc := &console.ServiceDeploymentForAgent{
		Namespace:     "default",
		Configuration: make([]*console.ServiceDeploymentForAgent_Configuration, 0),
	}
	Context("Render raw template with no renderers provided", func() {
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
			resp, err := Render(dir, svc, mapper)
			Expect(err).NotTo(HaveOccurred())
			Expect(len(resp)).To(Equal(1))
			Expect(resp[0].GetName()).To(Equal(name))
		})
		It("should skip templating liquid", func() {
			dir := filepath.Join("..", "..", "..", "test", "rawTemplated")
			svc.Templated = lo.ToPtr(false)
			svc.Renderers = []*console.RendererFragment{{Path: ".", Type: console.RendererTypeAuto}}
			resp, err := Render(dir, svc, mapper)
			Expect(err).NotTo(HaveOccurred())
			Expect(len(resp)).To(Equal(5))
		})

	})
})

var _ = Describe("Default template, AUTO", func() {

	svc := &console.ServiceDeploymentForAgent{
		Namespace:     "default",
		Configuration: make([]*console.ServiceDeploymentForAgent_Configuration, 0),
	}
	Context("Render raw template ", func() {
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
			svc.Renderers = []*console.RendererFragment{{Path: ".", Type: console.RendererTypeAuto}}
			resp, err := Render(dir, svc, mapper)
			Expect(err).NotTo(HaveOccurred())
			Expect(len(resp)).To(Equal(1))
			Expect(resp[0].GetName()).To(Equal(name))
		})
		It("should skip templating liquid", func() {
			dir := filepath.Join("..", "..", "..", "test", "rawTemplated")
			svc.Templated = lo.ToPtr(false)
			svc.Renderers = []*console.RendererFragment{{Path: ".", Type: console.RendererTypeAuto}}
			resp, err := Render(dir, svc, mapper)
			Expect(err).NotTo(HaveOccurred())
			Expect(len(resp)).To(Equal(5))
		})

	})
})

var _ = Describe("KUSTOMIZE template, AUTO", func() {

	svc := &console.ServiceDeploymentForAgent{
		Namespace:     "default",
		Configuration: make([]*console.ServiceDeploymentForAgent_Configuration, 0),
	}
	Context("Render kustomize template ", func() {
		It("should successfully render the kustomize template", func() {
			dir := filepath.Join("..", "..", "..", "test", "mixed")
			svc.Cluster = &console.ServiceDeploymentForAgent_Cluster{
				ID:   "123",
				Name: "test",
			}
			svc.Renderers = []*console.RendererFragment{{Path: filepath.Join("kustomize", "overlays", "dev"), Type: console.RendererTypeAuto}}
			resp, err := Render(dir, svc, mapper)
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

var _ = Describe("RAW and KUSTOMIZE and HELM renderers", Ordered, func() {
	svc := &console.ServiceDeploymentForAgent{
		Namespace:     "default",
		Name:          "test",
		Configuration: make([]*console.ServiceDeploymentForAgent_Configuration, 0),
	}

	r := gin.Default()
	r.GET("/version", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"major": "1",
			"minor": "21",
		})
	})

	srv := &http.Server{
		Addr:    ":8080",
		Handler: r,
	}

	BeforeAll(func() {
		// Initializing the server in a goroutine so that
		// it won't block the graceful shutdown handling below
		go func() {
			if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
				Expect(err).NotTo(HaveOccurred())
			}
		}()
	})
	AfterAll(func() {

		// The context is used to inform the server it has 5 seconds to finish
		// the request it is currently handling
		ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
		defer cancel()
		if err := srv.Shutdown(ctx); err != nil {
			log.Fatal("Server forced to shutdown: ", err)
		}

		log.Println("Server exiting")
	})

	Context("Render RAW and KUSTOMIZE and HELM template", func() {
		const name = "nginx"
		It("should successfully render the raw and kustomize and helm templates", func() {
			dir := filepath.Join("..", "..", "..", "test", "mixed")
			qa := "./values-qa.yaml"
			prod := "./values-prod.yaml"
			valuesFiles := []*string{&qa, &prod}
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
			svc.Renderers = []*console.RendererFragment{
				{Path: "raw", Type: console.RendererTypeRaw},
				{Path: filepath.Join("kustomize", "overlays", "dev"), Type: console.RendererTypeKustomize},
				{
					Path: filepath.Join("helm", "yet-another-cloudwatch-exporter"),
					Type: console.RendererTypeHelm,
					Helm: &console.HelmMinimalFragment{
						Release:     lo.ToPtr("my-release"),
						ValuesFiles: valuesFiles,
						IgnoreHooks: lo.ToPtr(true),
					},
				},
			}
			rawManifests, err := NewRaw(filepath.Join(dir, "raw")).Render(svc, mapper)
			Expect(err).NotTo(HaveOccurred())
			helmSvc := *svc
			helmSvc.Helm = &console.ServiceDeploymentForAgent_Helm{
				Release:     lo.ToPtr("my-release"),
				ValuesFiles: valuesFiles,
				IgnoreHooks: lo.ToPtr(true),
			}
			helmManifests, err := NewHelm(filepath.Join(dir, "helm", "yet-another-cloudwatch-exporter")).Render(&helmSvc, mapper)
			Expect(err).NotTo(HaveOccurred())
			keyCounts := map[string]int{}
			for _, r := range append(rawManifests, helmManifests...) {
				gvk := r.GroupVersionKind()
				key := fmt.Sprintf("%s/%s/%s/%s", gvk.Group, gvk.Version, gvk.Kind, r.GetNamespace()+"/"+r.GetName())
				keyCounts[key]++
			}
			duplicateKeys := make([]string, 0)
			for key, count := range keyCounts {
				if count > 1 {
					duplicateKeys = append(duplicateKeys, key)
				}
			}
			Expect(duplicateKeys).To(ContainElement("monitoring.coreos.com/v1/ServiceMonitor/prod-monitoring/my-release"))
			resp, err := Render(dir, svc, mapper)
			Expect(err).NotTo(HaveOccurred())
			seen := map[string]struct{}{}
			for _, r := range resp {
				gvk := r.GroupVersionKind()
				key := fmt.Sprintf("%s/%s/%s/%s", gvk.Group, gvk.Version, gvk.Kind, r.GetNamespace()+"/"+r.GetName())
				_, exists := seen[key]
				Expect(exists).To(BeFalse(), "duplicate object detected: %s", key)
				seen[key] = struct{}{}
			}
			Expect(len(resp)).To(Equal(5))
			var rawPod *unstructured.Unstructured
			for _, r := range resp {
				if r.GetKind() == "Pod" && r.GetName() == name {
					rawPod = &r
					break
				}
			}
			Expect(rawPod).NotTo(BeNil())

			// Find the ServiceMonitor resource to verify helm values
			var serviceMonitor *unstructured.Unstructured
			for _, r := range resp {
				if r.GetKind() == "ServiceMonitor" {
					serviceMonitor = &r
					break
				}
			}
			Expect(serviceMonitor).NotTo(BeNil())

			// Verify ServiceMonitor identity; contents may vary after de-dup.
			Expect(serviceMonitor.GetNamespace()).To(Equal("prod-monitoring"))
			labels := serviceMonitor.GetLabels()
			Expect(labels).NotTo(BeNil())
			env, ok := labels["environment"]
			Expect(ok).To(BeTrue())
			Expect(env).To(Equal("prod"))

			// Verify interval in spec
			spec, found, err := unstructured.NestedMap(serviceMonitor.Object, "spec")
			Expect(err).NotTo(HaveOccurred())
			Expect(found).To(BeTrue())
			endpoints, found, err := unstructured.NestedSlice(spec, "endpoints")
			Expect(err).NotTo(HaveOccurred())
			Expect(found).To(BeTrue())
			Expect(len(endpoints)).To(Equal(1))
			endpoint := endpoints[0].(map[string]interface{})
			interval, ok := endpoint["interval"]
			Expect(ok).To(BeTrue())
			Expect(interval).To(Equal("30s"))

			kustomizeResources := make([]unstructured.Unstructured, 0, 3)
			for _, r := range resp {
				if r.GetNamespace() == "my-app-dev" {
					switch r.GetKind() {
					case "ConfigMap", "Deployment", "Secret":
						kustomizeResources = append(kustomizeResources, r)
					}
				}
			}
			Expect(len(kustomizeResources)).To(Equal(3))
			sort.Slice(kustomizeResources, func(i, j int) bool {
				return kustomizeResources[i].GetKind() < kustomizeResources[j].GetKind()
			})
			Expect(kustomizeResources[0].GetKind()).To(Equal("ConfigMap"))
			Expect(strings.HasPrefix(kustomizeResources[0].GetName(), "app-config")).Should(BeTrue())
			Expect(kustomizeResources[1].GetKind()).To(Equal("Deployment"))
			Expect(kustomizeResources[2].GetKind()).To(Equal("Secret"))
			Expect(strings.HasPrefix(kustomizeResources[2].GetName(), "credentials")).Should(BeTrue())
			Expect(serviceMonitor.GetKind()).To(Equal("ServiceMonitor"))
			Expect(serviceMonitor.GetName()).To(Equal("my-release"))
		})

	})
})
