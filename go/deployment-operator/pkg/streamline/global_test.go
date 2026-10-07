package streamline_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"

	"github.com/pluralsh/console/go/deployment-operator/pkg/streamline"
	"github.com/pluralsh/console/go/deployment-operator/pkg/streamline/store"
)

func TestLookupObjectMeta(t *testing.T) {
	t.Run("returns nil when the global store is not initialized", func(t *testing.T) {
		streamline.ResetGlobalStore()

		got, err := streamline.LookupObjectMeta("", "v1", "Namespace", "", "kube-system")
		require.NoError(t, err)
		require.Nil(t, got)
	})

	t.Run("returns kube-system metadata from the cache", func(t *testing.T) {
		streamline.ResetGlobalStore()
		storeInstance, err := store.NewDatabaseStore(context.Background())
		require.NoError(t, err)
		t.Cleanup(func() {
			streamline.ResetGlobalStore()
			require.NoError(t, storeInstance.Shutdown())
		})
		streamline.InitGlobalStore(storeInstance)

		ns := unstructured.Unstructured{}
		ns.SetGroupVersionKind(schema.GroupVersionKind{Version: "v1", Kind: "Namespace"})
		ns.SetName("kube-system")
		ns.SetUID(types.UID("cfb1383b-37cc-4d91-b943-aab5119e4cb1"))
		ns.SetLabels(map[string]string{"kubernetes.io/metadata.name": "kube-system"})
		require.NoError(t, storeInstance.SaveComponent(ns))

		got, err := streamline.LookupObjectMeta("", "v1", "Namespace", "", "kube-system")
		require.NoError(t, err)
		require.Equal(t, map[string]any{
			"uid":       "cfb1383b-37cc-4d91-b943-aab5119e4cb1",
			"name":      "kube-system",
			"namespace": "",
			"labels":    map[string]string{"kubernetes.io/metadata.name": "kube-system"},
		}, got)
	})

	t.Run("returns nil for a cache miss", func(t *testing.T) {
		streamline.ResetGlobalStore()
		storeInstance, err := store.NewDatabaseStore(context.Background())
		require.NoError(t, err)
		t.Cleanup(func() {
			streamline.ResetGlobalStore()
			require.NoError(t, storeInstance.Shutdown())
		})
		streamline.InitGlobalStore(storeInstance)

		got, err := streamline.LookupObjectMeta("apps", "v1", "Deployment", "default", "missing")
		require.NoError(t, err)
		require.Nil(t, got)
	})

	t.Run("returns empty labels when the object has none", func(t *testing.T) {
		streamline.ResetGlobalStore()
		storeInstance, err := store.NewDatabaseStore(context.Background())
		require.NoError(t, err)
		t.Cleanup(func() {
			streamline.ResetGlobalStore()
			require.NoError(t, storeInstance.Shutdown())
		})
		streamline.InitGlobalStore(storeInstance)

		cm := unstructured.Unstructured{}
		cm.SetGroupVersionKind(schema.GroupVersionKind{Version: "v1", Kind: "ConfigMap"})
		cm.SetNamespace("default")
		cm.SetName("plain")
		cm.SetUID(types.UID("plain-uid"))
		require.NoError(t, storeInstance.SaveComponent(cm))

		got, err := streamline.GetGlobalStore().ObjectMeta("", "v1", "ConfigMap", "default", "plain")
		require.NoError(t, err)
		require.Equal(t, map[string]any{
			"uid":       "plain-uid",
			"name":      "plain",
			"namespace": "default",
			"labels":    map[string]string{},
		}, got)
	})
}
