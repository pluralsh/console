package test

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/wait"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

const (
	// Set to a correct agent id.
	agentId = 3
	//kasK8sUrl = "https://gdk.test:3443/-/k8s-proxy/"
	kasK8sUrl         = "http://gdk.test:8154/-/k8s-proxy"
	concurrency       = 1
	requestsPerThread = 100
	delay             = 100 * time.Millisecond
)

func TestLoadTest(t *testing.T) {
	t.SkipNow()
	cfg := &rest.Config{
		Host:        kasK8sUrl,
		BearerToken: fmt.Sprintf("ci:%d:token", agentId),
		QPS:         -1,
		Burst:       -1,
	}
	c, err := kubernetes.NewForConfig(cfg)
	require.NoError(t, err)
	pods := c.CoreV1().Pods(corev1.NamespaceAll)
	var wg wait.Group
	for g := 0; g < concurrency; g++ {
		wg.Start(func() {
			for i := 0; i < requestsPerThread; i++ {
				_, err := pods.List(context.Background(), metav1.ListOptions{})
				//w, err := pods.Watch(context.Background(), metav1.ListOptions{})
				if err != nil {
					//fmt.Printf("%v Error: %v\n", time.Now(), err)
					time.Sleep(delay)
					continue
				}
				time.Sleep(delay)
				//for e := range w.ResultChan() {
				//	_ = e
				//}
			}
		})
	}
	wg.Wait()
}
