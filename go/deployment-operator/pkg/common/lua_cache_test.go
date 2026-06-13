package common

import (
	"testing"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
)

func TestSyncLuaScriptsFromCustomHealths(t *testing.T) {
	const (
		defaultScript = `healthStatus = { status = "Healthy" }`
		deployScript  = `healthStatus = { status = "Progressing" }`
	)

	deploymentGVK := schema.GroupVersionKind{Group: "apps", Version: "v1", Kind: "Deployment"}

	t.Run("rebuilds the cache from the current CustomHealth set", func(t *testing.T) {
		ClearLuaScripts()
		t.Cleanup(ClearLuaScripts)

		SyncLuaScriptsFromCustomHealths([]v1alpha1.CustomHealth{
			{Spec: v1alpha1.CustomHealthSpec{Script: defaultScript}},
			{
				Spec: v1alpha1.CustomHealthSpec{
					Script:  deployScript,
					Group:   "apps",
					Version: "v1",
					Kind:    "Deployment",
				},
			},
		})

		if got := GetLuaScriptForGVK(schema.GroupVersionKind{}); got != defaultScript {
			t.Fatalf("expected default script, got %q", got)
		}
		if got := GetLuaScriptForGVK(deploymentGVK); got != deployScript {
			t.Fatalf("expected deployment script, got %q", got)
		}
		if IsLuaScriptValueForGVK(schema.GroupVersionKind{Group: "batch", Version: "v1", Kind: "Job"}) {
			t.Fatal("expected batch/v1 Job to be absent")
		}
	})

	t.Run("drops stale entries when the CustomHealth set shrinks", func(t *testing.T) {
		ClearLuaScripts()
		t.Cleanup(ClearLuaScripts)

		SetLuaScriptForGVK(deploymentGVK, deployScript)
		SyncLuaScriptsFromCustomHealths([]v1alpha1.CustomHealth{
			{Spec: v1alpha1.CustomHealthSpec{Script: defaultScript}},
		})

		if IsLuaScriptValueForGVK(deploymentGVK) {
			t.Fatal("expected deployment GVK to be removed")
		}
	})

	t.Run("removes stale entries when a CustomHealth GVK changes", func(t *testing.T) {
		ClearLuaScripts()
		t.Cleanup(ClearLuaScripts)

		SyncLuaScriptsFromCustomHealths([]v1alpha1.CustomHealth{
			{
				Spec: v1alpha1.CustomHealthSpec{
					Script:  deployScript,
					Group:   "apps",
					Version: "v1",
					Kind:    "Deployment",
				},
			},
		})
		SyncLuaScriptsFromCustomHealths([]v1alpha1.CustomHealth{
			{
				Spec: v1alpha1.CustomHealthSpec{
					Script:  defaultScript,
					Group:   "batch",
					Version: "v1",
					Kind:    "Job",
				},
			},
		})

		if IsLuaScriptValueForGVK(deploymentGVK) {
			t.Fatal("expected old deployment GVK to be removed")
		}
		jobGVK := schema.GroupVersionKind{Group: "batch", Version: "v1", Kind: "Job"}
		if !IsLuaScriptValueForGVK(jobGVK) {
			t.Fatal("expected batch/v1 Job to be present")
		}
	})

	t.Run("ignores terminating and empty-script CustomHealth resources", func(t *testing.T) {
		ClearLuaScripts()
		t.Cleanup(ClearLuaScripts)

		now := metav1.NewTime(time.Now())
		SyncLuaScriptsFromCustomHealths([]v1alpha1.CustomHealth{
			{
				ObjectMeta: metav1.ObjectMeta{DeletionTimestamp: &now},
				Spec: v1alpha1.CustomHealthSpec{
					Script:  deployScript,
					Group:   "apps",
					Version: "v1",
					Kind:    "Deployment",
				},
			},
			{
				Spec: v1alpha1.CustomHealthSpec{
					Group:   "apps",
					Version: "v1",
					Kind:    "StatefulSet",
				},
			},
		})

		if IsLuaScriptValueForGVK(deploymentGVK) {
			t.Fatal("expected terminating deployment script to be omitted")
		}
		statefulSetGVK := schema.GroupVersionKind{Group: "apps", Version: "v1", Kind: "StatefulSet"}
		if IsLuaScriptValueForGVK(statefulSetGVK) {
			t.Fatal("expected empty-script GVK to be omitted")
		}
	})

	t.Run("removes a single GVK entry", func(t *testing.T) {
		ClearLuaScripts()
		t.Cleanup(ClearLuaScripts)

		SetLuaScriptForGVK(deploymentGVK, deployScript)
		RemoveLuaScriptForGVK(deploymentGVK)

		if IsLuaScriptValueForGVK(deploymentGVK) {
			t.Fatal("expected deployment GVK to be removed")
		}
	})
}
