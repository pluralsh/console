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
	ctx := t.Context()

	// Deploy manifests
	defer func() { require.NoError(t, k8s.KubectlDeleteContextE(t, ctx, options, helloWorldFile)) }()
	defer func() { require.NoError(t, k8s.KubectlDeleteContextE(t, ctx, options, nginxFile)) }()
	defer func() { require.NoError(t, k8s.KubectlDeleteContextE(t, ctx, options, jobFile)) }()
	defer func() { require.NoError(t, k8s.KubectlDeleteContextE(t, ctx, options, statefulFile)) }()
	defer func() { require.NoError(t, k8s.DeleteNamespaceContextE(t, ctx, options, namespace)) }()

	require.NoError(t, k8s.CreateNamespaceContextE(t, ctx, options, namespace))
	require.NoError(t, k8s.KubectlApplyContextE(t, ctx, options, helloWorldFile))
	require.NoError(t, k8s.KubectlApplyContextE(t, ctx, options, nginxFile))
	require.NoError(t, k8s.KubectlApplyContextE(t, ctx, options, jobFile))
	require.NoError(t, k8s.KubectlApplyContextE(t, ctx, options, statefulFile))

	// --- Check Hello-World Pod ---
	t.Run("HelloWorldPod-"+rand.String(5), func(t *testing.T) {
		selector := metav1.ListOptions{LabelSelector: "app=hello-world"}
		require.NoError(t, k8s.WaitUntilNumPodsCreatedContextE(t, t.Context(), options, selector, 1, 60, 5*time.Second))
		pods, err := k8s.ListPodsContextE(t, t.Context(), options, selector)
		require.NoError(t, err)
		require.Len(t, pods, 1)
		k8s.WaitUntilPodAvailableContext(t, t.Context(), options, pods[0].Name, 60, 5*time.Second)

		logs, err := k8s.GetPodLogsContextE(t, t.Context(), options, &pods[0], pods[0].Spec.Containers[0].Name)
		require.NoError(t, err)
		assert.Contains(t, logs, "started") // Adjust to your container output
	})

	// --- Check Nginx Deployment + Service ---
	t.Run("NginxDeploymentAndService-"+rand.String(5), func(t *testing.T) {
		selector := metav1.ListOptions{LabelSelector: "app=nginx"}
		require.NoError(t, k8s.WaitUntilNumPodsCreatedContextE(t, t.Context(), options, selector, 1, 60, 5*time.Second))
		pods, err := k8s.ListPodsContextE(t, t.Context(), options, selector)
		require.NoError(t, err)
		require.NotEmpty(t, pods)
		k8s.WaitUntilPodAvailableContext(t, t.Context(), options, pods[0].Name, 60, 5*time.Second)

		// Verify service exists
		service, err := k8s.GetServiceContextE(t, t.Context(), options, "nginx-svc")
		require.NoError(t, err)
		assert.Equal(t, int32(80), service.Spec.Ports[0].Port)
	})

	// --- Check Job Completion ---
	t.Run("PingJob-"+rand.String(5), func(t *testing.T) {
		k8s.WaitUntilJobSucceedContext(t, t.Context(), options, "ping-nginx", 90, 5*time.Second)
		job, err := k8s.GetJobContextE(t, t.Context(), options, "ping-nginx")
		require.NoError(t, err)
		assert.Equal(t, int32(1), job.Status.Succeeded)
	})

	// --- Check StatefulSet & Volume ---
	t.Run("StatefulSet-"+rand.String(5), func(t *testing.T) {
		ss := GetStatefulSet(t, options, "stateful-demo")
		assert.Equal(t, int32(1), *ss.Spec.Replicas)

		selector := metav1.ListOptions{LabelSelector: "app=stateful"}

		require.NoError(t, k8s.WaitUntilNumPodsCreatedContextE(t, t.Context(), options, selector, 1, 60, 5*time.Second))
		pods, err := k8s.ListPodsContextE(t, t.Context(), options, selector)
		require.NoError(t, err)
		require.Len(t, pods, 1)

		k8s.WaitUntilPodAvailableContext(t, t.Context(), options, pods[0].Name, 60, 5*time.Second)

		// Optional: verify data was written to volume
		cmd := []string{"cat", "/data/hello.txt"}
		output, err := k8s.RunKubectlAndGetOutputContextE(t, t.Context(), options, append([]string{"exec", pods[0].Name, "--"}, cmd...)...)
		require.NoError(t, err)
		assert.Contains(t, output, "hello")
	})
}

func GetStatefulSet(t *testing.T, options *k8s.KubectlOptions, name string) *appsv1.StatefulSet {
	clientset, err := k8s.GetKubernetesClientFromOptionsContextE(t, t.Context(), options)
	require.NoError(t, err)

	ss, err := clientset.AppsV1().StatefulSets(options.Namespace).Get(t.Context(), name, metav1.GetOptions{})
	require.NoError(t, err)
	return ss
}
