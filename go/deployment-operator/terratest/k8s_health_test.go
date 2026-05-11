package test

import (
	"testing"
	"time"

	"github.com/gruntwork-io/terratest/modules/k8s"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	appsv1 "k8s.io/api/apps/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/rand"
)

// Define test namespace and manifest paths
const (
	helloWorldFile = "manifests/hello-world.yaml"
	nginxFile      = "manifests/nginx.yaml"
	jobFile        = "manifests/job.yaml"
	statefulFile   = "manifests/statefulset.yaml"
)

func TestKubernetesHealthSuite(t *testing.T) {
	namespace := "test-" + rand.String(6)
	options := k8s.NewKubectlOptions("", "", namespace)

	// Deploy manifests
	defer k8s.KubectlDelete(t, options, helloWorldFile)
	defer k8s.KubectlDelete(t, options, nginxFile)
	defer k8s.KubectlDelete(t, options, jobFile)
	defer k8s.KubectlDelete(t, options, statefulFile)
	defer k8s.DeleteNamespace(t, options, namespace)

	k8s.CreateNamespace(t, options, namespace)
	k8s.KubectlApply(t, options, helloWorldFile)
	k8s.KubectlApply(t, options, nginxFile)
	k8s.KubectlApply(t, options, jobFile)
	k8s.KubectlApply(t, options, statefulFile)

	// --- Check Hello-World Pod ---
	t.Run("HelloWorldPod-"+rand.String(5), func(t *testing.T) {
		selector := metav1.ListOptions{LabelSelector: "app=hello-world"}
		k8s.WaitUntilNumPodsCreated(t, options, selector, 1, 60, 5*time.Second)
		pods := k8s.ListPods(t, options, selector)
		require.Len(t, pods, 1)
		k8s.WaitUntilPodAvailable(t, options, pods[0].Name, 60, 5*time.Second)

		logs := k8s.GetPodLogs(t, options, &pods[0], pods[0].Spec.Containers[0].Name)
		assert.Contains(t, logs, "started") // Adjust to your container output
	})

	// --- Check Nginx Deployment + Service ---
	t.Run("NginxDeploymentAndService-"+rand.String(5), func(t *testing.T) {
		selector := metav1.ListOptions{LabelSelector: "app=nginx"}
		k8s.WaitUntilNumPodsCreated(t, options, selector, 1, 60, 5*time.Second)
		pods := k8s.ListPods(t, options, selector)
		require.NotEmpty(t, pods)
		k8s.WaitUntilPodAvailable(t, options, pods[0].Name, 60, 5*time.Second)

		// Verify service exists
		service := k8s.GetService(t, options, "nginx-svc")
		assert.Equal(t, int32(80), service.Spec.Ports[0].Port)
	})

	// --- Check Job Completion ---
	t.Run("PingJob-"+rand.String(5), func(t *testing.T) {
		k8s.WaitUntilJobSucceed(t, options, "ping-nginx", 90, 5*time.Second)
		job := k8s.GetJob(t, options, "ping-nginx")
		assert.Equal(t, int32(1), job.Status.Succeeded)
	})

	// --- Check StatefulSet & Volume ---
	t.Run("StatefulSet-"+rand.String(5), func(t *testing.T) {
		ss := GetStatefulSet(t, options, "stateful-demo")
		assert.Equal(t, int32(1), *ss.Spec.Replicas)

		selector := metav1.ListOptions{LabelSelector: "app=stateful"}

		k8s.WaitUntilNumPodsCreated(t, options, selector, 1, 60, 5*time.Second)
		pods := k8s.ListPods(t, options, selector)
		require.Len(t, pods, 1)

		k8s.WaitUntilPodAvailable(t, options, pods[0].Name, 60, 5*time.Second)

		// Optional: verify data was written to volume
		cmd := []string{"cat", "/data/hello.txt"}
		output, err := k8s.RunKubectlAndGetOutputE(t, options, append([]string{"exec", pods[0].Name, "--"}, cmd...)...)
		require.NoError(t, err)
		assert.Contains(t, output, "hello")
	})
}

func GetStatefulSet(t *testing.T, options *k8s.KubectlOptions, name string) *appsv1.StatefulSet {
	clientset, err := k8s.GetKubernetesClientFromOptionsE(t, options)
	require.NoError(t, err)

	ss, err := clientset.AppsV1().StatefulSets(options.Namespace).Get(t.Context(), name, metav1.GetOptions{})
	require.NoError(t, err)
	return ss
}
