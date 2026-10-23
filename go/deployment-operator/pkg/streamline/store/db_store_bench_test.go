package store_test

import (
	"context"
	"fmt"
	"testing"

	"github.com/stretchr/testify/require"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"

	"github.com/pluralsh/console/go/deployment-operator/pkg/streamline/api"
	"github.com/pluralsh/console/go/deployment-operator/pkg/streamline/store"
)

const (
	benchApps          = 3000
	benchFailingEvery  = 50 // 2% of apps are failing
	benchManagedEvery  = 10
	benchConfigObjects = 8000
)

func benchObject(gvk schema.GroupVersionKind, uid, namespace, name string, owner *unstructured.Unstructured, status map[string]any) unstructured.Unstructured {
	u := unstructured.Unstructured{Object: map[string]any{}}
	u.SetGroupVersionKind(gvk)
	u.SetUID(types.UID(uid))
	u.SetNamespace(namespace)
	u.SetName(name)
	if owner != nil {
		u.SetOwnerReferences([]metav1.OwnerReference{{
			APIVersion: owner.GetAPIVersion(),
			Kind:       owner.GetKind(),
			Name:       owner.GetName(),
			UID:        owner.GetUID(),
		}})
	}
	if status != nil {
		_ = unstructured.SetNestedField(u.Object, status, "status")
	}
	return u
}

// benchCluster builds a ~20k object cluster: Deployment -> ReplicaSet -> 2 Pods per app plus
// healthy config objects. Every benchFailingEvery-th app is failing (ProgressDeadlineExceeded, failed pods).
func benchCluster() []unstructured.Unstructured {
	deploymentGVK := schema.GroupVersionKind{Group: "apps", Version: "v1", Kind: "Deployment"}
	replicaSetGVK := schema.GroupVersionKind{Group: "apps", Version: "v1", Kind: "ReplicaSet"}
	podGVK := schema.GroupVersionKind{Version: "v1", Kind: "Pod"}
	configMapGVK := schema.GroupVersionKind{Version: "v1", Kind: "ConfigMap"}

	objs := make([]unstructured.Unstructured, 0, benchApps*4+benchConfigObjects)
	for i := 0; i < benchApps; i++ {
		ns := fmt.Sprintf("ns-%d", i%100)
		name := fmt.Sprintf("app-%d", i)
		failing := i%benchFailingEvery == 0

		deployStatus := map[string]any{"replicas": int64(2), "readyReplicas": int64(2), "availableReplicas": int64(2)}
		podPhase := "Running"
		if failing {
			deployStatus = map[string]any{
				"replicas":      int64(2),
				"readyReplicas": int64(0),
				"conditions": []any{map[string]any{
					"type": "Progressing", "status": "False", "reason": "ProgressDeadlineExceeded",
				}},
			}
			podPhase = "Failed"
		}

		deploy := benchObject(deploymentGVK, "d-"+name, ns, name, nil, deployStatus)
		if i%benchManagedEvery == 0 {
			deploy.SetAnnotations(map[string]string{"config.k8s.io/owning-inventory": fmt.Sprintf("svc-%d", i%50)})
		}
		deploy.Object["spec"] = map[string]any{"replicas": int64(2)}
		rs := benchObject(replicaSetGVK, "rs-"+name, ns, name+"-rs", &deploy, nil)
		objs = append(objs, deploy, rs)
		for p := 0; p < 2; p++ {
			pod := benchObject(podGVK, fmt.Sprintf("p-%s-%d", name, p), ns, fmt.Sprintf("%s-rs-%d", name, p), &rs,
				map[string]any{"phase": podPhase})
			_ = unstructured.SetNestedField(pod.Object, "node-1", "spec", "nodeName")
			objs = append(objs, pod)
		}
	}
	for i := 0; i < benchConfigObjects; i++ {
		objs = append(objs, benchObject(configMapGVK, fmt.Sprintf("cm-%d", i), fmt.Sprintf("ns-%d", i%100), fmt.Sprintf("cm-%d", i), nil, nil))
	}
	return objs
}

func newBenchStore(b *testing.B) store.Store {
	b.Helper()
	s, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
	require.NoError(b, err)
	return s
}

// BenchmarkPingInsights measures the ping read path: the cluster health score and the insight list.
func BenchmarkPingInsights(b *testing.B) {
	s := newBenchStore(b)
	defer func() { _ = s.Shutdown() }()
	require.NoError(b, s.SaveComponents(benchCluster()))

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		if _, err := s.GetHealthScore(); err != nil {
			b.Fatal(err)
		}
		if _, err := s.GetComponentInsights(); err != nil {
			b.Fatal(err)
		}
	}
}

// BenchmarkSaveComponent measures a single watch-event upsert, cycling through healthy and failing objects of all kinds.
func BenchmarkSaveComponent(b *testing.B) {
	s := newBenchStore(b)
	defer func() { _ = s.Shutdown() }()
	objs := benchCluster()
	require.NoError(b, s.SaveComponents(objs))

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		if err := s.SaveComponent(objs[i%len(objs)]); err != nil {
			b.Fatal(err)
		}
	}
}

// BenchmarkSaveComponents measures the bulk initial-list save.
func BenchmarkSaveComponents(b *testing.B) {
	objs := benchCluster()

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		b.StopTimer()
		s := newBenchStore(b)
		b.StartTimer()
		if err := s.SaveComponents(objs); err != nil {
			b.Fatal(err)
		}
		b.StopTimer()
		_ = s.Shutdown()
	}
}

// BenchmarkSaveUnsyncedComponents measures the save path used before manifests are applied.
func BenchmarkSaveUnsyncedComponents(b *testing.B) {
	objs := benchCluster()

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		b.StopTimer()
		s := newBenchStore(b)
		b.StartTimer()
		if err := s.SaveUnsyncedComponents(objs); err != nil {
			b.Fatal(err)
		}
		b.StopTimer()
		_ = s.Shutdown()
	}
}
