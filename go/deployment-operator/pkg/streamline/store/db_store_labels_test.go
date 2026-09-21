package store_test

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"zombiezen.com/go/sqlite"
	"zombiezen.com/go/sqlite/sqlitex"

	"github.com/pluralsh/console/go/deployment-operator/pkg/streamline/api"
	"github.com/pluralsh/console/go/deployment-operator/pkg/streamline/store"
)

func TestComponentCache_Labels(t *testing.T) {
	ctx := context.Background()
	storeInstance, err := store.NewDatabaseStore(ctx)
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, storeInstance.Shutdown())
	})

	labels := map[string]string{
		"app":                         "observe",
		"kubernetes.io/metadata.name": "kube-system",
		"quoted":                      `foo's "bar"`,
	}

	t.Run("SaveComponent round-trips labels", func(t *testing.T) {
		ns := kubeSystemNamespace("cfb1383b-37cc-4d91-b943-aab5119e4cb1", labels)
		require.NoError(t, storeInstance.SaveComponent(ns))

		got, err := storeInstance.GetAppliedComponent(ns)
		require.NoError(t, err)
		require.NotNil(t, got)
		require.Equal(t, string(ns.GetUID()), got.UID)
		require.Equal(t, "kube-system", got.Name)
		require.Empty(t, got.Namespace)
		require.Equal(t, labels, got.Labels)
	})

	t.Run("SaveComponent stores empty labels as an empty map", func(t *testing.T) {
		obj := createComponent("empty-labels-uid", WithName("no-labels"))
		require.NoError(t, storeInstance.SaveComponent(obj))

		got, err := storeInstance.GetAppliedComponent(obj)
		require.NoError(t, err)
		require.NotNil(t, got)
		require.Empty(t, got.Labels)
	})

	t.Run("SaveComponents round-trips labels", func(t *testing.T) {
		first := createComponent("batch-uid-1", WithName("batch-1"), WithLabels(map[string]string{"env": "prod"}))
		second := createComponent("batch-uid-2", WithName("batch-2"), WithLabels(map[string]string{"quoted": `foo's "bar"`}))
		require.NoError(t, storeInstance.SaveComponents([]unstructured.Unstructured{first, second}))

		gotFirst, err := storeInstance.GetAppliedComponent(first)
		require.NoError(t, err)
		require.Equal(t, map[string]string{"env": "prod"}, gotFirst.Labels)

		gotSecond, err := storeInstance.GetAppliedComponent(second)
		require.NoError(t, err)
		require.Equal(t, map[string]string{"quoted": `foo's "bar"`}, gotSecond.Labels)
	})

	t.Run("SaveComponent updates labels on conflict", func(t *testing.T) {
		obj := createComponent("update-labels-uid", WithName("update-labels"), WithLabels(map[string]string{"v": "1"}))
		require.NoError(t, storeInstance.SaveComponent(obj))

		obj.SetLabels(map[string]string{"v": "2"})
		require.NoError(t, storeInstance.SaveComponent(obj))

		got, err := storeInstance.GetAppliedComponent(obj)
		require.NoError(t, err)
		require.Equal(t, map[string]string{"v": "2"}, got.Labels)
	})
}

func TestComponentCache_LabelsColumnMigratesExistingFile(t *testing.T) {
	ctx := context.Background()
	dbPath := filepath.Join(t.TempDir(), "store.db")
	require.NoError(t, createLegacyComponentDB(dbPath))

	storeInstance, err := store.NewDatabaseStore(ctx, store.WithStorage(api.StorageFile), store.WithFilePath(dbPath))
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, storeInstance.Shutdown())
	})

	ns := kubeSystemNamespace("migrated-uid", map[string]string{"app": "observe"})
	require.NoError(t, storeInstance.SaveComponent(ns))

	got, err := storeInstance.GetAppliedComponent(ns)
	require.NoError(t, err)
	require.NotNil(t, got)
	require.Equal(t, "migrated-uid", got.UID)
	require.Equal(t, map[string]string{"app": "observe"}, got.Labels)
}

func kubeSystemNamespace(uid string, labels map[string]string) unstructured.Unstructured {
	ns := unstructured.Unstructured{}
	ns.SetGroupVersionKind(schema.GroupVersionKind{Version: "v1", Kind: "Namespace"})
	ns.SetName("kube-system")
	ns.SetUID(types.UID(uid))
	ns.SetLabels(labels)
	return ns
}

func createLegacyComponentDB(path string) error {
	conn, err := sqlite.OpenConn(path, sqlite.OpenCreate, sqlite.OpenReadWrite)
	if err != nil {
		return err
	}
	defer func() {
		_ = conn.Close()
	}()

	return sqlitex.ExecuteScript(conn, `
		CREATE TABLE component (
			id INTEGER PRIMARY KEY,
			parent_uid TEXT,
			uid TEXT,
			"group" TEXT,
			version TEXT,
			kind TEXT,
			namespace TEXT,
			name TEXT,
			health INT,
			node TEXT,
			created_at TIMESTAMP,
			updated_at TIMESTAMP,
			service_id TEXT,
			delete_phase TEXT,
			manifest_sha TEXT,
			transient_manifest_sha TEXT,
			apply_sha TEXT,
			server_sha TEXT,
			manifest BOOLEAN DEFAULT 0,
			applied BOOLEAN DEFAULT 0
		);
		CREATE UNIQUE INDEX idx_unique_component ON component("group", version, kind, namespace, name);
	`, nil)
}
