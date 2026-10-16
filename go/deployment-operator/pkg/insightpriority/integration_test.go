package insightpriority_test

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/insightpriority"
	"github.com/pluralsh/console/go/deployment-operator/pkg/streamline/api"
	"github.com/pluralsh/console/go/deployment-operator/pkg/streamline/insights"
	"github.com/pluralsh/console/go/deployment-operator/pkg/streamline/store"
)

func failingWorkload(kind, namespace, name string, replicas int64, labels map[string]string) unstructured.Unstructured {
	obj := unstructured.Unstructured{Object: map[string]any{
		"apiVersion": "apps/v1", "kind": kind,
		"metadata": map[string]any{"name": name, "namespace": namespace, "uid": name, "generation": int64(1)},
		"spec":     map[string]any{"replicas": replicas},
		"status": map[string]any{
			"observedGeneration": int64(1), "readyReplicas": int64(0),
			"conditions": []any{map[string]any{"type": "Progressing", "status": "False", "reason": "ProgressDeadlineExceeded", "lastTransitionTime": time.Now().Add(-time.Hour).UTC().Format(time.RFC3339)}},
		},
	}}
	obj.SetLabels(labels)
	return obj
}

// A real store, the real Python runtime and the real rollup, as a ping runs them.
func TestScriptsDecideThePriorityOfRealRoots(t *testing.T) {
	ctx := context.Background()
	s, err := store.NewDatabaseStore(ctx, store.WithStorage(api.StorageFile))
	require.NoError(t, err)
	t.Cleanup(func() { _ = s.Shutdown() })

	require.NoError(t, s.SaveComponents([]unstructured.Unstructured{
		failingWorkload("Deployment", "payments", "checkout", 3, map[string]string{"tier": "core"}),
		failingWorkload("Deployment", "payments", "batch", 1, map[string]string{"tier": "batch"}),
		failingWorkload("Deployment", "sandbox", "playground", 1, nil),
	}))

	registry := insightpriority.NewRegistry()
	script, err := insightpriority.NewScript(&v1alpha1.CustomInsightPriority{
		ObjectMeta: metav1.ObjectMeta{Namespace: "plrl-deploy-operator", Name: "payments"},
		Spec: v1alpha1.CustomInsightPrioritySpec{
			Target: v1alpha1.InsightTarget{Namespaces: []string{"payments", "sandbox"}},
			Script: `
def evaluate(input):
    out = {}
    for r in input["rows"]:
        if r["namespace"] == "sandbox":
            out[r["uid"]] = {"priority": "IGNORE", "reason": "sandbox"}
        elif r["labels"].get("tier") == "core" and r["ready_replicas"] == 0:
            out[r["uid"]] = {"priority": "CRITICAL", "reason": "core service is down"}
    return out
`,
		},
	})
	require.NoError(t, err)
	require.NoError(t, insightpriority.Compile(ctx, script.Source))
	registry.Set(script)

	roots, err := s.GetFailingRoots()
	require.NoError(t, err)
	require.Len(t, roots, 3)

	now := time.Now()
	withScripts := insights.Summarize(roots, insightpriority.NewEvaluator(registry).Overrides(ctx, roots, insightpriority.Cluster{}, now), now)
	builtin := insights.Summarize(roots, nil, now)

	priorities := map[string]insights.Priority{}
	for _, e := range withScripts.Entries {
		priorities[e.Name] = e.Priority
	}
	assert.Equal(t, map[string]insights.Priority{"checkout": insights.PriorityCritical, "batch": insights.PriorityMedium}, priorities,
		"sandbox is ignored and batch keeps the built-in priority, a full outage of a LOW workload")
	assert.Less(t, withScripts.HealthScore, builtin.HealthScore, "the critical override costs more than the ignored sandbox saves")
	assert.Equal(t, int64(100-50-8), withScripts.HealthScore)

	result, ok := registry.Result(script.Key)
	require.True(t, ok)
	assert.Empty(t, result.Err)
	assert.Equal(t, 3, result.Matched)
	assert.Equal(t, 1, result.Overridden)
	assert.Equal(t, 1, result.Ignored)
}
