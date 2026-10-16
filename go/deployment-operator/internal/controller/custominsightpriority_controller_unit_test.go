package controller

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/tools/events"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/insightpriority"
	"github.com/pluralsh/console/go/deployment-operator/pkg/streamline/insights"
)

func TestCustomInsightPriorityReconciler(t *testing.T) {
	ctx := context.Background()
	key := types.NamespacedName{Namespace: "plrl-deploy-operator", Name: "payments"}
	validScript := "def evaluate(input):\n    return {r['uid']: {'priority': 'CRITICAL'} for r in input['rows']}\n"

	setup := func(t *testing.T, spec v1alpha1.CustomInsightPrioritySpec) (*CustomInsightPriorityReconciler, *events.FakeRecorder) {
		t.Helper()
		scheme := runtime.NewScheme()
		require.NoError(t, v1alpha1.AddToScheme(scheme))
		cr := &v1alpha1.CustomInsightPriority{ObjectMeta: metav1.ObjectMeta{Namespace: key.Namespace, Name: key.Name, Generation: 1}, Spec: spec}
		recorder := events.NewFakeRecorder(10)
		return &CustomInsightPriorityReconciler{
			Client:   fake.NewClientBuilder().WithScheme(scheme).WithObjects(cr).WithStatusSubresource(cr).Build(),
			Scheme:   scheme,
			Registry: insightpriority.NewRegistry(),
			Recorder: recorder,
		}, recorder
	}

	reconcile := func(t *testing.T, r *CustomInsightPriorityReconciler) *v1alpha1.CustomInsightPriority {
		t.Helper()
		_, err := r.Reconcile(ctx, ctrl.Request{NamespacedName: key})
		require.NoError(t, err)
		cr := &v1alpha1.CustomInsightPriority{}
		require.NoError(t, r.Get(ctx, key, cr))
		return cr
	}

	condition := func(cr *v1alpha1.CustomInsightPriority, conditionType v1alpha1.ConditionType) *metav1.Condition {
		for i := range cr.Status.Conditions {
			if cr.Status.Conditions[i].Type == conditionType.String() {
				return &cr.Status.Conditions[i]
			}
		}
		return nil
	}

	t.Run("registers a valid script and reports it ready", func(t *testing.T) {
		r, _ := setup(t, v1alpha1.CustomInsightPrioritySpec{Script: validScript, Precedence: 7})

		cr := reconcile(t, r)

		ready := condition(cr, v1alpha1.ReadyConditionType)
		require.NotNil(t, ready)
		assert.Equal(t, metav1.ConditionTrue, ready.Status)
		scripts := r.Registry.Scripts()
		require.Len(t, scripts, 1)
		assert.Equal(t, 7, scripts[0].Precedence)
		assert.Nil(t, cr.Status.LastEvaluation, "it has not run yet")
	})

	t.Run("never registers a script that does not compile", func(t *testing.T) {
		r, _ := setup(t, v1alpha1.CustomInsightPrioritySpec{Script: "def evaluate(input:\n"})

		cr := reconcile(t, r)

		ready := condition(cr, v1alpha1.ReadyConditionType)
		require.NotNil(t, ready)
		assert.Equal(t, metav1.ConditionFalse, ready.Status)
		assert.Equal(t, v1alpha1.InvalidScriptConditionReason.String(), ready.Reason)
		assert.Empty(t, r.Registry.Scripts())
	})

	t.Run("rejects an engine that is not available", func(t *testing.T) {
		r, _ := setup(t, v1alpha1.CustomInsightPrioritySpec{Script: validScript, Engine: "rego"})

		cr := reconcile(t, r)

		assert.Equal(t, metav1.ConditionFalse, condition(cr, v1alpha1.ReadyConditionType).Status)
		assert.Empty(t, r.Registry.Scripts())
	})

	t.Run("forgets a deleted script", func(t *testing.T) {
		r, _ := setup(t, v1alpha1.CustomInsightPrioritySpec{Script: validScript})
		reconcile(t, r)
		require.NoError(t, r.Delete(ctx, &v1alpha1.CustomInsightPriority{ObjectMeta: metav1.ObjectMeta{Namespace: key.Namespace, Name: key.Name}}))

		_, err := r.Reconcile(ctx, ctrl.Request{NamespacedName: key})

		require.NoError(t, err)
		assert.Empty(t, r.Registry.Scripts())
	})

	t.Run("copies an evaluation to the status", func(t *testing.T) {
		r, _ := setup(t, v1alpha1.CustomInsightPrioritySpec{Script: validScript})
		reconcile(t, r)
		evaluator := insightpriority.NewEvaluator(r.Registry)
		now := time.Date(2026, 10, 9, 12, 0, 0, 0, time.UTC)
		evaluator.Overrides(ctx, []insights.Root{{UID: "a", Kind: "Deployment", Namespace: "apps", Name: "a"}, {UID: "b", Kind: "Deployment", Namespace: "apps", Name: "b"}}, insightpriority.Cluster{}, now)
		require.Len(t, r.Registry.Events(), 1, "the controller is told to look")

		cr := reconcile(t, r)

		require.NotNil(t, cr.Status.LastEvaluation)
		assert.Equal(t, 2, cr.Status.LastEvaluation.Matched)
		assert.Equal(t, 2, cr.Status.LastEvaluation.Overridden)
		assert.True(t, cr.Status.LastEvaluation.Time.Equal(&metav1.Time{Time: now}))
		assert.Empty(t, cr.Status.LastError)
		assert.Equal(t, metav1.ConditionTrue, condition(cr, v1alpha1.ReadyConditionType).Status)
	})

	t.Run("reports a failing evaluation once as a warning", func(t *testing.T) {
		r, recorder := setup(t, v1alpha1.CustomInsightPrioritySpec{Script: "def evaluate(input):\n    return input['missing']\n"})
		reconcile(t, r)
		insightpriority.NewEvaluator(r.Registry).Overrides(ctx, []insights.Root{{UID: "a", Kind: "Deployment", Name: "a"}}, insightpriority.Cluster{}, time.Now())

		cr := reconcile(t, r)
		cr = reconcile(t, r)

		ready := condition(cr, v1alpha1.ReadyConditionType)
		assert.Equal(t, metav1.ConditionFalse, ready.Status)
		assert.Equal(t, v1alpha1.EvaluationFailedConditionReason.String(), ready.Reason)
		assert.Contains(t, cr.Status.LastError, "KeyError")
		assert.Len(t, recorder.Events, 1, "a repeated reconcile does not repeat the event")
	})

	t.Run("flags a script that lost objects to another script", func(t *testing.T) {
		r, _ := setup(t, v1alpha1.CustomInsightPrioritySpec{Script: validScript})
		reconcile(t, r)
		winner := insightpriority.Script{Key: types.NamespacedName{Namespace: "plrl-deploy-operator", Name: "aaa"}, Precedence: 100, Source: validScript}
		r.Registry.Set(winner)
		insightpriority.NewEvaluator(r.Registry).Overrides(ctx, []insights.Root{{UID: "a", Kind: "Deployment", Name: "a"}}, insightpriority.Cluster{}, time.Now())

		cr := reconcile(t, r)

		overlapping := condition(cr, v1alpha1.OverlappingConditionType)
		require.NotNil(t, overlapping)
		assert.Equal(t, metav1.ConditionTrue, overlapping.Status)
		assert.Contains(t, overlapping.Message, "aaa")
	})
}
