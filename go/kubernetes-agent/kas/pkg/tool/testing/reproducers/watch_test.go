package reproducers

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/cli-runtime/pkg/genericclioptions"
	"k8s.io/client-go/kubernetes"
)

func TestWatch(t *testing.T) {
	t.Skip()
	kubeConfigFlags := genericclioptions.NewConfigFlags(true)
	restConfig, err := kubeConfigFlags.ToRESTConfig()
	require.NoError(t, err)

	clientset, err := kubernetes.NewForConfig(restConfig)
	require.NoError(t, err)

	var timeout int64 = 5

	w, err := clientset.CoreV1().ConfigMaps(metav1.NamespaceAll).Watch(context.Background(), metav1.ListOptions{
		TimeoutSeconds: &timeout,
	})
	require.NoError(t, err)

	for e := range w.ResultChan() {
		o := e.Object.(metav1.Object)
		t.Logf("%s: %s %s", e.Type, o.GetNamespace(), o.GetName())
	}
}
