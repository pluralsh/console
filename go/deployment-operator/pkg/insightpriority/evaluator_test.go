package insightpriority_test

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/insightpriority"
	"github.com/pluralsh/console/go/deployment-operator/pkg/streamline/insights"
)

var now = time.Date(2026, 10, 9, 12, 0, 0, 0, time.UTC)

func newScript(t *testing.T, name string, precedence int, target v1alpha1.InsightTarget, source string) insightpriority.Script {
	t.Helper()
	script, err := insightpriority.NewScript(&v1alpha1.CustomInsightPriority{
		ObjectMeta: metav1.ObjectMeta{Namespace: "plrl-deploy-operator", Name: name},
		Spec:       v1alpha1.CustomInsightPrioritySpec{Target: target, Precedence: precedence, Script: source},
	})
	require.NoError(t, err)
	return script
}

func root(kind, namespace, name string, labels map[string]string) insights.Root {
	return insights.Root{
		UID: name, Group: "apps", Version: "v1", Kind: kind, Namespace: namespace, Name: name, Labels: labels,
		Criticality: insights.ScoreLow, CriticalityReason: "kind default",
	}
}

// setup returns an evaluator whose scripts are given by the fake run function, keyed by script source.
func setup(t *testing.T, scripts map[string]func(input map[string]any) (any, error), registered ...insightpriority.Script) (*insightpriority.Evaluator, *insightpriority.Registry) {
	t.Helper()
	registry := insightpriority.NewRegistry()
	for _, s := range registered {
		registry.Set(s)
	}
	evaluator := insightpriority.NewEvaluator(registry)
	insightpriority.SetRunFunc(evaluator, func(_ context.Context, source string, input any) (json.RawMessage, error) {
		raw, err := json.Marshal(input)
		require.NoError(t, err)
		var decoded map[string]any
		require.NoError(t, json.Unmarshal(raw, &decoded))

		out, err := scripts[source](decoded)
		if err != nil {
			return nil, err
		}
		return json.Marshal(out)
	})
	return evaluator, registry
}

func key(name string) types.NamespacedName {
	return types.NamespacedName{Namespace: "plrl-deploy-operator", Name: name}
}

func rowUIDs(input map[string]any) []string {
	var uids []string
	for _, r := range input["rows"].([]any) {
		uids = append(uids, r.(map[string]any)["uid"].(string))
	}
	return uids
}

