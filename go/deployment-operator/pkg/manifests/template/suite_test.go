/*
Copyright 2023.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package template

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"testing"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/client-go/discovery"
	"k8s.io/client-go/kubernetes/scheme"
	cmdtesting "k8s.io/kubectl/pkg/cmd/testing"
	"k8s.io/kubectl/pkg/cmd/util"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/envtest"
	logf "sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/log/zap"

	cache "github.com/pluralsh/console/go/deployment-operator/pkg/cache/discovery"
)

// These tests use Ginkgo (BDD-style Go testing framework). Refer to
// http://onsi.github.io/ginkgo/ to learn more about Ginkgo.
var k8sClient client.Client
var utilFactory util.Factory
var mapper meta.RESTMapper
var testEnv *envtest.Environment
var discoveryClient *discovery.DiscoveryClient
var originalKubeconfig string
var hadKubeconfig bool
var testKubeconfig string

func TestControllers(t *testing.T) {
	RegisterFailHandler(Fail)
	RunSpecs(t, "Template Suite")
}

var _ = BeforeSuite(func() {
	// Helm's EnvSettings follows KUBECONFIG. Point it at each spec's local
	// /version endpoint instead of allowing the developer's active cluster
	// configuration to leak into this suite.
	originalKubeconfig, hadKubeconfig = os.LookupEnv("KUBECONFIG")
	kubeconfig, err := os.CreateTemp("", "template-test-kubeconfig-*")
	Expect(err).NotTo(HaveOccurred())
	testKubeconfig = kubeconfig.Name()
	Expect(kubeconfig.Close()).To(Succeed())
	Expect(os.WriteFile(testKubeconfig, []byte(`apiVersion: v1
kind: Config
clusters:
- name: test
  cluster:
    server: http://127.0.0.1:8080
contexts:
- name: test
  context:
    cluster: test
    user: test
current-context: test
users:
- name: test
  user: {}
`), 0600)).To(Succeed())
	Expect(os.Setenv("KUBECONFIG", testKubeconfig)).To(Succeed())

	logf.SetLogger(zap.New(zap.WriteTo(GinkgoWriter), zap.UseDevMode(true)))

	By("bootstrapping test environment")
	testEnv = &envtest.Environment{
		CRDDirectoryPaths:     []string{filepath.Join("..", "..", "..", "test", "crd")},
		ErrorIfCRDPathMissing: true,
		BinaryAssetsDirectory: filepath.Join("..", "..", "bin", "k8s",
			fmt.Sprintf("1.28.3-%s-%s", runtime.GOOS, runtime.GOARCH)),
	}

	cfg, err := testEnv.Start()
	Expect(err).NotTo(HaveOccurred())
	Expect(cfg).NotTo(BeNil())

	k8sClient, err = client.New(cfg, client.Options{Scheme: scheme.Scheme})
	Expect(err).NotTo(HaveOccurred())
	Expect(k8sClient).NotTo(BeNil())

	discoveryClient, err = discovery.NewDiscoveryClientForConfig(cfg)
	Expect(err).NotTo(HaveOccurred())
	Expect(k8sClient).NotTo(BeNil())

	utilFactory = cmdtesting.NewTestFactory()
	mapper, _ = utilFactory.ToRESTMapper()

	cache.InitGlobalDiscoveryCache(discoveryClient, mapper)
	err = cache.NewDiscoveryManager(
		cache.WithCache(cache.GlobalCache()),
	).Start(context.Background())
	Expect(err).NotTo(HaveOccurred())
})

var _ = AfterSuite(func() {
	By("tearing down the test environment")
	err := testEnv.Stop()
	Expect(err).NotTo(HaveOccurred())
	Expect(os.Remove(testKubeconfig)).To(Succeed())
	if hadKubeconfig {
		Expect(os.Setenv("KUBECONFIG", originalKubeconfig)).To(Succeed())
	} else {
		Expect(os.Unsetenv("KUBECONFIG")).To(Succeed())
	}
})
