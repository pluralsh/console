package template

import (
	"context"
	"testing"

	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"

	"github.com/pluralsh/console/go/deployment-operator/pkg/streamline"
	"github.com/pluralsh/console/go/deployment-operator/pkg/streamline/store"
)

func TestLuaValuesK8sObjectMeta(t *testing.T) {
	t.Run("reads kube-system metadata from the cache", func(t *testing.T) {
		streamline.ResetGlobalStore()
		storeInstance, err := store.NewDatabaseStore(context.Background())
		if err != nil {
			t.Fatalf("NewDatabaseStore: %v", err)
		}
		t.Cleanup(func() {
			streamline.ResetGlobalStore()
			_ = storeInstance.Shutdown()
		})
		streamline.InitGlobalStore(storeInstance)

		ns := unstructured.Unstructured{}
		ns.SetGroupVersionKind(schema.GroupVersionKind{Version: "v1", Kind: "Namespace"})
		ns.SetName("kube-system")
		ns.SetUID(types.UID("cfb1383b-37cc-4d91-b943-aab5119e4cb1"))
		ns.SetLabels(map[string]string{"kubernetes.io/metadata.name": "kube-system"})
		if err := storeInstance.SaveComponent(ns); err != nil {
			t.Fatalf("SaveComponent: %v", err)
		}

		svc := &console.ServiceDeploymentForAgent{
			Helm: &console.ServiceDeploymentForAgent_Helm{
				LuaScript: lo.ToPtr(`
local ns = k8s_object_meta("", "v1", "Namespace", "", "kube-system")
values["observeClusterId"] = ns.uid
values["name"] = ns.name
values["namespace"] = ns.namespace
values["label"] = ns.labels["kubernetes.io/metadata.name"]
`),
			},
		}

		result, _, err := (&helm{dir: t.TempDir()}).luaValues(svc)
		if err != nil {
			t.Fatalf("luaValues: %v", err)
		}
		if result["observeClusterId"] != "cfb1383b-37cc-4d91-b943-aab5119e4cb1" {
			t.Fatalf("unexpected uid: %#v", result)
		}
		if result["name"] != "kube-system" || result["namespace"] != "" {
			t.Fatalf("unexpected identity: %#v", result)
		}
		if result["label"] != "kube-system" {
			t.Fatalf("unexpected label: %#v", result)
		}
	})

	t.Run("returns nil on a cache miss", func(t *testing.T) {
		streamline.ResetGlobalStore()
		storeInstance, err := store.NewDatabaseStore(context.Background())
		if err != nil {
			t.Fatalf("NewDatabaseStore: %v", err)
		}
		t.Cleanup(func() {
			streamline.ResetGlobalStore()
			_ = storeInstance.Shutdown()
		})
		streamline.InitGlobalStore(storeInstance)

		svc := &console.ServiceDeploymentForAgent{
			Helm: &console.ServiceDeploymentForAgent_Helm{
				LuaScript: lo.ToPtr(`
local missing = k8s_object_meta("apps", "v1", "Deployment", "default", "missing")
values["missing"] = missing == nil
`),
			},
		}

		result, _, err := (&helm{dir: t.TempDir()}).luaValues(svc)
		if err != nil {
			t.Fatalf("luaValues: %v", err)
		}
		if result["missing"] != true {
			t.Fatalf("expected nil on cache miss: %#v", result)
		}
	})
}