func TestEvaluatorOverrides(t *testing.T) {
	critical := map[string]any{"priority": "CRITICAL", "reason": "payments"}

	t.Run("returns nothing without scripts", func(t *testing.T) {
		evaluator, _ := setup(t, nil)

		assert.Nil(t, evaluator.Overrides(context.Background(), []insights.Root{root("Deployment", "apps", "api", nil)}, insightpriority.Cluster{}, now))
	})

	t.Run("a script only sees the roots it targets", func(t *testing.T) {
		var seen []string
		script := newScript(t, "payments", 0, v1alpha1.InsightTarget{
			Kinds:      []v1alpha1.InsightTargetKind{{Group: "apps", Kind: "StatefulSet"}},
			Namespaces: []string{"payments"},
		}, "payments")
		evaluator, _ := setup(t, map[string]func(map[string]any) (any, error){
			"payments": func(input map[string]any) (any, error) {
				seen = rowUIDs(input)
				return map[string]any{"ledger": critical}, nil
			},
		}, script)

		overrides := evaluator.Overrides(context.Background(), []insights.Root{
			root("StatefulSet", "payments", "ledger", nil),
			root("StatefulSet", "other", "elsewhere", nil),
			root("Deployment", "payments", "api", nil),
		}, insightpriority.Cluster{}, now)

		assert.Equal(t, []string{"ledger"}, seen)
		assert.Equal(t, map[string]insights.Override{"ledger": {Priority: insights.PriorityCritical, Reason: "payments"}}, overrides)
	})

	t.Run("targets by label selector, and an empty target takes everything", func(t *testing.T) {
		var seen []string
		labelled := newScript(t, "core", 10, v1alpha1.InsightTarget{LabelSelector: &metav1.LabelSelector{MatchLabels: map[string]string{"tier": "core"}}}, "core")
		all := newScript(t, "catch-all", 0, v1alpha1.InsightTarget{}, "catch-all")
		evaluator, _ := setup(t, map[string]func(map[string]any) (any, error){
			"core":      func(map[string]any) (any, error) { return nil, nil },
			"catch-all": func(input map[string]any) (any, error) { seen = rowUIDs(input); return nil, nil },
		}, labelled, all)

		evaluator.Overrides(context.Background(), []insights.Root{
			root("Deployment", "apps", "api", map[string]string{"tier": "core"}),
			root("Deployment", "apps", "batch", nil),
		}, insightpriority.Cluster{}, now)

		assert.Equal(t, []string{"batch"}, seen, "the labelled root is owned by the higher precedence script")
	})

	t.Run("the highest precedence owns a root, ties go to the name, and the loser is told", func(t *testing.T) {
		var seenA, seenB []string
		a := newScript(t, "a", 5, v1alpha1.InsightTarget{}, "a")
		b := newScript(t, "b", 5, v1alpha1.InsightTarget{}, "b")
		evaluator, registry := setup(t, map[string]func(map[string]any) (any, error){
			"a": func(input map[string]any) (any, error) { seenA = rowUIDs(input); return nil, nil },
			"b": func(input map[string]any) (any, error) { seenB = rowUIDs(input); return nil, nil },
		}, b, a)

		evaluator.Overrides(context.Background(), []insights.Root{root("Deployment", "apps", "api", nil)}, insightpriority.Cluster{}, now)

		assert.Equal(t, []string{"api"}, seenA)
		assert.Empty(t, seenB, "scripts are not chained")
		result, ok := registry.Result(key("b"))
		require.True(t, ok)
		assert.Equal(t, []types.NamespacedName{key("a")}, result.LostTo)
	})

	t.Run("annotated roots never reach a script", func(t *testing.T) {
		var seen []string
		script := newScript(t, "all", 0, v1alpha1.InsightTarget{}, "all")
		evaluator, _ := setup(t, map[string]func(map[string]any) (any, error){
			"all": func(input map[string]any) (any, error) { seen = rowUIDs(input); return nil, nil },
		}, script)
		pinned := root("Deployment", "apps", "pinned", nil)
		pinned.PriorityAnnotation = "LOW"

		evaluator.Overrides(context.Background(), []insights.Root{pinned, root("Deployment", "apps", "api", nil)}, insightpriority.Cluster{}, now)

		assert.Equal(t, []string{"api"}, seen)
	})

	t.Run("rows left out keep the built-in priority and IGNORE is counted", func(t *testing.T) {
		script := newScript(t, "all", 0, v1alpha1.InsightTarget{}, "all")
		evaluator, registry := setup(t, map[string]func(map[string]any) (any, error){
			"all": func(map[string]any) (any, error) {
				return map[string]any{"a": critical, "b": map[string]any{"priority": "ignore"}}, nil
			},
		}, script)

		overrides := evaluator.Overrides(context.Background(), []insights.Root{
			root("Deployment", "apps", "a", nil), root("Deployment", "apps", "b", nil), root("Deployment", "apps", "c", nil),
		}, insightpriority.Cluster{}, now)

		assert.Len(t, overrides, 2)
		assert.Equal(t, insights.PriorityIgnore, overrides["b"].Priority)
		result, _ := registry.Result(key("all"))
		assert.Equal(t, 3, result.Matched)
		assert.Equal(t, 1, result.Overridden)
		assert.Equal(t, 1, result.Ignored)
		assert.Empty(t, result.Err)
	})

	t.Run("a failing script only loses its own roots", func(t *testing.T) {
		failing := newScript(t, "failing", 10, v1alpha1.InsightTarget{Namespaces: []string{"broken"}}, "failing")
		working := newScript(t, "working", 0, v1alpha1.InsightTarget{Namespaces: []string{"fine"}}, "working")
		evaluator, registry := setup(t, map[string]func(map[string]any) (any, error){
			"failing": func(map[string]any) (any, error) { return nil, errors.New("KeyError") },
			"working": func(map[string]any) (any, error) { return map[string]any{"ok": critical}, nil },
		}, failing, working)

		overrides := evaluator.Overrides(context.Background(), []insights.Root{
			root("Deployment", "broken", "bad", nil), root("Deployment", "fine", "ok", nil),
		}, insightpriority.Cluster{}, now)

		assert.Equal(t, map[string]insights.Override{"ok": {Priority: insights.PriorityCritical, Reason: "payments"}}, overrides)
		result, _ := registry.Result(key("failing"))
		assert.Contains(t, result.Err, "KeyError")
		result, _ = registry.Result(key("working"))
		assert.Empty(t, result.Err)
	})

	t.Run("an unknown uid or priority is an error that discards the whole script", func(t *testing.T) {
		for name, output := range map[string]map[string]any{
			"unknown uid":      {"a": critical, "nope": critical},
			"invalid priority": {"a": critical, "b": map[string]any{"priority": "URGENT"}},
		} {
			t.Run(name, func(t *testing.T) {
				script := newScript(t, "all", 0, v1alpha1.InsightTarget{}, "all")
				evaluator, registry := setup(t, map[string]func(map[string]any) (any, error){
					"all": func(map[string]any) (any, error) { return output, nil },
				}, script)

				overrides := evaluator.Overrides(context.Background(), []insights.Root{root("Deployment", "apps", "a", nil), root("Deployment", "apps", "b", nil)}, insightpriority.Cluster{}, now)

				assert.Empty(t, overrides)
				result, _ := registry.Result(key("all"))
				assert.NotEmpty(t, result.Err)
				assert.NotContains(t, result.Err, "nope", "what the script returned must not end up in a status that namespace users can read")
				assert.NotContains(t, result.Err, "URGENT")
			})
		}
	})

	t.Run("an output that is not a dictionary is an error, null is not", func(t *testing.T) {
		script := newScript(t, "all", 0, v1alpha1.InsightTarget{}, "all")
		evaluator, registry := setup(t, map[string]func(map[string]any) (any, error){
			"all": func(map[string]any) (any, error) { return []string{"a"}, nil },
		}, script)

		evaluator.Overrides(context.Background(), []insights.Root{root("Deployment", "apps", "a", nil)}, insightpriority.Cluster{}, now)

		result, _ := registry.Result(key("all"))
		assert.NotEmpty(t, result.Err)
	})

	t.Run("the input carries the cluster, the failing roots and the built-in verdict of the row", func(t *testing.T) {
		var input map[string]any
		script := newScript(t, "all", 0, v1alpha1.InsightTarget{}, "all")
		evaluator, _ := setup(t, map[string]func(map[string]any) (any, error){
			"all": func(in map[string]any) (any, error) { input = in; return nil, nil },
		}, script)
		api := root("Deployment", "apps", "api", map[string]string{"app": "api"})
		api.DesiredReplicas, api.ReadyReplicas = new(int64(3)), new(int64(1))
		api.ServiceID = "svc-1"
		api.Descendants = map[string]insights.Descendants{"Pod": {Failed: 2}}

		evaluator.Overrides(context.Background(), []insights.Root{api, root("DaemonSet", "kube-system", "aws-node", nil)}, insightpriority.Cluster{Nodes: 12, Namespaces: 41}, now)

		assert.Equal(t, "2026-10-09T12:00:00Z", input["now"])
		cluster := input["cluster"].(map[string]any)
		assert.EqualValues(t, 12, cluster["nodes"])
		assert.Len(t, cluster["failing_roots"], 2)

		rows := input["rows"].([]any)
		require.Len(t, rows, 2)
		row := rows[0].(map[string]any)
		assert.Equal(t, "api", row["name"])
		assert.Equal(t, true, row["managed"])
		assert.EqualValues(t, 3, row["desired_replicas"])
		assert.EqualValues(t, 1, row["ready_replicas"])
		assert.Equal(t, "LOW", row["builtin_priority"])
		assert.Equal(t, map[string]any{"app": "api"}, row["labels"])
		assert.Equal(t, map[string]any{"Pod": map[string]any{"failed": float64(2), "pending": float64(0)}}, row["descendants"])
		assert.NotContains(t, row, "annotations")
	})

	t.Run("the status is only touched when the outcome changes", func(t *testing.T) {
		script := newScript(t, "all", 0, v1alpha1.InsightTarget{}, "all")
		evaluator, registry := setup(t, map[string]func(map[string]any) (any, error){
			"all": func(map[string]any) (any, error) { return map[string]any{"a": critical}, nil },
		}, script)
		roots := []insights.Root{root("Deployment", "apps", "a", nil)}

		evaluator.Overrides(context.Background(), roots, insightpriority.Cluster{}, now)
		require.Len(t, registry.Events(), 1)
		<-registry.Events()

		evaluator.Overrides(context.Background(), roots, insightpriority.Cluster{}, now.Add(2*time.Minute))
		assert.Empty(t, registry.Events(), "same outcome, nothing to report")
		result, _ := registry.Result(key("all"))
		assert.Equal(t, now, result.Time, "the time stays at the last change")

		evaluator.Overrides(context.Background(), append(roots, root("Deployment", "apps", "b", nil)), insightpriority.Cluster{}, now.Add(4*time.Minute))
		assert.Len(t, registry.Events(), 1)
	})
}

