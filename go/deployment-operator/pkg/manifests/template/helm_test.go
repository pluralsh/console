package template

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"path/filepath"
	"time"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	"github.com/gin-gonic/gin"
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
)

var _ = Describe("Helm template", Ordered, func() {
	svc := &console.ServiceDeploymentForAgent{
		Namespace: "default",
		Name:      "test",
		Cluster: &console.ServiceDeploymentForAgent_Cluster{
			ID:             "123",
			Name:           "test",
			Version:        lo.ToPtr("1.2.3"),
			CurrentVersion: lo.ToPtr("4.5.6"),
		},
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

	Context("Render helm template", func() {
		It("should successfully render Capabilities.APIVersions.Has", func() {
			dir := filepath.Join("..", "..", "..", "test", "helm", "yet-another-cloudwatch-exporter")

			resp, err := NewHelm(dir).Render(svc, mapper)
			Expect(err).NotTo(HaveOccurred())
			Expect(len(resp)).To(Equal(1))

			// Ignore hooks
			svc.Helm = &console.ServiceDeploymentForAgent_Helm{
				IgnoreHooks: lo.ToPtr(true),
			}
			resp, err = NewHelm(dir).Render(svc, mapper)
			Expect(err).NotTo(HaveOccurred())
			Expect(len(resp)).To(Equal(1))

			// Reconcile hooksSS
			svc.Helm.IgnoreHooks = lo.ToPtr(false)
			resp, err = NewHelm(dir).Render(svc, mapper)
			Expect(err).NotTo(HaveOccurred())
			Expect(len(resp)).To(Equal(2))

			// check lua script
			dir = filepath.Join("..", "..", "..", "test", "helm", "lua")

			svc.Helm.LuaScript = lo.ToPtr(`
			-- Define values
			values = {}
			values["name"] = "new-name"
			values["namespace"] = "new-namespace"
			values["version"] = cluster.version
			values["currentVersion"] = cluster.currentVersion
`)

			resp, err = NewHelm(dir).Render(svc, mapper)
			Expect(err).NotTo(HaveOccurred())
			Expect(len(resp)).To(Equal(1))

			Expect(resp[0].GetName()).To(Equal("new-name"))
			Expect(resp[0].GetNamespace()).To(Equal("new-namespace"))

			Expect(resp[0].GetLabels()["version"]).To(Equal("1.2.3"))
			Expect(resp[0].GetLabels()["currentVersion"]).To(Equal("4.5.6"))
		})

		It("should successfully render handle lua errors", func() {
			// check lua script when throw error
			dir := filepath.Join("..", "..", "..", "test", "helm", "lua")

			svc.Helm = &console.ServiceDeploymentForAgent_Helm{
				IgnoreHooks: lo.ToPtr(false),
			}
			svc.Helm.LuaScript = lo.ToPtr(`
			-- Define values
			values = {}
			-- Terminate with a simple error message
			error("Something went wrong!")`)

			_, err := NewHelm(dir).Render(svc, mapper)
			Expect(err).To(HaveOccurred())
			fmt.Println(err.Error())
			Expect(err.Error()).To(Equal("lua script error: <string>:5: Something went wrong!"))
		})

		It("should successfully merge empty values", func() {
			// check lua script when throw error
			dir := filepath.Join("..", "..", "..", "test", "helm", "lua-merge-empty")

			svc.Helm = &console.ServiceDeploymentForAgent_Helm{
				IgnoreHooks: lo.ToPtr(false),
			}
			svc.Helm.LuaScript = lo.ToPtr(`
			-- Define values
			values = {}
			local baseStr = fs.read("templates/base.yaml")
			local patchStr = fs.read("templates/patch.yaml")	
			local base = encoding.yamlDecode(baseStr)
			local patch = encoding.yamlDecode(patchStr)
			local result, err = utils.merge(base, patch)
			values["items"] = result["metadata"]["finalizers"]
`)

			resp, err := NewHelm(dir).Render(svc, mapper)
			Expect(err).NotTo(HaveOccurred())
			Expect(len(resp)).To(Equal(3))
			var ns unstructured.Unstructured
			for _, i := range resp {
				if i.GetName() == "result" {
					ns = i
				}
			}
			Expect(ns.GetFinalizers()).To(HaveExactElements("a", "b", "c"))

		})

		It("should successfully read lua folder", func() {
			// check lua script when throw error
			dir := filepath.Join("..", "..", "..", "test", "helm", "lua-merge-empty")

			svc.Helm = &console.ServiceDeploymentForAgent_Helm{
				IgnoreHooks: lo.ToPtr(false),
			}

			svc.Helm.LuaFolder = lo.ToPtr("lua")

			resp, err := NewHelm(dir).Render(svc, mapper)
			Expect(err).NotTo(HaveOccurred())
			Expect(len(resp)).To(Equal(3))
			var ns unstructured.Unstructured
			for _, i := range resp {
				if i.GetName() == "result" {
					ns = i
				}
			}
			Expect(ns.GetFinalizers()).To(HaveExactElements("a", "b", "c"))

		})
	})
})
