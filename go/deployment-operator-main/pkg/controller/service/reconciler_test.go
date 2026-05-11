package service_test

import (
	"context"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	pollycache "github.com/pluralsh/console/go/polly/cache"
	"github.com/pluralsh/deployment-operator/cmd/agent/args"
	"github.com/pluralsh/deployment-operator/pkg/cache"
	discoverycache "github.com/pluralsh/deployment-operator/pkg/cache/discovery"
	"github.com/pluralsh/deployment-operator/pkg/manifests/template"
	"github.com/pluralsh/deployment-operator/pkg/streamline"
	"github.com/pluralsh/deployment-operator/pkg/streamline/store"

	"github.com/gin-gonic/gin"
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
	"github.com/stretchr/testify/mock"
	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"

	"github.com/pluralsh/deployment-operator/pkg/controller/service"
	"github.com/pluralsh/deployment-operator/pkg/test/mocks"
)

var _ = Describe("Reconciler", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			namespace         = "default"
			serviceId         = "1"
			serviceName       = "test"
			clusterId         = "1"
			clusterName       = "cluster-test"
			operatorNamespace = "plrl-deploy-operator"
		)
		consoleService := &console.ServiceDeploymentForAgent{
			ID:        serviceId,
			Name:      serviceName,
			Namespace: namespace,
			Tarball:   lo.ToPtr("http://localhost:8081/ext/v1/digests"),
			Configuration: []*console.ServiceDeploymentForAgent_Configuration{
				{
					Name:  "name",
					Value: serviceName,
				},
			},
			Cluster: &console.ServiceDeploymentForAgent_Cluster{
				ID:   clusterId,
				Name: clusterName,
			},
			Revision: &console.ServiceDeploymentForAgent_Revision{
				ID: serviceId,
			},
			SyncConfig: &console.ServiceDeploymentForAgent_SyncConfig{
				DiffNormalizers: []*console.DiffNormalizerFragment{
					{
						Kind:         lo.ToPtr("Pod"),
						JSONPointers: []*string{lo.ToPtr("/spec/containers/0/image")},
						Backfill:     lo.ToPtr(true),
					},
				},
			},
		}
		ctx := context.Background()
		tarPath := filepath.Join("..", "..", "..", "test", "tarball", "test.tar.gz")

		r := gin.Default()
		r.GET("/ext/v1/digests", func(c *gin.Context) {
			res, err := os.ReadFile(tarPath)
			Expect(err).NotTo(HaveOccurred())
			c.String(http.StatusOK, string(res))
		})

		srv := &http.Server{
			Addr:    ":8081",
			Handler: r,
		}
		dir := ""
		BeforeEach(func() {
			var err error
			dir, err = os.MkdirTemp("", "test")
			cache.InitComponentShaCache(args.ComponentShaCacheTTL())
			Expect(err).NotTo(HaveOccurred())
			err = kClient.Create(ctx, &v1.Namespace{
				ObjectMeta: metav1.ObjectMeta{
					Name: operatorNamespace,
				},
			})
			if err != nil && !errors.IsAlreadyExists(err) {
				Expect(err).NotTo(HaveOccurred())
			}
			// Initializing the server in a goroutine so that
			// it won't block the graceful shutdown handling below
			go func() {
				if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
					Expect(err).NotTo(HaveOccurred())
				}
			}()
		})
		AfterEach(func() {
			err := os.RemoveAll(dir)
			if err != nil {
				return
			}
			Expect(kClient.Delete(ctx, &v1.Namespace{
				ObjectMeta: metav1.ObjectMeta{
					Name: operatorNamespace,
				},
			})).NotTo(HaveOccurred())
			// The context is used to inform the server it has 5 seconds to finish
			// the request it is currently handling
			ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
			defer cancel()
			if err := srv.Shutdown(ctx); err != nil {
				log.Fatal("Server forced to shutdown: ", err)
			}
		})

		It("should create NewServiceReconciler and apply service", func() {
			fakeConsoleClient := mocks.NewClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetCredentials").Return("", "")
			fakeConsoleClient.On("GetService", mock.Anything).Return(consoleService, nil)
			fakeConsoleClient.On("UpdateComponents", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.MatchedBy(func(metadata *console.ServiceMetadataAttributes) bool {
				return metadata == nil || (metadata != nil && metadata.Images != nil)
			})).Return(nil)
			fakeConsoleClient.On("UpdateServiceErrors", mock.Anything, mock.Anything).Return(nil)

			storeInstance, err := store.NewDatabaseStore(context.Background())
			Expect(err).NotTo(HaveOccurred())
			defer func(storeInstance store.Store) {
				err := storeInstance.Shutdown()
				if err != nil {
					log.Printf("unable to shutdown database store: %v", err)
				}
			}(storeInstance)
			streamline.InitGlobalStore(storeInstance)
			discoverycache.InitGlobalDiscoveryCache(discoveryClient, mapper)
			svcCache := pollycache.NewCache[console.ServiceDeploymentForAgent](time.Minute, func(id string) (*console.ServiceDeploymentForAgent, error) { return fakeConsoleClient.GetService(id) })

			reconciler, err := service.NewServiceReconciler(fakeConsoleClient, kClient, mapper, clientSet, dynamicClient, discoverycache.GlobalCache(), streamline.NewNamespaceCache(clientSet), svcCache, storeInstance, service.WithRestoreNamespace(namespace), service.WithConsoleURL("http://localhost:8081"))
			Expect(err).NotTo(HaveOccurred())
			_, err = reconciler.Reconcile(ctx, serviceId)
			Expect(err).NotTo(HaveOccurred())

			Expect(kClient.Get(ctx, types.NamespacedName{Name: serviceName, Namespace: namespace}, &v1.Pod{})).NotTo(HaveOccurred())
		})

		It("should extract images from raw manifests using ExtractImagesMetadata", func() {
			// Use the rawTemplated directory with the test manifest files
			dir := filepath.Join("..", "..", "..", "test", "rawTemplated")

			// Set up service configuration
			svc := &console.ServiceDeploymentForAgent{
				Namespace:     "default",
				Configuration: make([]*console.ServiceDeploymentForAgent_Configuration, 0),
				Templated:     lo.ToPtr(false), // Disable templating for rawTemplated files
			}

			// Process the raw manifests using NewRaw
			rawTemplate := template.NewRaw(dir)
			manifests, err := rawTemplate.Render(svc, mapper)
			Expect(err).NotTo(HaveOccurred())
			Expect(manifests).To(HaveLen(5))

			// Create a reconciler instance to access ExtractImagesMetadata
			fakeConsoleClient := mocks.NewClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetCredentials").Return("", "")
			storeInstance, err := store.NewDatabaseStore(context.Background())
			Expect(err).NotTo(HaveOccurred())
			defer func(storeInstance store.Store) {
				err := storeInstance.Shutdown()
				if err != nil {
					log.Printf("unable to shutdown database store: %v", err)
				}
			}(storeInstance)
			svcCache := pollycache.NewCache[console.ServiceDeploymentForAgent](time.Minute, func(id string) (*console.ServiceDeploymentForAgent, error) { return fakeConsoleClient.GetService(id) })

			reconciler, err := service.NewServiceReconciler(fakeConsoleClient, kClient, mapper, clientSet, dynamicClient, discoverycache.GlobalCache(), streamline.NewNamespaceCache(clientSet), svcCache, storeInstance, service.WithRestoreNamespace(namespace), service.WithConsoleURL("http://localhost:8081"))
			Expect(err).NotTo(HaveOccurred())

			// Extract metadata from the processed manifests
			metadata := reconciler.ExtractMetadata(manifests)

			// Verify the extracted metadata
			Expect(metadata).NotTo(BeNil())
			Expect(metadata.Images).NotTo(BeNil())
			Expect(len(metadata.Images)).To(Equal(4)) // nginx:1.14.2, nginx:1.21, redis:6.2-alpine, busybox:1.35

			// Verify specific images are present
			imageStrings := make([]string, len(metadata.Images))
			for i, img := range metadata.Images {
				imageStrings[i] = *img
			}

			Expect(imageStrings).To(ContainElement("nginx:1.14.2"))     // From pod.yaml.liquid
			Expect(imageStrings).To(ContainElement("nginx:1.21"))       // From deployment.yaml.liquid
			Expect(imageStrings).To(ContainElement("redis:6.2-alpine")) // From deployment.yaml.liquid
			Expect(imageStrings).To(ContainElement("busybox:1.35"))     // From deployment.yaml.liquid init container

			// Verifiy specific fqdns are present
			fqdnStrings := make([]string, len(metadata.Fqdns))
			for i, fqdn := range metadata.Fqdns {
				fqdnStrings[i] = *fqdn
			}

			// Verify extracted FQDNs from Ingress
			Expect(fqdnStrings).To(ContainElement("test.example.com"))
			Expect(fqdnStrings).To(ContainElement("www.test.example.com"))

			// Verify extracted FQDNs from HTTPRoute
			Expect(fqdnStrings).To(ContainElement("api.test.example.com"))
			Expect(fqdnStrings).To(ContainElement("api-v2.test.example.com"))

			// Verify extracted FQDNs from Gateway
			Expect(fqdnStrings).To(ContainElement("*.test.example.com"))
			Expect(fqdnStrings).To(ContainElement("gateway.test.example.com"))
		})

	})
})
