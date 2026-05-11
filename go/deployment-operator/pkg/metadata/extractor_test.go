package metadata

import (
	"path/filepath"
	"testing"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	console "github.com/pluralsh/console/go/client"
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/client-go/discovery"
	"k8s.io/client-go/kubernetes/scheme"
	cmdtesting "k8s.io/kubectl/pkg/cmd/testing"
	"k8s.io/kubectl/pkg/cmd/util"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/envtest"
	logf "sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/log/zap"

	"github.com/pluralsh/deployment-operator/pkg/manifests/template"
	"github.com/samber/lo"
)

// These tests use Ginkgo (BDD-style Go testing framework). Refer to
// http://onsi.github.io/ginkgo/ to learn more about Ginkgo.
var k8sClient client.Client
var utilFactory util.Factory
var mapper meta.RESTMapper
var testEnv *envtest.Environment
var discoveryClient *discovery.DiscoveryClient

func TestImageExtractor(t *testing.T) {
	RegisterFailHandler(Fail)
	RunSpecs(t, "Image Extractor Suite")
}

var _ = BeforeSuite(func() {
	logf.SetLogger(zap.New(zap.WriteTo(GinkgoWriter), zap.UseDevMode(true)))

	By("bootstrapping test environment")
	testEnv = &envtest.Environment{
		CRDDirectoryPaths:     []string{filepath.Join("..", "..", "test", "raw")},
		ErrorIfCRDPathMissing: true,
	}

	cfg, err := testEnv.Start()
	Expect(err).NotTo(HaveOccurred())
	Expect(cfg).NotTo(BeNil())

	k8sClient, err = client.New(cfg, client.Options{Scheme: scheme.Scheme})
	Expect(err).NotTo(HaveOccurred())
	Expect(k8sClient).NotTo(BeNil())

	discoveryClient, err = discovery.NewDiscoveryClientForConfig(cfg)
	Expect(err).NotTo(HaveOccurred())
	Expect(discoveryClient).NotTo(BeNil())

	utilFactory = cmdtesting.NewTestFactory()
	mapper, _ = utilFactory.ToRESTMapper()
})

var _ = AfterSuite(func() {
	By("tearing down the test environment")
	err := testEnv.Stop()
	Expect(err).NotTo(HaveOccurred())
})

var _ = Describe("Image Extractor with Raw Manifests", func() {
	var (
		svc *console.ServiceDeploymentForAgent
	)

	BeforeEach(func() {
		svc = &console.ServiceDeploymentForAgent{
			Namespace:     "default",
			Configuration: make([]*console.ServiceDeploymentForAgent_Configuration, 0),
		}
	})

	Context("ExtractImagesFromResource with raw manifests", func() {
		It("should extract images from raw pod manifest with templating", func() {
			// Use the raw directory (with liquid templating)
			dir := filepath.Join("..", "..", "test", "raw")

			// Set up configuration for templating
			svc.Configuration = []*console.ServiceDeploymentForAgent_Configuration{
				{
					Name:  "name",
					Value: "test-pod",
				},
			}
			svc.Cluster = &console.ServiceDeploymentForAgent_Cluster{
				ID:   "123",
				Name: "test",
			}
			// Templating is enabled by default

			// Process the raw manifest using NewRaw
			rawTemplate := template.NewRaw(dir)
			manifests, err := rawTemplate.Render(svc, mapper)
			Expect(err).NotTo(HaveOccurred())
			Expect(manifests).To(HaveLen(1))

			allImages := make([]string, 0, len(manifests))
			for _, resource := range manifests {
				allImages = append(allImages, ExtractImagesFromResource(&resource)...)
			}

			// Verify the extracted images
			Expect(allImages).To(HaveLen(1))
			Expect(allImages).To(ContainElement("nginx:1.14.2"))

			// Verify the pod name was templated correctly
			Expect(manifests[0].GetName()).To(Equal("test-pod"))
		})

		It("should handle deployment manifests", func() {
			// Use the rawTemplated directory with the deployment.yaml.liquid file
			dir := filepath.Join("..", "..", "test", "rawTemplated")

			// Set templating to false to skip liquid processing
			svc.Templated = lo.ToPtr(false)

			// Process the raw manifest using NewRaw
			rawTemplate := template.NewRaw(dir)
			manifests, err := rawTemplate.Render(svc, mapper)
			Expect(err).NotTo(HaveOccurred())
			Expect(manifests).To(HaveLen(5))

			// Find the deployment manifest
			var deploymentManifest *unstructured.Unstructured
			for _, manifest := range manifests {
				if manifest.GetKind() == "Deployment" {
					deploymentManifest = &manifest
					break
				}
			}
			Expect(deploymentManifest).NotTo(BeNil())

			// Extract images from the deployment manifest
			images := ExtractImagesFromResource(deploymentManifest)

			// Verify the extracted images
			Expect(images).To(HaveLen(3)) // nginx, redis, and busybox
			Expect(images).To(ContainElements("nginx:1.21", "redis:6.2-alpine", "busybox:1.35"))
		})
		It("should extract FQDNs from ingress and gateway manifests", func() {
			dir := filepath.Join("..", "..", "test", "rawTemplated")
			svc.Templated = lo.ToPtr(false)

			rawTemplate := template.NewRaw(dir)
			manifests, err := rawTemplate.Render(svc, mapper)
			Expect(err).NotTo(HaveOccurred())

			allFqdns := make([]string, 0, len(manifests))
			for _, manifest := range manifests {
				fqdns := ExtractFqdnsFromResource(&manifest)
				allFqdns = append(allFqdns, fqdns...)
			}

			// Verify extracted FQDNs from Ingress
			Expect(allFqdns).To(ContainElement("test.example.com"))
			Expect(allFqdns).To(ContainElement("www.test.example.com"))

			// Verify extracted FQDNs from HTTPRoute
			Expect(allFqdns).To(ContainElement("api.test.example.com"))
			Expect(allFqdns).To(ContainElement("api-v2.test.example.com"))

			// Verify extracted FQDNs from Gateway
			Expect(allFqdns).To(ContainElement("*.test.example.com"))
			Expect(allFqdns).To(ContainElement("gateway.test.example.com"))
		})
	})
})
