package store_test

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"github.com/samber/lo"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"zombiezen.com/go/sqlite"
	"zombiezen.com/go/sqlite/sqlitex"

	"github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/streamline/api"
	"github.com/pluralsh/console/go/deployment-operator/pkg/streamline/insights"
	"github.com/pluralsh/console/go/deployment-operator/pkg/streamline/store"
)

func newTestStore(t *testing.T, options ...store.Option) store.Store {
	t.Helper()
	s, err := store.NewDatabaseStore(context.Background(), append([]store.Option{store.WithStorage(api.StorageFile)}, options...)...)
	require.NoError(t, err)
	t.Cleanup(func() { _ = s.Shutdown() })
	return s
}

func rootNames(t *testing.T, s store.Store) []string {
	t.Helper()
	roots, err := s.GetFailingRoots()
	require.NoError(t, err)
	return lo.Map(roots, func(r insights.Root, _ int) string { return r.Name })
}

func TestFailingRoots(t *testing.T) {
	t.Run("a cron job is reported only while its newest job failed", func(t *testing.T) {
		s := newTestStore(t)
		now := time.Now().Unix()
		save := func(c client.ComponentChildAttributes, created int64) {
			require.NoError(t, s.SaveComponentAttributes(c, nil, created, nil))
		}

		save(createComponentAttributes("nightly", nil, WithAttributesKind("CronJob"), WithAttributesState(client.ComponentStatePending), WithAttributesName("nightly")), now-7200)
		save(createComponentAttributes("nightly-1", new("nightly"), WithAttributesKind("Job"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("nightly-1")), now-3600)
		save(createComponentAttributes("nightly-2", new("nightly"), WithAttributesKind("Job"), WithAttributesState(client.ComponentStateRunning), WithAttributesName("nightly-2")), now-60)

		assert.Empty(t, rootNames(t, s), "a later successful job means the cron job recovered")

		save(createComponentAttributes("nightly-2", new("nightly"), WithAttributesKind("Job"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("nightly-2")), now-60)

		assert.ElementsMatch(t, []string{"nightly"}, rootNames(t, s))
	})

	t.Run("a failed node is reported only after five minutes", func(t *testing.T) {
		s := newTestStore(t)

		require.NoError(t, s.SaveComponentAttributes(createComponentAttributes("node-1", nil, WithAttributesKind("Node"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("node-1"))))
		assert.Empty(t, rootNames(t, s), "the node just failed")

		node := unstructured.Unstructured{Object: map[string]any{
			"apiVersion": "v1", "kind": "Node",
			"metadata": map[string]any{"name": "node-2", "uid": "node-2"},
			"status": map[string]any{"conditions": []any{map[string]any{
				"type": "Ready", "status": "False", "lastTransitionTime": time.Now().Add(-10 * time.Minute).UTC().Format(time.RFC3339),
			}}},
		}}
		require.NoError(t, s.SaveComponent(node))

		assert.ElementsMatch(t, []string{"node-2"}, rootNames(t, s))
	})

	t.Run("a failure too deep to reach its root is ignored", func(t *testing.T) {
		s := newTestStore(t)

		require.NoError(t, s.SaveComponentAttributes(createComponentAttributes("a", nil, WithAttributesKind("Widget"), WithAttributesState(client.ComponentStateRunning), WithAttributesName("a"))))
		parent := "a"
		for _, name := range []string{"b", "c", "d", "e"} {
			require.NoError(t, s.SaveComponentAttributes(createComponentAttributes(name, new(parent), WithAttributesKind("Widget"), WithAttributesState(client.ComponentStateRunning), WithAttributesName(name))))
			parent = name
		}
		require.NoError(t, s.SaveComponentAttributes(createComponentAttributes("f", new(parent), WithAttributesKind("Widget"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("f"))))

		assert.Empty(t, rootNames(t, s))
	})

	t.Run("a root inherits the service of its nearest owner", func(t *testing.T) {
		s := newTestStore(t)

		require.NoError(t, s.SaveComponentAttributes(createComponentAttributes("operator-cr", nil, WithAttributesKind("Widget"), WithAttributesState(client.ComponentStateRunning), WithAttributesName("operator-cr")), nil, nil, "svc-1"))
		require.NoError(t, s.SaveComponentAttributes(createComponentAttributes("created", new("operator-cr"), WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("created"))))

		roots, err := s.GetFailingRoots()
		require.NoError(t, err)
		require.Len(t, roots, 1)
		assert.Equal(t, "svc-1", roots[0].ServiceID)
	})

	t.Run("replica counts and priority attributes are read from the object", func(t *testing.T) {
		s := newTestStore(t)

		saveProgressingDeployment(t, s, "api", 5, 1)
		require.NoError(t, s.SaveComponentAttributes(createComponentAttributes("api-pod", new("api"), WithAttributesKind("Pod"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("api-pod"))))

		roots, err := s.GetFailingRoots()
		require.NoError(t, err)
		require.Len(t, roots, 1)
		assert.Equal(t, int64(5), *roots[0].DesiredReplicas)
		assert.Equal(t, int64(1), *roots[0].ReadyReplicas)
	})
}

func TestFailingRootsEdgeCases(t *testing.T) {
	t.Run("an object served under several versions is one root", func(t *testing.T) {
		s := newTestStore(t)
		for _, version := range []string{"v1", "v2"} {
			obj := unstructured.Unstructured{Object: map[string]any{
				"apiVersion": "autoscaling/" + version, "kind": "HorizontalPodAutoscaler",
				"metadata": map[string]any{"name": "web", "namespace": "apps", "uid": "hpa-uid"},
			}}
			require.NoError(t, s.SaveComponent(obj))
		}
		for _, version := range []string{"v1", "v2"} {
			require.NoError(t, s.SaveComponentAttributes(client.ComponentChildAttributes{
				UID: "hpa-uid", Group: new("autoscaling"), Version: version, Kind: "HorizontalPodAutoscaler",
				Namespace: new("apps"), Name: "web", State: new(client.ComponentStateFailed),
			}))
		}

		roots, err := s.GetFailingRoots()
		require.NoError(t, err)
		assert.Len(t, roots, 1)

		score, err := s.GetHealthScore()
		require.NoError(t, err)
		assert.Equal(t, int64(98), score, "one penalty, not one per served version")
	})

	t.Run("a static pod does not roll up to its node", func(t *testing.T) {
		s := newTestStore(t)
		require.NoError(t, s.SaveComponentAttributes(createComponentAttributes("node-1", nil, WithAttributesKind("Node"), WithAttributesState(client.ComponentStateRunning), WithAttributesName("node-1"))))
		require.NoError(t, s.SaveComponentAttributes(createComponentAttributes("etcd", new("node-1"), WithAttributesKind("Pod"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("etcd-node-1"), WithAttributesNamespace("kube-system"))))

		roots, err := s.GetFailingRoots()
		require.NoError(t, err)
		require.Len(t, roots, 1)
		assert.Equal(t, "etcd-node-1", roots[0].Name)
		assert.Equal(t, insights.ScoreHigh, roots[0].Criticality, "classified by its namespace even though the pod was running when it was stored")
	})

	t.Run("a healthy owner of any kind can be pinned by annotation", func(t *testing.T) {
		s := newTestStore(t)
		rollout := unstructured.Unstructured{Object: map[string]any{
			"apiVersion": "argoproj.io/v1alpha1", "kind": "Rollout",
			"metadata": map[string]any{"name": "web", "namespace": "apps", "uid": "rollout", "annotations": map[string]any{insights.AnnotationPriority: "IGNORE"}},
		}}
		require.NoError(t, s.SaveComponent(rollout))
		require.NoError(t, s.SaveComponentAttributes(createComponentAttributes("rs", new("rollout"), WithAttributesKind("ReplicaSet"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("web-rs"))))

		roots, err := s.GetFailingRoots()
		require.NoError(t, err)
		require.Len(t, roots, 1)
		assert.Equal(t, "IGNORE", roots[0].PriorityAnnotation)
	})
}

func TestFailingRootDescendants(t *testing.T) {
	s := newTestStore(t)

	api := deploymentExceedingDeadline("api", time.Now(), nil)
	api.SetLabels(map[string]string{"tier": "core"})
	require.NoError(t, s.SaveComponent(api))
	for _, c := range []struct {
		uid   string
		kind  string
		state client.ComponentState
	}{
		{"api-rs", "ReplicaSet", client.ComponentStatePending},
		{"api-pod-1", "Pod", client.ComponentStateFailed},
		{"api-pod-2", "Pod", client.ComponentStateFailed},
		{"api-pod-3", "Pod", client.ComponentStatePending},
		{"api-pod-4", "Pod", client.ComponentStateRunning},
	} {
		parent := "api"
		if c.kind == "Pod" {
			parent = "api-rs"
		}
		require.NoError(t, s.SaveComponentAttributes(createComponentAttributes(c.uid, new(parent), WithAttributesKind(c.kind), WithAttributesState(c.state), WithAttributesName(c.uid))))
	}

	roots, err := s.GetFailingRoots()
	require.NoError(t, err)
	require.Len(t, roots, 1)
	assert.Equal(t, "failed", roots[0].State)
	assert.Equal(t, map[string]string{"tier": "core"}, roots[0].Labels)
	assert.Equal(t, map[string]insights.Descendants{
		"ReplicaSet": {Pending: 1},
		"Pod":        {Failed: 2, Pending: 1},
	}, roots[0].Descendants)
}

func TestFailingRootDescendantsServedUnderSeveralVersions(t *testing.T) {
	s := newTestStore(t)
	require.NoError(t, s.SaveComponent(deploymentExceedingDeadline("api", time.Now(), nil)))

	// the same objects are watched through two API versions, and so are stored twice
	for _, version := range []string{"v1", "v2"} {
		for _, name := range []string{"api-rs", "api-pod"} {
			parent, kind := "api", "ReplicaSet"
			if name == "api-pod" {
				parent, kind = "api-rs", "Pod"
			}
			require.NoError(t, s.SaveComponentAttributes(client.ComponentChildAttributes{
				UID: name, ParentUID: new(parent), Group: new("example.com"), Version: version, Kind: kind,
				Namespace: new(testNamespace), Name: name, State: new(client.ComponentStateFailed),
			}))
		}
	}

	roots, err := s.GetFailingRoots()
	require.NoError(t, err)
	require.Len(t, roots, 1)
	assert.Equal(t, map[string]insights.Descendants{
		"ReplicaSet": {Failed: 1},
		"Pod":        {Failed: 1},
	}, roots[0].Descendants)
}

func TestFailingRootDescendantsWithVersionsOwnedSeparately(t *testing.T) {
	s := newTestStore(t)
	require.NoError(t, s.SaveComponent(deploymentExceedingDeadline("api", time.Now(), nil)))

	// only the v2 row of the pod is attached to its owner, the v1 row has no parent
	for _, c := range []struct{ version, parent string }{{"v1", ""}, {"v2", "api"}} {
		attrs := client.ComponentChildAttributes{
			UID: "api-pod", Group: new("example.com"), Version: c.version, Kind: "Pod",
			Namespace: new(testNamespace), Name: "api-pod", State: new(client.ComponentStateFailed),
		}
		if c.parent != "" {
			attrs.ParentUID = new(c.parent)
		}
		require.NoError(t, s.SaveComponentAttributes(attrs))
	}

	roots, err := s.GetFailingRoots()
	require.NoError(t, err)
	require.NotEmpty(t, roots)
	for _, r := range roots {
		if r.Name == "api" {
			assert.Equal(t, map[string]insights.Descendants{"Pod": {Failed: 1}}, r.Descendants)
			return
		}
	}
	t.Fatal("the deployment is not reported as a root")
}

func TestFailingRootState(t *testing.T) {
	t.Run("a healthy owner of a failed object is pending", func(t *testing.T) {
		s := newTestStore(t)
		require.NoError(t, s.SaveComponentAttributes(createComponentAttributes("api", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateRunning), WithAttributesName("api"))))
		require.NoError(t, s.SaveComponentAttributes(createComponentAttributes("api-pod", new("api"), WithAttributesKind("Pod"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("api-pod"))))

		roots, err := s.GetFailingRoots()
		require.NoError(t, err)
		require.Len(t, roots, 1)
		assert.Equal(t, "pending", roots[0].State)
	})
}

func TestPriorityAnnotationLookup(t *testing.T) {
	s := newTestStore(t)
	require.NoError(t, s.SaveComponent(deploymentExceedingDeadline("api", time.Now(), map[string]any{insights.AnnotationPriority: "ignore"})))

	annotation, found, err := s.GetPriorityAnnotation("api")
	require.NoError(t, err)
	assert.True(t, found)
	assert.Equal(t, "IGNORE", annotation)

	_, found, err = s.GetPriorityAnnotation("missing")
	require.NoError(t, err)
	assert.False(t, found)
}

func deploymentExceedingDeadline(name string, since time.Time, annotations map[string]any) unstructured.Unstructured {
	meta := map[string]any{"name": name, "namespace": testNamespace, "uid": name, "generation": int64(1)}
	if annotations != nil {
		meta["annotations"] = annotations
	}
	return unstructured.Unstructured{Object: map[string]any{
		"apiVersion": "apps/v1", "kind": "Deployment", "metadata": meta,
		"spec": map[string]any{"replicas": int64(1)},
		"status": map[string]any{
			"observedGeneration": int64(1),
			"conditions": []any{map[string]any{
				"type": "Progressing", "status": "False", "reason": "ProgressDeadlineExceeded", "lastTransitionTime": since.UTC().Format(time.RFC3339),
			}},
		},
	}}
}

func TestFailingSince(t *testing.T) {
	t.Run("keeps the earliest failing time while the component keeps failing and resets on recovery", func(t *testing.T) {
		s := newTestStore(t)
		since := time.Now().Add(-3 * time.Hour).Truncate(time.Second)

		require.NoError(t, s.SaveComponent(deploymentExceedingDeadline("api", since, nil)))
		require.NoError(t, s.SaveComponent(deploymentExceedingDeadline("api", time.Now(), nil)))

		roots, err := s.GetFailingRoots()
		require.NoError(t, err)
		require.Len(t, roots, 1)
		assert.Equal(t, since.Unix(), roots[0].FailingSince.Unix())

		healthy := deploymentExceedingDeadline("api", since, nil)
		healthy.Object["status"] = map[string]any{"observedGeneration": int64(1), "replicas": int64(1), "updatedReplicas": int64(1), "availableReplicas": int64(1), "readyReplicas": int64(1)}
		require.NoError(t, s.SaveComponent(healthy))
		assert.Empty(t, rootNames(t, s))

		require.NoError(t, s.SaveComponent(deploymentExceedingDeadline("api", time.Now(), nil)))
		roots, err = s.GetFailingRoots()
		require.NoError(t, err)
		require.Len(t, roots, 1)
		assert.WithinDuration(t, time.Now(), roots[0].FailingSince, 5*time.Second, "a new failure starts from its own condition time")
	})

	t.Run("a replacement with the same name and another uid starts its own failing time", func(t *testing.T) {
		s := newTestStore(t)
		since := time.Now().Add(-3 * time.Hour).Truncate(time.Second)
		require.NoError(t, s.SaveComponent(deploymentExceedingDeadline("api", since, nil)))

		replacement := deploymentExceedingDeadline("api", time.Now(), nil)
		require.NoError(t, unstructured.SetNestedField(replacement.Object, "api-replacement", "metadata", "uid"))
		require.NoError(t, s.SaveComponent(replacement))

		roots, err := s.GetFailingRoots()
		require.NoError(t, err)
		require.Len(t, roots, 1)
		assert.WithinDuration(t, time.Now(), roots[0].FailingSince, 5*time.Second, "the replaced object's failing time is not inherited")
	})
}

func TestInsightPriorityAnnotation(t *testing.T) {
	t.Run("is stored and ignored roots drop out of the score", func(t *testing.T) {
		s := newTestStore(t)

		require.NoError(t, s.SaveComponent(deploymentExceedingDeadline("coredns", time.Now(), map[string]any{insights.AnnotationPriority: "ignore"})))

		roots, err := s.GetFailingRoots()
		require.NoError(t, err)
		require.Len(t, roots, 1)
		assert.Equal(t, "IGNORE", roots[0].PriorityAnnotation)

		score, err := s.GetHealthScore()
		require.NoError(t, err)
		assert.Equal(t, int64(100), score)

		list, err := s.GetComponentInsights()
		require.NoError(t, err)
		assert.Nil(t, list)
	})
}

func TestComponentOwnership(t *testing.T) {
	// the inventory is trusted only together with the tracking identifier of the object it was written for
	inventory := func(serviceID string) map[string]any {
		return map[string]any{
			"config.k8s.io/owning-inventory":    serviceID,
			"config.k8s.io/tracking-identifier": "apps/v1/Deployment/" + testNamespace + "/api",
		}
	}

	t.Run("a real loss of the inventory annotation clears the service", func(t *testing.T) {
		s := newTestStore(t)

		require.NoError(t, s.SaveComponent(deploymentExceedingDeadline("api", time.Now(), inventory("svc-1"))))
		roots, err := s.GetFailingRoots()
		require.NoError(t, err)
		require.Equal(t, "svc-1", roots[0].ServiceID)

		require.NoError(t, s.SaveComponent(deploymentExceedingDeadline("api", time.Now(), nil)))
		roots, err = s.GetFailingRoots()
		require.NoError(t, err)
		require.Len(t, roots, 1)
		assert.Empty(t, roots[0].ServiceID)
	})

	t.Run("a different inventory replaces the service", func(t *testing.T) {
		s := newTestStore(t)

		require.NoError(t, s.SaveComponent(deploymentExceedingDeadline("api", time.Now(), inventory("svc-1"))))
		require.NoError(t, s.SaveComponent(deploymentExceedingDeadline("api", time.Now(), inventory("svc-2"))))

		roots, err := s.GetFailingRoots()
		require.NoError(t, err)
		require.Len(t, roots, 1)
		assert.Equal(t, "svc-2", roots[0].ServiceID)
	})
}

func TestSchemaVersion(t *testing.T) {
	t.Run("rebuilds the component table of an outdated database", func(t *testing.T) {
		path := filepath.Join(t.TempDir(), "store.db")
		first := newTestStore(t, store.WithFilePath(path))
		require.NoError(t, first.SaveComponentAttributes(createComponentAttributes("api", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("api"))))
		require.Equal(t, []string{"api"}, rootNames(t, first))

		conn, err := sqlite.OpenConn(path, sqlite.OpenReadWrite)
		require.NoError(t, err)
		require.NoError(t, sqlitex.ExecuteTransient(conn, `PRAGMA user_version = 1`, nil))
		require.NoError(t, conn.Close())

		second := newTestStore(t, store.WithFilePath(path))

		assert.Empty(t, rootNames(t, second), "the cache is rebuilt from the informers")
		require.NoError(t, second.SaveComponentAttributes(createComponentAttributes("api", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("api"))))
		assert.Equal(t, []string{"api"}, rootNames(t, second))
	})
}