func TestTargets(t *testing.T) {
	r := root("Deployment", "apps", "api", map[string]string{"tier": "core", "env": "prod"})

	for name, tc := range map[string]struct {
		target v1alpha1.InsightTarget
		want   bool
	}{
		"empty target":                {v1alpha1.InsightTarget{}, true},
		"kind":                        {v1alpha1.InsightTarget{Kinds: []v1alpha1.InsightTargetKind{{Group: "apps", Kind: "Deployment"}}}, true},
		"kind with version":           {v1alpha1.InsightTarget{Kinds: []v1alpha1.InsightTargetKind{{Group: "apps", Version: "v1", Kind: "Deployment"}}}, true},
		"other version":               {v1alpha1.InsightTarget{Kinds: []v1alpha1.InsightTargetKind{{Group: "apps", Version: "v2", Kind: "Deployment"}}}, false},
		"other group":                 {v1alpha1.InsightTarget{Kinds: []v1alpha1.InsightTargetKind{{Group: "", Kind: "Deployment"}}}, false},
		"one of several kinds":        {v1alpha1.InsightTarget{Kinds: []v1alpha1.InsightTargetKind{{Group: "apps", Kind: "StatefulSet"}, {Group: "apps", Kind: "Deployment"}}}, true},
		"namespace":                   {v1alpha1.InsightTarget{Namespaces: []string{"x", "apps"}}, true},
		"other namespace":             {v1alpha1.InsightTarget{Namespaces: []string{"x"}}, false},
		"selector":                    {v1alpha1.InsightTarget{LabelSelector: &metav1.LabelSelector{MatchLabels: map[string]string{"tier": "core"}}}, true},
		"selector expression":         {v1alpha1.InsightTarget{LabelSelector: &metav1.LabelSelector{MatchExpressions: []metav1.LabelSelectorRequirement{{Key: "env", Operator: metav1.LabelSelectorOpIn, Values: []string{"dev"}}}}}, false},
		"every field has to match":    {v1alpha1.InsightTarget{Namespaces: []string{"apps"}, LabelSelector: &metav1.LabelSelector{MatchLabels: map[string]string{"tier": "edge"}}}, false},
		"cluster scoped only if open": {v1alpha1.InsightTarget{Namespaces: []string{"apps"}}, true},
	} {
		t.Run(name, func(t *testing.T) {
			script := newScript(t, "t", 0, tc.target, "")
			assert.Equal(t, tc.want, script.Matches(r))
		})
	}

	t.Run("an invalid selector is rejected", func(t *testing.T) {
		_, err := insightpriority.NewScript(&v1alpha1.CustomInsightPriority{Spec: v1alpha1.CustomInsightPrioritySpec{
			Target: v1alpha1.InsightTarget{LabelSelector: &metav1.LabelSelector{MatchExpressions: []metav1.LabelSelectorRequirement{{Key: "a", Operator: "Nope"}}}},
		}})
		require.Error(t, err)
	})

	t.Run("cluster scoped objects only match an open namespace target", func(t *testing.T) {
		node := root("Node", "", "node-1", nil)
		assert.True(t, newScript(t, "t", 0, v1alpha1.InsightTarget{}, "").Matches(node))
		assert.False(t, newScript(t, "t", 0, v1alpha1.InsightTarget{Namespaces: []string{"apps"}}, "").Matches(node))
	})
}
