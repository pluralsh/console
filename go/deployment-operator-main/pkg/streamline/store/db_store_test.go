package store_test

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/polly/containers"
	"github.com/samber/lo"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"

	"github.com/pluralsh/deployment-operator/pkg/streamline/api"
	"github.com/pluralsh/deployment-operator/pkg/streamline/common"
	"github.com/pluralsh/deployment-operator/pkg/streamline/store"
)

const (
	testUID       = "test-uid"
	testGroup     = "test-group"
	testNamespace = "test-namespace"
	testKind      = "Test"
	testVersion   = "v1"
	testName      = "test-component"
	testChildUID  = "child-uid"
)

func createComponent(uid string, option ...CreateComponentOption) unstructured.Unstructured {
	u := unstructured.Unstructured{}
	u.SetGroupVersionKind(schema.GroupVersionKind{Group: testGroup, Version: testVersion, Kind: testKind})
	u.SetNamespace(testNamespace)
	u.SetName(testName)
	u.SetUID(types.UID(uid))

	for _, opt := range option {
		opt(&u)
	}

	return u
}

type CreateComponentOption func(u *unstructured.Unstructured)

func WithParent(uid string) CreateComponentOption {
	return func(u *unstructured.Unstructured) {
		u.SetOwnerReferences([]metav1.OwnerReference{{
			APIVersion: testGroup + "/" + testVersion,
			Kind:       testKind,
			Name:       testName,
			UID:        types.UID(uid),
		}})
	}
}

// WithService should be called as a last option to ensure that TrackingIdentifierKey will be valid.
func WithService(id string) CreateComponentOption {
	return func(u *unstructured.Unstructured) {
		u.SetAnnotations(map[string]string{
			common.OwningInventoryKey:    id,
			common.TrackingIdentifierKey: common.NewKeyFromUnstructured(lo.FromPtr(u)).String(),
		})
	}
}

func WithGVK(group, version, kind string) CreateComponentOption {
	return func(u *unstructured.Unstructured) {
		u.SetGroupVersionKind(schema.GroupVersionKind{Group: group, Version: version, Kind: kind})
	}
}

func WithNamespace(namespace string) CreateComponentOption {
	return func(u *unstructured.Unstructured) {
		u.SetNamespace(namespace)
	}
}

func WithName(name string) CreateComponentOption {
	return func(u *unstructured.Unstructured) {
		u.SetName(name)
	}
}

type CreateStoreKeyOption func(entry *common.Component)

func WithStoreKeyName(name string) CreateStoreKeyOption {
	return func(entry *common.Component) {
		entry.Name = name
	}
}

func createStoreKey(option ...CreateStoreKeyOption) common.StoreKey {
	result := common.Component{
		Group:     testGroup,
		Version:   testVersion,
		Kind:      testKind,
		Namespace: testNamespace,
		Name:      testName,
	}

	for _, opt := range option {
		opt(&result)
	}

	return result.StoreKey()
}

func TestComponentCache_Init(t *testing.T) {
	t.Run("cache should initialize", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func(storeInstance store.Store) {
			err := storeInstance.Shutdown()
			if err != nil {
				t.Errorf("failed to shutdown store: %v", err)
			}
		}(storeInstance)
	})
}

func TestComponentCache_SetComponent(t *testing.T) {
	t.Run("cache should save and return simple parent and child structure", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func(storeInstance store.Store) {
			err := storeInstance.Shutdown()
			if err != nil {
				t.Errorf("failed to shutdown store: %v", err)
			}
		}(storeInstance)

		serviceID := "test-service-set-component"
		uid := testUID

		component := createComponent(uid, WithName("parent-component"), WithService(serviceID))
		err = storeInstance.SaveComponent(component)
		require.NoError(t, err)

		childComponent := createComponent(testChildUID, WithParent(uid), WithName("child-component"))
		err = storeInstance.SaveComponent(childComponent)
		require.NoError(t, err)

		attributes, err := storeInstance.GetServiceComponentsWithChildren(serviceID, true)
		require.NoError(t, err)
		require.Len(t, attributes, 1)
		require.NotNil(t, attributes[0].Children)
		require.Len(t, attributes[0].Children, 1)
		assert.Equal(t, testChildUID, attributes[0].Children[0].UID)
		assert.Equal(t, uid, *attributes[0].Children[0].ParentUID)
	})
}

func TestComponentCache_DeleteComponent(t *testing.T) {
	t.Run("cache should support basic cascade deletion", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		serviceID := "test-service-delete-basic"
		uid := testUID
		component := createComponent(uid, WithName("delete-parent-component"), WithService(serviceID))
		err = storeInstance.SaveComponent(component)
		require.NoError(t, err)

		childUid := "child-uid"
		childComponent := createComponent(childUid, WithParent(uid), WithName("delete-child-component"))
		err = storeInstance.SaveComponent(childComponent)
		require.NoError(t, err)

		grandchildComponent := createComponent("grandchild-uid", WithParent(childUid), WithName("delete-grandchild-component"))
		err = storeInstance.SaveComponent(grandchildComponent)
		require.NoError(t, err)

		attributes, err := storeInstance.GetServiceComponentsWithChildren(serviceID, true)
		require.NoError(t, err)
		require.Len(t, attributes, 1)
		require.Len(t, attributes[0].Children, 2)

		err = storeInstance.DeleteComponent(createStoreKey(WithStoreKeyName("delete-child-component")))
		require.NoError(t, err)

		attributes, err = storeInstance.GetServiceComponentsWithChildren(serviceID, true)
		require.NoError(t, err)
		require.Len(t, attributes, 1)
		require.Empty(t, attributes[0].Children)
	})

	t.Run("cache should support multi-level cascade deletion", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		serviceID := "test-service-delete-multi"
		uid := testUID
		component := createComponent(uid, WithName("multi-delete-parent"), WithService(serviceID))
		err = storeInstance.SaveComponent(component)
		require.NoError(t, err)

		childUid := "child-uid"
		childComponent := createComponent(childUid, WithParent(uid), WithName("multi-delete-child"))
		err = storeInstance.SaveComponent(childComponent)
		require.NoError(t, err)

		grandchildComponent := createComponent("grandchild-uid", WithParent(childUid), WithName("multi-delete-grandchild"))
		err = storeInstance.SaveComponent(grandchildComponent)
		require.NoError(t, err)

		child2Uid := "child2-uid"
		child2Component := createComponent(child2Uid, WithParent(uid), WithName("multi-delete-child2"))
		err = storeInstance.SaveComponent(child2Component)
		require.NoError(t, err)

		attributes, err := storeInstance.GetServiceComponentsWithChildren(serviceID, true)
		require.NoError(t, err)
		require.Len(t, attributes, 1)
		require.Len(t, attributes[0].Children, 3)

		err = storeInstance.DeleteComponent(createStoreKey(WithStoreKeyName("multi-delete-child")))
		require.NoError(t, err)

		attributes, err = storeInstance.GetServiceComponentsWithChildren(serviceID, true)
		require.NoError(t, err)
		require.Len(t, attributes, 1)
		require.Len(t, attributes[0].Children, 1)
	})
}

func TestComponentCache_DeleteUnsyncedComponentsByKeys(t *testing.T) {
	t.Run("should delete multiple components by keys", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		require.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		serviceID := "test-service"

		// Create multiple components
		component1 := createComponent("uid-1", WithGVK("apps", "v1", "Deployment"), WithNamespace("default"), WithName("app-1"), WithService(serviceID))
		component2 := createComponent("uid-2", WithGVK("apps", "v1", "Deployment"), WithNamespace("default"), WithName("app-2"), WithService(serviceID))
		component3 := createComponent("uid-3", WithGVK("apps", "v1", "Deployment"), WithNamespace("default"), WithName("app-3"), WithService(serviceID))

		require.NoError(t, storeInstance.SaveUnsyncedComponents([]unstructured.Unstructured{
			component1, component2, component3,
		}))

		// Verify components exist using GetServiceComponents with onlyApplied=false
		// since SaveUnsyncedComponents saves components without applied=1
		components, err := storeInstance.GetServiceComponents(serviceID, false)
		require.NoError(t, err)
		require.Len(t, components, 3)

		// Create keys to delete
		keysToDelete := containers.NewSet[common.StoreKey]()
		keysToDelete.Add(common.NewStoreKeyFromUnstructured(component1))
		keysToDelete.Add(common.NewStoreKeyFromUnstructured(component2))

		// Delete components by keys
		err = storeInstance.DeleteUnsyncedComponentsByKeys(keysToDelete)
		require.NoError(t, err)

		// Verify deleted components no longer exist
		components, err = storeInstance.GetServiceComponents(serviceID, false)
		require.NoError(t, err)
		require.Len(t, components, 1)
		require.Equal(t, "app-3", components[0].Name)
	})

	t.Run("should handle empty set without error", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		require.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		// Delete with empty set
		emptySet := containers.NewSet[common.StoreKey]()
		err = storeInstance.DeleteUnsyncedComponentsByKeys(emptySet)
		require.NoError(t, err)
	})

	t.Run("should handle deletion of non-existent keys without error", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		require.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		// Create a component
		component := createComponent("uid-1", WithGVK("apps", "v1", "Deployment"), WithNamespace("default"), WithName("app-1"))
		err = storeInstance.SaveComponent(component)
		require.NoError(t, err)

		// Try to delete a non-existent component
		keysToDelete := containers.NewSet[common.StoreKey]()
		keysToDelete.Add(common.StoreKey{
			GVK:       schema.GroupVersionKind{Group: "apps", Version: "v1", Kind: "Deployment"},
			Namespace: "default",
			Name:      "non-existent-app",
		})

		err = storeInstance.DeleteUnsyncedComponentsByKeys(keysToDelete)
		require.NoError(t, err)

		// Verify the existing component still exists
		c, err := storeInstance.GetAppliedComponent(component)
		require.NoError(t, err)
		require.NotNil(t, c)
	})

	t.Run("should delete components with different GVKs", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		require.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		serviceID := "test-service-gvk"

		// Create components with different GVKs
		deployment := createComponent("uid-1", WithGVK("apps", "v1", "Deployment"), WithNamespace("default"), WithName("my-app"), WithService(serviceID))
		statefulset := createComponent("uid-2", WithGVK("apps", "v1", "StatefulSet"), WithNamespace("default"), WithName("my-app"), WithService(serviceID))
		service := createComponent("uid-3", WithGVK("", "v1", "Service"), WithNamespace("default"), WithName("my-service"), WithService(serviceID))

		require.NoError(t, storeInstance.SaveUnsyncedComponents([]unstructured.Unstructured{
			deployment, statefulset, service,
		}))

		// Delete multiple components with different GVKs
		keysToDelete := containers.NewSet[common.StoreKey]()
		keysToDelete.Add(common.NewStoreKeyFromUnstructured(deployment))
		keysToDelete.Add(common.NewStoreKeyFromUnstructured(service))

		err = storeInstance.DeleteUnsyncedComponentsByKeys(keysToDelete)
		require.NoError(t, err)

		// Verify only statefulset remains using GetServiceComponents with onlyApplied=false
		components, err := storeInstance.GetServiceComponents(serviceID, false)
		require.NoError(t, err)
		require.Len(t, components, 1)
		require.Equal(t, "StatefulSet", components[0].Kind)
	})

	t.Run("should delete components across different namespaces", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		require.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		serviceID := "test-service-namespaces"

		// Create components in different namespaces
		component1 := createComponent("uid-1", WithGVK("apps", "v1", "Deployment"), WithNamespace("default"), WithName("app"), WithService(serviceID))
		component2 := createComponent("uid-2", WithGVK("apps", "v1", "Deployment"), WithNamespace("production"), WithName("app"), WithService(serviceID))
		component3 := createComponent("uid-3", WithGVK("apps", "v1", "Deployment"), WithNamespace("staging"), WithName("app"), WithService(serviceID))

		require.NoError(t, storeInstance.SaveUnsyncedComponents([]unstructured.Unstructured{
			component1, component2, component3,
		}))

		// Delete from default and production namespaces
		keysToDelete := containers.NewSet[common.StoreKey]()
		keysToDelete.Add(common.NewStoreKeyFromUnstructured(component1))
		keysToDelete.Add(common.NewStoreKeyFromUnstructured(component2))

		err = storeInstance.DeleteUnsyncedComponentsByKeys(keysToDelete)
		require.NoError(t, err)

		// Verify only staging component remains using GetServiceComponents with onlyApplied=false
		components, err := storeInstance.GetServiceComponents(serviceID, false)
		require.NoError(t, err)
		require.Len(t, components, 1)
		require.Equal(t, "staging", components[0].Namespace)
	})

	t.Run("should handle large batch deletion", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		require.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		// Create many components
		componentsToDelete := make([]unstructured.Unstructured, 50)
		componentsToKeep := make([]unstructured.Unstructured, 50)

		for i := 0; i < 50; i++ {
			comp := createComponent(fmt.Sprintf("delete-uid-%d", i), WithGVK("apps", "v1", "Deployment"), WithNamespace("batch-ns"), WithName(fmt.Sprintf("delete-app-%d", i)))
			componentsToDelete[i] = comp
		}

		require.NoError(t, storeInstance.SaveUnsyncedComponents(componentsToDelete))

		for i := 0; i < 50; i++ {
			comp := createComponent(fmt.Sprintf("keep-uid-%d", i), WithGVK("apps", "v1", "Deployment"), WithNamespace("batch-ns"), WithName(fmt.Sprintf("keep-app-%d", i)))
			componentsToKeep[i] = comp
			err = storeInstance.SaveComponent(comp)
			require.NoError(t, err)
		}

		// Build keys set to delete
		keysToDelete := containers.NewSet[common.StoreKey]()
		for _, comp := range componentsToDelete {
			keysToDelete.Add(common.NewStoreKeyFromUnstructured(comp))
		}

		// Delete in batch
		err = storeInstance.DeleteUnsyncedComponentsByKeys(keysToDelete)
		require.NoError(t, err)

		// Verify deleted components
		for _, comp := range componentsToDelete {
			c, err := storeInstance.GetAppliedComponent(comp)
			require.NoError(t, err)
			require.Nil(t, c, "component should have been deleted: %s", comp.GetName())
		}

		// Verify remaining components
		for _, comp := range componentsToKeep {
			c, err := storeInstance.GetAppliedComponent(comp)
			require.NoError(t, err)
			require.NotNil(t, c, "component should still exist: %s", comp.GetName())
		}
	})
}

func TestComponentCache_GroupHandling(t *testing.T) {
	t.Run("cache should correctly store and return group", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		serviceID := "test-service-group-handling"
		group := testGroup

		uid := testUID
		component := createComponent(uid, WithName("group-test-parent"), WithService(serviceID))
		err = storeInstance.SaveComponent(component)
		require.NoError(t, err)

		child := createComponent("child-uid", WithParent(uid), WithGVK(group, testVersion, testKind), WithName("group-test-child"))
		err = storeInstance.SaveComponent(child)
		require.NoError(t, err)

		attributes, err := storeInstance.GetServiceComponentsWithChildren(serviceID, true)
		require.NoError(t, err)
		require.Len(t, attributes, 1)
		require.NotNil(t, attributes[0].Children)
		require.Len(t, attributes[0].Children, 1)
		require.Equal(t, group, *attributes[0].Children[0].Group)

		// Test empty group
		child = createComponent("child2-uid", WithParent(uid), WithGVK("", testVersion, testKind), WithName("group-test-child"))
		err = storeInstance.SaveComponent(child)
		require.NoError(t, err)

		tested, err := storeInstance.GetAppliedComponentByUID("child2-uid")
		require.NoError(t, err)
		require.Nil(t, tested.Group)

		// Test nil group
		// Test nil group
		child = createComponent("child3-uid", WithParent(uid), WithGVK("", testVersion, testKind), WithName("group-test-child"))
		err = storeInstance.SaveComponent(child)
		require.NoError(t, err)

		tested, err = storeInstance.GetAppliedComponentByUID("child3-uid")
		require.NoError(t, err)
		require.Nil(t, tested.Group)
	})
}

func TestComponentCache_UniqueConstraint(t *testing.T) {
	t.Run("should allow components with different GVK-namespace-name combinations", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		component1 := createComponent("uid-1",
			WithGVK("apps", "v1", "Deployment"),
			WithNamespace("default"),
			WithName("my-app"))
		err = storeInstance.SaveComponent(component1)
		require.NoError(t, err)

		// Component with different name - should succeed
		component2 := createComponent("uid-2",
			WithGVK("apps", "v1", "Deployment"),
			WithNamespace("default"),
			WithName("my-other-app"))
		err = storeInstance.SaveComponent(component2)
		require.NoError(t, err)

		// Component with different namespace - should succeed
		component3 := createComponent("uid-3",
			WithGVK("apps", "v1", "Deployment"),
			WithNamespace("production"),
			WithName("my-app"))
		err = storeInstance.SaveComponent(component3)
		require.NoError(t, err)

		// Component with different kind - should succeed
		component4 := createComponent("uid-4",
			WithGVK("apps", "v1", "StatefulSet"),
			WithNamespace("default"),
			WithName("my-app"))
		err = storeInstance.SaveComponent(component4)
		require.NoError(t, err)

		// Component with different version - should succeed
		component5 := createComponent("uid-5",
			WithGVK("apps", "v2", "Deployment"),
			WithNamespace("default"),
			WithName("my-app"))
		err = storeInstance.SaveComponent(component5)
		require.NoError(t, err)

		// Component with different group - should succeed
		component6 := createComponent("uid-6",
			WithGVK("extensions", "v1", "Deployment"),
			WithNamespace("default"),
			WithName("my-app"))
		err = storeInstance.SaveComponent(component6)
		require.NoError(t, err)
	})

	t.Run("should allow component updates", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		component := createComponent("uid-1",
			WithGVK("apps", "v1", "Deployment"),
			WithNamespace("default"),
			WithName("my-app"))
		err = storeInstance.SaveComponent(component)
		require.NoError(t, err)

		component = createComponent("uid-1",
			WithGVK("apps", "v1", "Deployment"),
			WithNamespace("default"),
			WithName("my-app"))
		err = storeInstance.SaveComponent(component)
		require.NoError(t, err)
	})

	t.Run("should allow components with same GVK-namespace-name but different UID", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		component1 := createComponent("uid-1",
			WithGVK("apps", "v1", "Deployment"),
			WithNamespace("default"),
			WithName("duplicate-app"))
		err = storeInstance.SaveComponent(component1)
		require.NoError(t, err)

		component2 := createComponent("uid-2",
			WithGVK("apps", "v1", "Deployment"),
			WithNamespace("default"),
			WithName("duplicate-app"))
		err = storeInstance.SaveComponent(component2)
		require.NoError(t, err)
	})

	t.Run("should allow updating existing component with same UID", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		uid := "update-test-uid"

		// Create initial component
		component := createComponent(uid,
			WithGVK("apps", "v1", "Deployment"),
			WithNamespace("default"),
			WithName("updatable-app"))
		err = storeInstance.SaveComponent(component)
		require.NoError(t, err)

		// Update the same component with different state - should succeed
		updatedComponent := createComponent(uid,
			WithGVK("apps", "v1", "Deployment"),
			WithNamespace("default"),
			WithName("updatable-app"))
		err = storeInstance.SaveComponent(updatedComponent)
		require.NoError(t, err)
	})

	t.Run("should handle UID changes for resource with the same identity", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		group := "apps"
		version := "v1"
		kind := "Deployment"
		name := "test"
		namespace := ""

		var u unstructured.Unstructured
		u.SetGroupVersionKind(schema.GroupVersionKind{
			Group:   group,
			Version: version,
			Kind:    kind,
		})
		u.SetName(name)
		u.SetNamespace(namespace)

		component := createComponent("uid-1", WithGVK(group, version, kind), WithName(name), WithNamespace(namespace))
		err = storeInstance.SaveComponent(component)
		require.NoError(t, err)

		sameComponentWithDifferentUID := createComponent("uid-2", WithGVK(group, version, kind), WithName(name), WithNamespace(namespace))
		err = storeInstance.SaveComponent(sameComponentWithDifferentUID)
		require.NoError(t, err)

		dbc, err := storeInstance.GetAppliedComponent(u)
		require.NoError(t, err)
		assert.Equal(t, "uid-2", dbc.UID)
	})
}

func TestComponentCountsCache(t *testing.T) {
	t.Run("cache should return counts of nodes, pods and namespaces", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		// Create 3 namespaces
		err = storeInstance.SaveComponent(createComponent("a", WithGVK("", testVersion, "Namespace"), WithName("a")))
		require.NoError(t, err)
		err = storeInstance.SaveComponent(createComponent("b", WithGVK("", testVersion, "Namespace"), WithName("b")))
		require.NoError(t, err)
		err = storeInstance.SaveComponent(createComponent("c", WithGVK("", testVersion, "Namespace"), WithName("c")))
		require.NoError(t, err)

		// Create 3 nodes
		err = storeInstance.SaveComponent(createComponent("node-1", WithGVK("", testVersion, "Node"), WithName("node-1")))
		require.NoError(t, err)
		err = storeInstance.SaveComponent(createComponent("node-2", WithGVK("", testVersion, "Node"), WithName("node-2")))
		require.NoError(t, err)
		err = storeInstance.SaveComponent(createComponent("node-3", WithGVK("", testVersion, "Node"), WithName("node-3")))
		require.NoError(t, err)

		nodes, namespaces, err := storeInstance.GetComponentCounts()
		require.NoError(t, err, "Failed to get component counts")

		assert.Equal(t, nodes, int64(3))
		assert.Equal(t, namespaces, int64(3))
	})

	t.Run("should return correct counts of nodes and namespaces", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		// Create 2 nodes
		err = storeInstance.SaveComponent(createComponent("node-1", WithGVK("", testVersion, "Node"), WithName("worker-1")))
		require.NoError(t, err)

		err = storeInstance.SaveComponent(createComponent("node-2", WithGVK("", testVersion, "Node"), WithName("worker-2")))
		require.NoError(t, err)

		// Create 3 namespaces
		err = storeInstance.SaveComponent(createComponent("ns-1", WithGVK("", testVersion, "Namespace"), WithName("default")))
		require.NoError(t, err)

		err = storeInstance.SaveComponent(createComponent("ns-2", WithGVK("", testVersion, "Namespace"), WithName("kube-system")))
		require.NoError(t, err)

		err = storeInstance.SaveComponent(createComponent("ns-3", WithGVK("", testVersion, "Namespace"), WithName("production")))
		require.NoError(t, err)

		// Create some other resources that should not be counted
		err = storeInstance.SaveComponent(createComponent("pod-1", WithGVK("", testVersion, "Pod"), WithName("test-pod")))
		require.NoError(t, err)

		nodeCount, namespaceCount, err := storeInstance.GetComponentCounts()
		require.NoError(t, err, "failed to get component counts")

		assert.Equal(t, int64(2), nodeCount)
		assert.Equal(t, int64(3), namespaceCount)
	})
}

func TestUpdateSHA(t *testing.T) {
	t.Run("cache should update SHA", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		obj := newUnstructured("test", "test", "test", "test", "v1", "Test")
		require.NoError(t, storeInstance.SaveComponent(obj))

		require.NoError(t, storeInstance.UpdateComponentSHA(obj, store.ApplySHA))
		require.NoError(t, storeInstance.UpdateComponentSHA(obj, store.ServerSHA))
		require.NoError(t, storeInstance.UpdateComponentSHA(obj, store.ManifestSHA))
		require.NoError(t, storeInstance.UpdateComponentSHA(obj, store.TransientManifestSHA))

		entry, err := storeInstance.GetAppliedComponent(obj)
		require.NoError(t, err)
		require.NotNil(t, entry)
		assert.NotEmpty(t, entry.ApplySHA)
		assert.NotEmpty(t, entry.ServerSHA)
		assert.NotEmpty(t, entry.ManifestSHA)
		assert.NotEmpty(t, entry.TransientManifestSHA)
	})
}

func TestExpireSHAOlderThan(t *testing.T) {
	t.Run("should expire SHA", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		obj := newUnstructured("test", "test", "test", "test", "v1", "Test")
		require.NoError(t, storeInstance.SaveComponent(obj))

		require.NoError(t, storeInstance.UpdateComponentSHA(obj, store.ApplySHA))
		require.NoError(t, storeInstance.UpdateComponentSHA(obj, store.ServerSHA))
		require.NoError(t, storeInstance.UpdateComponentSHA(obj, store.ManifestSHA))
		require.NoError(t, storeInstance.UpdateComponentSHA(obj, store.TransientManifestSHA))

		entry, err := storeInstance.GetAppliedComponent(obj)
		require.NoError(t, err)
		require.NotNil(t, entry)
		assert.NotEmpty(t, entry.ApplySHA)
		assert.NotEmpty(t, entry.ServerSHA)
		assert.NotEmpty(t, entry.ManifestSHA)
		assert.NotEmpty(t, entry.TransientManifestSHA)

		time.Sleep(2 * time.Second)

		err = storeInstance.ExpireOlderThan(500 * time.Millisecond)
		require.NoError(t, err)

		entry, err = storeInstance.GetAppliedComponent(obj)
		require.NoError(t, err)
		require.NotNil(t, entry)
		assert.Empty(t, entry.ApplySHA)
		assert.NotEmpty(t, entry.ServerSHA)
		assert.Empty(t, entry.ManifestSHA)
		assert.Empty(t, entry.TransientManifestSHA)
	})

	t.Run("should not expire SHA", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		obj := newUnstructured("test", "test", "test", "test", "v1", "Test")
		require.NoError(t, storeInstance.SaveComponent(obj))

		require.NoError(t, storeInstance.UpdateComponentSHA(obj, store.ApplySHA))
		require.NoError(t, storeInstance.UpdateComponentSHA(obj, store.ServerSHA))
		require.NoError(t, storeInstance.UpdateComponentSHA(obj, store.ManifestSHA))
		require.NoError(t, storeInstance.UpdateComponentSHA(obj, store.TransientManifestSHA))

		entry, err := storeInstance.GetAppliedComponent(obj)
		require.NoError(t, err)
		require.NotNil(t, entry)
		assert.NotEmpty(t, entry.ApplySHA)
		assert.NotEmpty(t, entry.ServerSHA)
		assert.NotEmpty(t, entry.ManifestSHA)
		assert.NotEmpty(t, entry.TransientManifestSHA)

		err = storeInstance.ExpireOlderThan(time.Second)
		require.NoError(t, err)

		entry, err = storeInstance.GetAppliedComponent(obj)
		require.NoError(t, err)
		require.NotNil(t, entry)
		assert.NotEmpty(t, entry.ApplySHA)
		assert.NotEmpty(t, entry.ServerSHA)
		assert.NotEmpty(t, entry.ManifestSHA)
		assert.NotEmpty(t, entry.TransientManifestSHA)
	})

	t.Run("trigger should update updated_at column", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		obj := newUnstructured("test", "test", "test", "test", "v1", "Test")
		require.NoError(t, storeInstance.SaveComponent(obj))

		err = storeInstance.UpdateComponentSHA(obj, store.ServerSHA)
		require.NoError(t, err)

		entry, err := storeInstance.GetAppliedComponent(obj)
		require.NoError(t, err)
		require.NotNil(t, entry)
		assert.NotEmpty(t, entry.ServerSHA)

		time.Sleep(time.Second)

		err = storeInstance.ExpireOlderThan(2 * time.Second)
		require.NoError(t, err)

		entry, err = storeInstance.GetAppliedComponent(obj)
		require.NoError(t, err)
		require.NotNil(t, entry)
		assert.NotEmpty(t, entry.ServerSHA)

		err = storeInstance.UpdateComponentSHA(obj, store.ServerSHA)
		require.NoError(t, err)
		entry, err = storeInstance.GetAppliedComponent(obj)
		require.NoError(t, err)
		require.NotNil(t, entry)
		assert.NotEmpty(t, entry.ServerSHA)

		time.Sleep(1500 * time.Millisecond)

		err = storeInstance.ExpireOlderThan(2 * time.Second)
		require.NoError(t, err)
		entry, err = storeInstance.GetAppliedComponent(obj)
		require.NoError(t, err)
		require.NotNil(t, entry)
		assert.NotEmpty(t, entry.ServerSHA)
	})
}

func TestGetComponentsByGVK(t *testing.T) {
	t.Run("should return only components matching provided GVK", func(t *testing.T) {
		gvk := schema.GroupVersionKind{Group: "apps", Version: "v1", Kind: "Deployment"}

		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		// Insert components with matching GVK and different names/namespaces to avoid unique conflict
		require.NoError(t, storeInstance.SaveComponent(createComponent("gvk-uid-1", WithGVK(gvk.Group, gvk.Version, gvk.Kind), WithNamespace("ns-1"), WithName("alpha"))))
		require.NoError(t, storeInstance.SaveComponent(createComponent("gvk-uid-2", WithGVK(gvk.Group, gvk.Version, gvk.Kind), WithNamespace("ns-2"), WithName("beta"))))
		require.NoError(t, storeInstance.SaveComponent(createComponent("gvk-uid-3", WithGVK(gvk.Group, gvk.Version, gvk.Kind), WithNamespace("ns-3"), WithName("gamma"))))

		// Insert components with different GVK to ensure they are filtered out
		diff1 := createComponent("other-uid-1", WithGVK("apps", "v1", "StatefulSet"), WithNamespace("ns-1"), WithName("alpha"))
		require.NoError(t, storeInstance.SaveComponent(diff1))

		diff2 := createComponent("other-uid-2", WithGVK("extensions", "v1", "Deployment"), WithNamespace("ns-1"), WithName("delta"))
		require.NoError(t, storeInstance.SaveComponent(diff2))

		entries, err := storeInstance.GetAppliedComponentsByGVK(gvk)
		require.NoError(t, err)

		assert.Len(t, entries, 3, "expected exactly 3 matching entries")

		names := make([]string, 0, len(entries))
		nss := make([]string, 0, len(entries))
		for _, e := range entries {
			assert.Equal(t, gvk.Group, e.Group, "all entries should have correct group")
			assert.Equal(t, gvk.Version, e.Version, "all entries should have correct version")
			assert.Equal(t, gvk.Kind, e.Kind, "all entries should have correct kind")
			names = append(names, e.Name)
			nss = append(nss, e.Namespace)
		}
		assert.ElementsMatch(t, []string{"alpha", "beta", "gamma"}, names, "expected names to match, order not guaranteed")
		assert.ElementsMatch(t, []string{"ns-1", "ns-2", "ns-3"}, nss, "expected namespaces to match, order not guaranteed")
	})
}

func TestComponentCache_DeleteComponents(t *testing.T) {
	t.Run("should delete components by group, version, and kind", func(t *testing.T) {
		deploymentsGVK := schema.GroupVersionKind{Group: "apps", Version: "v1", Kind: "Deployment"}
		servicesGVK := schema.GroupVersionKind{Group: "", Version: "v1", Kind: "Service"}

		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		// Create components with same GVK but different names/namespaces
		component1 := createComponent("uid-1", WithGVK(deploymentsGVK.Group, deploymentsGVK.Version, deploymentsGVK.Kind), WithName("deployment-1"), WithNamespace("default"))
		err = storeInstance.SaveComponent(component1)
		require.NoError(t, err)

		component2 := createComponent("uid-2",
			WithGVK(deploymentsGVK.Group, deploymentsGVK.Version, deploymentsGVK.Kind),
			WithName("deployment-2"), WithNamespace("default"))
		err = storeInstance.SaveComponent(component2)
		require.NoError(t, err)

		component3 := createComponent("uid-3",
			WithGVK(deploymentsGVK.Group, deploymentsGVK.Version, deploymentsGVK.Kind),
			WithName("deployment-3"), WithNamespace("kube-system"))
		err = storeInstance.SaveComponent(component3)
		require.NoError(t, err)

		// Create component with different GVK
		component4 := createComponent("uid-4",
			WithGVK(servicesGVK.Group, servicesGVK.Version, servicesGVK.Kind),
			WithName("service-1"), WithNamespace("default"))
		err = storeInstance.SaveComponent(component4)
		require.NoError(t, err)

		components, err := storeInstance.GetAppliedComponentsByGVK(deploymentsGVK)
		require.NoError(t, err, "failed to verify that deployments exist")
		assert.Len(t, components, 3)

		services, err := storeInstance.GetAppliedComponentsByGVK(servicesGVK)
		require.NoError(t, err, "failed to verify that services exist")
		assert.Len(t, services, 1)

		err = storeInstance.DeleteComponents(deploymentsGVK.Group, deploymentsGVK.Version, deploymentsGVK.Kind)
		require.NoError(t, err, "failed to delete deployments")

		components, err = storeInstance.GetAppliedComponentsByGVK(deploymentsGVK)
		require.NoError(t, err, "failed to verify that deployments were deleted")
		assert.Len(t, components, 0, "expected deployments to be deleted")

		services, err = storeInstance.GetAppliedComponentsByGVK(servicesGVK)
		require.NoError(t, err, "failed to verify that services exist")
		assert.Len(t, services, 1, "expected services to be unaffected")
	})

	t.Run("should handle empty group in delete operation", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		// Create components with empty group (core resources)
		err = storeInstance.SaveComponent(createComponent("job-uid-1", WithGVK("", "v1", "Job"), WithName("job-1"), WithNamespace("default")))
		require.NoError(t, err)

		err = storeInstance.SaveComponent(createComponent("job-uid-2", WithGVK("", "v1", "Job"), WithName("job-2"), WithNamespace("kube-system")))
		require.NoError(t, err)

		service := createComponent("service-uid", WithGVK("", "v1", "Service"), WithName("service-1"), WithNamespace("default"))
		err = storeInstance.SaveComponent(service)
		require.NoError(t, err)

		// Verify jobs exist
		jobs, err := storeInstance.GetAppliedComponentsByGVK(schema.GroupVersionKind{Group: "", Version: "v1", Kind: "Job"})
		require.NoError(t, err)
		assert.Len(t, jobs, 2)

		// Delete all jobs (empty group)
		err = storeInstance.DeleteComponents("", "v1", "Job")
		require.NoError(t, err)

		// Verify jobs are deleted
		jobs, err = storeInstance.GetAppliedComponentsByGVK(schema.GroupVersionKind{Group: "", Version: "v1", Kind: "Job"})
		require.NoError(t, err)
		assert.Len(t, jobs, 0)

		// Verify service still exists
		services, err := storeInstance.GetAppliedComponentsByGVK(schema.GroupVersionKind{Group: "", Version: "v1", Kind: "Service"})
		require.NoError(t, err)
		assert.Len(t, services, 1)
	})

	t.Run("should handle deletion of non-existent components gracefully", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		err = storeInstance.SaveComponent(createComponent("existing-uid", WithGVK("apps", "v1", "Deployment"), WithName("existing-deployment"), WithNamespace("default")))
		require.NoError(t, err)

		err = storeInstance.DeleteComponents("nonexistent", "v1", "NonExistentKind")
		require.NoError(t, err)

		deployments, err := storeInstance.GetAppliedComponentsByGVK(schema.GroupVersionKind{Group: "apps", Version: "v1", Kind: "Deployment"})
		require.NoError(t, err)
		assert.Len(t, deployments, 1)
	})
}

func TestComponentCache_GetServiceComponents(t *testing.T) {
	t.Run("should return components filtered by service ID", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		serviceID := "test-service-123"

		// Create components with the target service ID
		err = storeInstance.SaveComponent(createComponent("service-comp-1", WithGVK("apps", "v1", "Deployment"), WithName("app-deployment"), WithNamespace("default"), WithService(serviceID)))
		require.NoError(t, err)

		err = storeInstance.SaveComponent(createComponent("service-comp-2", WithGVK("", "v1", "Job"), WithName("app-job"), WithNamespace("default"), WithService(serviceID)))
		require.NoError(t, err)

		// Create component with different service ID
		err = storeInstance.SaveComponent(createComponent("other-comp", WithService("other-service"), WithGVK("apps", "v1", "Deployment"), WithName("other-deployment"), WithNamespace("default")))
		require.NoError(t, err)

		// Create component with no service ID
		err = storeInstance.SaveComponent(createComponent("no-service-comp", WithGVK("", "v1", "Service"), WithName("no-service"), WithNamespace("default")))
		require.NoError(t, err)

		components, err := storeInstance.GetServiceComponents(serviceID, true)
		require.NoError(t, err, "failed to get components for service")
		assert.Len(t, components, 2, "expected 2 components with matching service ID")

		foundUIDs := make(map[string]bool)
		for _, comp := range components {
			foundUIDs[comp.UID] = true
			assert.Equal(t, serviceID, comp.ServiceID, "expected component to have matching service ID")
		}

		assert.True(t, foundUIDs["service-comp-1"])
		assert.True(t, foundUIDs["service-comp-2"])
		assert.False(t, foundUIDs["other-comp"])
		assert.False(t, foundUIDs["no-service-comp"])
	})

	t.Run("should return empty slice for non-existent service ID", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		// Create some components with different service IDs
		err = storeInstance.SaveComponent(createComponent("test-comp", WithName("test-component")))
		require.NoError(t, err)

		// Try to get components for non-existent service
		components, err := storeInstance.GetServiceComponents("non-existent-service", true)
		require.NoError(t, err)
		assert.Len(t, components, 0)
	})
}

func TestComponentCache_Expire(t *testing.T) {
	t.Run("should expire SHA values for service", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		obj := newUnstructured("test-expire", "test-component", "default",
			"apps", "v1", "Deployment")

		require.NoError(t, storeInstance.SaveComponent(obj))
		require.NoError(t, storeInstance.UpdateComponentSHA(obj, store.ManifestSHA))
		require.NoError(t, storeInstance.UpdateComponentSHA(obj, store.ApplySHA))

		entry, err := storeInstance.GetAppliedComponent(obj)
		require.NoError(t, err)
		assert.NotEmpty(t, entry.ManifestSHA, "expected manifest SHA to be set")
		assert.NotEmpty(t, entry.ApplySHA, "expected apply SHA to be set")

		require.NoError(t, storeInstance.Expire("test-service"), "failed to expire SHA values for service")
	})
}

func TestComponentCache_ExpireSHA(t *testing.T) {
	t.Run("should expire SHA values for specific component", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		obj := newUnstructured("test-expire", "test-component", "default",
			"apps", "v1", "Deployment")

		require.NoError(t, storeInstance.SaveComponent(obj))
		require.NoError(t, storeInstance.UpdateComponentSHA(obj, store.ManifestSHA))
		require.NoError(t, storeInstance.UpdateComponentSHA(obj, store.TransientManifestSHA))
		require.NoError(t, storeInstance.UpdateComponentSHA(obj, store.ApplySHA))

		entry, err := storeInstance.GetAppliedComponent(obj)
		require.NoError(t, err)
		assert.NotEmpty(t, entry.ManifestSHA, "expected manifest SHA to be set")
		assert.NotEmpty(t, entry.TransientManifestSHA, "expected transient manifest SHA to be set")
		assert.NotEmpty(t, entry.ApplySHA, "expected apply SHA to be set")

		require.NoError(t, storeInstance.ExpireSHA(obj), "failed to expire SHA values for component")

		expiredEntry, err := storeInstance.GetAppliedComponent(obj)
		require.NoError(t, err)
		assert.Empty(t, expiredEntry.ManifestSHA, "expected manifest SHA to be expired")
		assert.Empty(t, expiredEntry.TransientManifestSHA, "expected transient manifest SHA to be expired")
		assert.Empty(t, expiredEntry.ApplySHA, "expected apply SHA to be expired")
		assert.NotEmpty(t, expiredEntry.ServerSHA, "server SHA should remain")
	})
}

func TestComponentCache_CommitTransientSHA(t *testing.T) {
	t.Run("should commit transient SHA to manifest SHA", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		obj := newUnstructured("test-commit-transient", "test-component", "default",
			"apps", "v1", "Deployment")

		require.NoError(t, storeInstance.SaveComponent(obj))
		require.NoError(t, storeInstance.UpdateComponentSHA(obj, store.ManifestSHA))
		require.NoError(t, storeInstance.UpdateComponentSHA(obj, store.TransientManifestSHA))

		entry, err := storeInstance.GetAppliedComponent(obj)
		require.NoError(t, err)
		transientSHA := entry.TransientManifestSHA
		assert.NotEmpty(t, entry.ManifestSHA, "initial manifest SHA should be set")
		assert.NotEmpty(t, transientSHA)

		require.NoError(t, storeInstance.CommitTransientSHA(obj), "failed to commit transient SHA")

		updatedEntry, err := storeInstance.GetAppliedComponent(obj)
		require.NoError(t, err, "failed to get updated component entry")
		assert.Equal(t, transientSHA, updatedEntry.ManifestSHA, "expected transient SHA to be committed")
		assert.Empty(t, updatedEntry.TransientManifestSHA, "transient SHA should be empty after commit")
	})
}

func TestComponentCache_SaveComponents(t *testing.T) {
	var objs []unstructured.Unstructured

	storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
	assert.NoError(t, err)
	defer func(storeInstance store.Store) {
		require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
	}(storeInstance)

	for i := 0; i < 10; i++ {
		uid := fmt.Sprintf("uid-%d", i)
		name := fmt.Sprintf("component-%d", i)
		obj := newUnstructured(uid, name, "default", "apps", "v1", "Deployment")
		objs = append(objs, obj)
	}
	require.NoError(t, storeInstance.SaveComponents(objs))

	for _, obj := range objs {
		entry, err := storeInstance.GetAppliedComponent(obj)
		require.NoError(t, err, "failed to get component %s", obj.GetName())
		require.NotNil(t, entry, "expected component %s to exist", obj.GetName())
		require.Equal(t, obj.GetName(), entry.Name, "expected component name to match")
	}
}

func newUnstructured(uid, name, namespace, group, version, kind string) unstructured.Unstructured {
	obj := unstructured.Unstructured{}
	obj.SetUID(types.UID(uid))
	obj.SetName(name)
	obj.SetNamespace(namespace)
	obj.SetGroupVersionKind(schema.GroupVersionKind{Group: group, Version: version, Kind: kind})
	return obj
}

// Helper function to create unstructured.Unstructured objects for testing
func createUnstructuredResource(group, version, kind, namespace, name string) unstructured.Unstructured {
	u := unstructured.Unstructured{}
	u.SetGroupVersionKind(schema.GroupVersionKind{
		Group:   group,
		Version: version,
		Kind:    kind,
	})
	u.SetNamespace(namespace)
	u.SetName(name)
	u.SetUID(types.UID(fmt.Sprintf("%s-%s-%s", kind, namespace, name)))
	return u
}

func createHookJob(namespace, name, serviceID string) unstructured.Unstructured {
	group := "batch"
	version := "v1"
	kind := "Job"

	u := createUnstructuredResource(group, version, kind, namespace, name)

	u.SetAnnotations(map[string]string{
		common.OwningInventoryKey:        serviceID,
		common.TrackingIdentifierKey:     common.NewKeyFromUnstructured(u).String(),
		common.SyncPhaseHookDeletePolicy: common.HookDeletePolicySucceeded,
	})

	u.Object["status"] = map[string]interface{}{
		"conditions": []interface{}{
			map[string]interface{}{
				"type":   "Complete",
				"status": "True",
			},
		},
	}

	return u
}

func TestComponentCache_ProcessedHookComponents(t *testing.T) {
	t.Run("should save and retrieve processed hook components by service ID", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func() {
			if err := storeInstance.Shutdown(); err != nil {
				t.Fatalf("Failed to close component cache: %v", err)
			}
		}()

		serviceID := "svc-basic"
		r := []unstructured.Unstructured{
			createHookJob("default", "migrator", serviceID),
			createHookJob("default", "check", serviceID),
		}

		require.NoError(t, storeInstance.SaveComponents(r))

		result, err := storeInstance.GetHookComponents(serviceID)
		require.NoError(t, err)
		require.Len(t, result, len(r))

		expect := map[string]struct {
			group, version, kind, ns string
		}{
			"migrator": {group: "batch", version: "v1", kind: "Job", ns: "default"},
			"check":    {group: "batch", version: "v1", kind: "Job", ns: "default"},
		}

		for _, m := range result {
			assert.Equal(t, serviceID, m.ServiceID)
			want := expect[m.Name]
			assert.Equal(t, want.group, m.Group)
			assert.Equal(t, want.version, m.Version)
			assert.Equal(t, want.kind, m.Kind)
			assert.Equal(t, want.ns, m.Namespace)
		}
	})

	t.Run("should return empty list for non-existent service ID", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func() {
			if err := storeInstance.Shutdown(); err != nil {
				t.Fatalf("Failed to close component cache: %v", err)
			}
		}()

		result, err := storeInstance.GetHookComponents("non-existent-service")
		require.NoError(t, err)
		require.Empty(t, result)
	})

	t.Run("should isolate hooks by service ID", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func() {
			if err := storeInstance.Shutdown(); err != nil {
				t.Fatalf("Failed to close component cache: %v", err)
			}
		}()

		serviceID1 := "svc-app1"
		serviceID2 := "svc-app2"

		hooks := []unstructured.Unstructured{
			createHookJob("default", "app1-migrator", serviceID1),
			createHookJob("default", "app1-seeder", serviceID1),
			createHookJob("default", "app2-migrator", serviceID2),
		}

		require.NoError(t, storeInstance.SaveComponents(hooks))

		// Check service 1 hooks
		result1, err := storeInstance.GetHookComponents(serviceID1)
		require.NoError(t, err)
		require.Len(t, result1, 2)
		for _, m := range result1 {
			assert.Equal(t, serviceID1, m.ServiceID)
			assert.Contains(t, []string{"app1-migrator", "app1-seeder"}, m.Name)
		}

		// Check service 2 hooks
		result2, err := storeInstance.GetHookComponents(serviceID2)
		require.NoError(t, err)
		require.Len(t, result2, 1)
		assert.Equal(t, serviceID2, result2[0].ServiceID)
		assert.Equal(t, "app2-migrator", result2[0].Name)
	})

	t.Run("should handle different hook resource types", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func() {
			if err := storeInstance.Shutdown(); err != nil {
				t.Fatalf("Failed to close component cache: %v", err)
			}
		}()

		serviceID := "svc-various-hooks"

		// Create different types of hook resources
		hookJob := createHookJob("default", "migration-job", serviceID)

		hookPod := createUnstructuredResource("", "v1", "Pod", "default", "migration-pod")
		hookPod.SetAnnotations(map[string]string{
			common.OwningInventoryKey:        serviceID,
			common.TrackingIdentifierKey:     common.NewKeyFromUnstructured(hookPod).String(),
			common.SyncPhaseHookDeletePolicy: common.HookDeletePolicySucceeded,
		})
		hookPod.Object["spec"] = map[string]interface{}{
			"nodeName": "node-1",
		}
		hookPod.Object["status"] = map[string]interface{}{
			"phase": "Succeeded",
		}

		hookConfigMap := createUnstructuredResource("", "v1", "ConfigMap", "default", "migration-config")
		hookConfigMap.SetAnnotations(map[string]string{
			common.OwningInventoryKey:        serviceID,
			common.TrackingIdentifierKey:     common.NewKeyFromUnstructured(hookConfigMap).String(),
			common.SyncPhaseHookDeletePolicy: common.HookDeletePolicySucceeded,
		})

		hooks := []unstructured.Unstructured{hookJob, hookPod, hookConfigMap}

		require.NoError(t, storeInstance.SaveComponents(hooks))

		result, err := storeInstance.GetHookComponents(serviceID)
		require.NoError(t, err)
		require.Len(t, result, 2)

		kinds := make(map[string]bool)
		for _, m := range result {
			kinds[m.Kind] = true
		}
		assert.True(t, kinds["Job"])
		assert.True(t, kinds["Pod"])
		assert.False(t, kinds["ConfigMap"]) // Should be ignored as only pods and jobs are supported now.
	})

	t.Run("should preserve UID and status information", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func() {
			if err := storeInstance.Shutdown(); err != nil {
				t.Fatalf("Failed to close component cache: %v", err)
			}
		}()

		serviceID := "svc-uid-check"
		hook := createHookJob("default", "test-hook", serviceID)
		expectedUID := hook.GetUID()

		require.NoError(t, storeInstance.SaveComponents([]unstructured.Unstructured{hook}))

		result, err := storeInstance.GetHookComponents(serviceID)
		require.NoError(t, err)
		require.Len(t, result, 1)

		assert.Equal(t, string(expectedUID), result[0].UID)
		assert.NotEmpty(t, result[0].Status)
	})

	t.Run("should handle large number of hooks", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func() {
			if err := storeInstance.Shutdown(); err != nil {
				t.Fatalf("Failed to close component cache: %v", err)
			}
		}()

		serviceID := "svc-many-hooks"
		hookCount := 50
		hooks := make([]unstructured.Unstructured, hookCount)

		for i := 0; i < hookCount; i++ {
			hooks[i] = createHookJob("default", fmt.Sprintf("hook-%d", i), serviceID)
		}

		require.NoError(t, storeInstance.SaveComponents(hooks))

		result, err := storeInstance.GetHookComponents(serviceID)
		require.NoError(t, err)
		require.Len(t, result, hookCount)

		// Verify all hooks are unique by name
		names := make(map[string]bool)
		for _, m := range result {
			names[m.Name] = true
		}
		assert.Len(t, names, hookCount)
	})
}

func TestComponentCache_SyncAppliedResource(t *testing.T) {
	t.Run("should update apply_sha and server_sha when resource is synced", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		require.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		// Create a test resource
		obj := createUnstructuredResource("apps", "v1", "Deployment", "default", "test-deployment")
		obj.Object["spec"] = map[string]interface{}{"replicas": "3"}

		// Save the component first
		require.NoError(t, storeInstance.SaveComponents([]unstructured.Unstructured{obj}))

		// Get the component before sync
		componentBefore, err := storeInstance.GetAppliedComponent(obj)
		require.NoError(t, err)
		require.NotNil(t, componentBefore)

		// Sync the applied resource
		require.NoError(t, storeInstance.SyncAppliedResource(obj))

		// Get the component after sync
		componentAfter, err := storeInstance.GetAppliedComponent(obj)
		require.NoError(t, err)
		require.NotNil(t, componentAfter)

		// Verify that apply_sha and server_sha are set and equal
		require.NotEmpty(t, componentAfter.ApplySHA)
		require.NotEmpty(t, componentAfter.ServerSHA)
		require.Equal(t, componentAfter.ApplySHA, componentAfter.ServerSHA)
	})

	t.Run("should keep manifest_sha unchanged when transient_manifest_sha is NULL", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		require.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		obj := createUnstructuredResource("apps", "v1", "StatefulSet", "default", "test-statefulset")
		obj.Object["spec"] = map[string]interface{}{"replicas": "2"}

		require.NoError(t, storeInstance.SaveComponents([]unstructured.Unstructured{obj}))

		// Get the component before sync to check manifest_sha
		componentBefore, err := storeInstance.GetAppliedComponent(obj)
		require.NoError(t, err)
		require.NotNil(t, componentBefore)
		originalManifestSHA := componentBefore.ManifestSHA

		// Sync the resource
		require.NoError(t, storeInstance.SyncAppliedResource(obj))

		// Get the component after sync
		componentAfter, err := storeInstance.GetAppliedComponent(obj)
		require.NoError(t, err)
		require.NotNil(t, componentAfter)

		// manifest_sha should remain unchanged when transient_manifest_sha is NULL
		require.Equal(t, originalManifestSHA, componentAfter.ManifestSHA)
		// transient_manifest_sha should be NULL (empty string)
		require.Empty(t, componentAfter.TransientManifestSHA)
	})

	t.Run("should update manifest_sha from transient_manifest_sha when present", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		require.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		obj := createUnstructuredResource("apps", "v1", "DaemonSet", "kube-system", "test-daemonset")
		obj.Object["spec"] = map[string]interface{}{
			"selector": map[string]interface{}{
				"matchLabels": map[string]interface{}{
					"app": "test",
				},
			},
		}

		require.NoError(t, storeInstance.SaveComponents([]unstructured.Unstructured{obj}))

		// First, set a transient_manifest_sha by calling UpdateComponentSHA
		require.NoError(t, storeInstance.UpdateComponentSHA(obj, store.TransientManifestSHA))

		// Get the component to verify transient_manifest_sha is set
		componentBeforeSync, err := storeInstance.GetAppliedComponent(obj)
		require.NoError(t, err)
		require.NotNil(t, componentBeforeSync)
		require.NotEmpty(t, componentBeforeSync.TransientManifestSHA)
		transientSHA := componentBeforeSync.TransientManifestSHA
		originalManifestSHA := componentBeforeSync.ManifestSHA

		// Sync the resource
		require.NoError(t, storeInstance.SyncAppliedResource(obj))

		// Get the component after sync
		componentAfter, err := storeInstance.GetAppliedComponent(obj)
		require.NoError(t, err)
		require.NotNil(t, componentAfter)

		// manifest_sha should now be equal to the previous transient_manifest_sha
		require.Equal(t, transientSHA, componentAfter.ManifestSHA)
		require.NotEqual(t, originalManifestSHA, componentAfter.ManifestSHA)
		// transient_manifest_sha should be cleared (NULL/empty)
		require.Empty(t, componentAfter.TransientManifestSHA)
	})

	t.Run("should clear transient_manifest_sha after sync", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		require.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		obj := createUnstructuredResource("", "v1", "ConfigMap", "default", "test-configmap")
		obj.Object["data"] = map[string]interface{}{
			"key": "value",
		}

		require.NoError(t, storeInstance.SaveComponents([]unstructured.Unstructured{obj}))
		require.NoError(t, storeInstance.UpdateComponentSHA(obj, store.TransientManifestSHA))

		// Verify transient_manifest_sha is set before sync
		componentBefore, err := storeInstance.GetAppliedComponent(obj)
		require.NoError(t, err)
		require.NotEmpty(t, componentBefore.TransientManifestSHA)

		// Sync the resource
		require.NoError(t, storeInstance.SyncAppliedResource(obj))

		// Verify transient_manifest_sha is cleared after sync
		componentAfter, err := storeInstance.GetAppliedComponent(obj)
		require.NoError(t, err)
		require.Empty(t, componentAfter.TransientManifestSHA)
	})

	t.Run("should not affect other columns during sync", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		require.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		obj := createUnstructuredResource("", "v1", "Secret", "default", "test-secret")
		obj.Object["data"] = map[string]interface{}{
			"password": "secret",
		}

		require.NoError(t, storeInstance.SaveComponents([]unstructured.Unstructured{obj}))
		require.NoError(t, storeInstance.UpdateComponentSHA(obj, store.TransientManifestSHA))

		// Get component before sync
		componentBefore, err := storeInstance.GetAppliedComponent(obj)
		require.NoError(t, err)
		require.NotNil(t, componentBefore)

		// Sync the resource
		require.NoError(t, storeInstance.SyncAppliedResource(obj))

		// Get component after sync
		componentAfter, err := storeInstance.GetAppliedComponent(obj)
		require.NoError(t, err)
		require.NotNil(t, componentAfter)

		// Verify other columns remain unchanged
		require.Equal(t, componentBefore.UID, componentAfter.UID)
		require.Equal(t, componentBefore.Group, componentAfter.Group)
		require.Equal(t, componentBefore.Version, componentAfter.Version)
		require.Equal(t, componentBefore.Kind, componentAfter.Kind)
		require.Equal(t, componentBefore.Namespace, componentAfter.Namespace)
		require.Equal(t, componentBefore.Name, componentAfter.Name)
		require.Equal(t, componentBefore.ParentUID, componentAfter.ParentUID)
		require.Equal(t, componentBefore.ServiceID, componentAfter.ServiceID)
	})

	t.Run("should handle non-existent component gracefully", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		require.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		// Create a resource but don't save it
		obj := createUnstructuredResource("apps", "v1", "Deployment", "default", "non-existent")

		// Syncing a non-existent resource should not error (UPDATE affects 0 rows)
		require.NoError(t, storeInstance.SyncAppliedResource(obj))
	})

	t.Run("should handle resources with empty group", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		require.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		// Core resources have empty group
		obj := createUnstructuredResource("", "v1", "Pod", "default", "test-pod")
		obj.Object["spec"] = map[string]interface{}{
			"containers": []interface{}{
				map[string]interface{}{
					"name":  "nginx",
					"image": "nginx:latest",
				},
			},
			"nodeName": "test-node",
		}

		require.NoError(t, storeInstance.SaveComponents([]unstructured.Unstructured{obj}))
		require.NoError(t, storeInstance.SyncAppliedResource(obj))

		component, err := storeInstance.GetAppliedComponent(obj)
		require.NoError(t, err)
		require.NotNil(t, component)
		require.NotEmpty(t, component.ApplySHA)
		require.Equal(t, component.ApplySHA, component.ServerSHA)
	})

	t.Run("should handle resources with cluster scope (empty namespace)", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		require.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		// ClusterRole has empty namespace
		obj := createUnstructuredResource("rbac.authorization.k8s.io", "v1", "ClusterRole", "", "test-clusterrole")
		obj.Object["rules"] = []interface{}{
			map[string]interface{}{
				"apiGroups": []interface{}{""},
				"resources": []interface{}{"pods"},
				"verbs":     []interface{}{"get", "list"},
			},
		}

		require.NoError(t, storeInstance.SaveComponents([]unstructured.Unstructured{obj}))
		require.NoError(t, storeInstance.SyncAppliedResource(obj))

		component, err := storeInstance.GetAppliedComponent(obj)
		require.NoError(t, err)
		require.NotNil(t, component)
		require.NotEmpty(t, component.ApplySHA)
		require.Equal(t, component.ApplySHA, component.ServerSHA)
	})
}

func TestComponentCache_SetServiceChildren(t *testing.T) {
	t.Run("should return 0 if component doesn't exist", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		require.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		// Create a test resource
		obj := createUnstructuredResource("apps", "v1", "Deployment", "default", "test-deployment")

		updated, err := storeInstance.SetServiceChildren("abc", "123", []common.StoreKey{
			{
				GVK:       obj.GroupVersionKind(),
				Namespace: obj.GetNamespace(),
				Name:      obj.GetName(),
			},
		})
		require.NoError(t, err)
		require.Equal(t, 0, updated)
	})

	t.Run("should update the component", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		require.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		// Create a test resource
		obj := createUnstructuredResource("apps", "v1", "Deployment", "default", "existing-deployment")
		require.NoError(t, storeInstance.SaveComponents([]unstructured.Unstructured{obj}))

		updated, err := storeInstance.SetServiceChildren("abc", "123", []common.StoreKey{
			{
				GVK:       obj.GroupVersionKind(),
				Namespace: obj.GetNamespace(),
				Name:      obj.GetName(),
			},
		})

		// Update the component
		require.NoError(t, err)
		require.Equal(t, 1, updated)

		// Get the component before sync
		componentBefore, err := storeInstance.GetAppliedComponent(obj)
		require.NoError(t, err)
		require.NotNil(t, componentBefore)
		require.Equal(t, componentBefore.ServiceID, "abc")
		require.Equal(t, componentBefore.ParentUID, "123")
	})
}

func TestComponentCache_GetComponentAttributes(t *testing.T) {
	t.Run("should return component attributes for service", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		serviceID := "test-service-attrs"

		// Create components with the target service ID
		err = storeInstance.SaveComponent(createComponent("comp-1", WithGVK("apps", "v1", "Deployment"), WithName("deployment-1"), WithNamespace("default"), WithService(serviceID)))
		require.NoError(t, err)

		err = storeInstance.SaveComponent(createComponent("comp-2", WithGVK("", "v1", "Service"), WithName("service-1"), WithNamespace("default"), WithService(serviceID)))
		require.NoError(t, err)

		attributes, err := storeInstance.GetComponentAttributes(serviceID, true)
		require.NoError(t, err)
		assert.Len(t, attributes, 2)

		// Verify attributes have correct values
		foundUIDs := make(map[string]bool)
		for _, attr := range attributes {
			foundUIDs[lo.FromPtr(attr.UID)] = true
			assert.True(t, attr.Synced)
		}
		assert.True(t, foundUIDs["comp-1"])
		assert.True(t, foundUIDs["comp-2"])
	})

	t.Run("should return empty slice for non-existent service", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		attributes, err := storeInstance.GetComponentAttributes("non-existent-service", true)
		require.NoError(t, err)
		assert.Len(t, attributes, 0)
	})

	t.Run("should include children in component attributes", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		serviceID := "test-service-with-children"

		// Create parent component
		parentUID := "parent-comp"
		err = storeInstance.SaveComponent(createComponent(parentUID, WithGVK("apps", "v1", "Deployment"), WithName("deployment-parent"), WithNamespace("default"), WithService(serviceID)))
		require.NoError(t, err)

		// Create child component
		childUID := "child-comp"
		err = storeInstance.SaveComponent(createComponent(childUID, WithGVK("apps", "v1", "ReplicaSet"), WithName("deployment-rs"), WithNamespace("default"), WithParent(parentUID), WithService(serviceID)))
		require.NoError(t, err)

		attributes, err := storeInstance.GetComponentAttributes(serviceID, false)
		require.NoError(t, err)
		assert.Len(t, attributes, 1)

		// Find parent and verify it has children
		for _, attr := range attributes {
			if lo.FromPtr(attr.UID) == parentUID {
				assert.NotNil(t, attr.Children)
				assert.Len(t, attr.Children, 1)
				assert.Equal(t, childUID, attr.Children[0].UID)
			}
		}
	})

	t.Run("should exclude hook components with deletion policy that reached desired state", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		serviceID := "test-service-hooks"

		// Create regular component
		err = storeInstance.SaveComponent(createComponent("regular-comp", WithGVK("apps", "v1", "Deployment"), WithName("regular-deployment"), WithNamespace("default"), WithService(serviceID)))
		require.NoError(t, err)

		// Create hook component that reached desired state (succeeded with delete policy "Succeeded")
		hookJob := createHookJob("default", "migration-job", serviceID)
		err = storeInstance.SaveComponent(hookJob)
		require.NoError(t, err)

		attributes, err := storeInstance.GetComponentAttributes(serviceID, false)
		require.NoError(t, err)

		// Should include regular component but exclude hook that reached desired state
		assert.Len(t, attributes, 1)
		assert.Equal(t, "regular-comp", lo.FromPtr(attributes[0].UID))
	})

	t.Run("should include hook components that have not reached desired state", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		serviceID := "test-service-hooks-not-reached"

		// Create regular component
		err = storeInstance.SaveComponent(createComponent("regular-comp-2", WithGVK("apps", "v1", "Deployment"), WithName("regular-deployment-2"), WithNamespace("default"), WithService(serviceID)))
		require.NoError(t, err)

		// Create hook component that has NOT reached desired state (running/pending)
		hookJob := createHookJobPending("default", "pending-job", serviceID)
		err = storeInstance.SaveComponent(hookJob)
		require.NoError(t, err)

		attributes, err := storeInstance.GetComponentAttributes(serviceID, false)
		require.NoError(t, err)

		// Should include both components since hook has not reached desired state
		assert.Len(t, attributes, 2)

		foundUIDs := make(map[string]bool)
		for _, attr := range attributes {
			foundUIDs[lo.FromPtr(attr.UID)] = true
		}
		assert.True(t, foundUIDs["regular-comp-2"])
		assert.True(t, foundUIDs[fmt.Sprintf("%s-%s-%s", "Job", "default", "pending-job")])
	})

	t.Run("should handle multiple services with mixed hook states", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		serviceID1 := "test-service-multi-1"
		serviceID2 := "test-service-multi-2"

		// Service 1: regular component + succeeded hook
		err = storeInstance.SaveComponent(createComponent("svc1-regular", WithGVK("apps", "v1", "Deployment"), WithName("svc1-deployment"), WithNamespace("default"), WithService(serviceID1)))
		require.NoError(t, err)
		err = storeInstance.SaveComponent(createHookJob("default", "svc1-hook", serviceID1))
		require.NoError(t, err)

		// Service 2: regular component + pending hook
		err = storeInstance.SaveComponent(createComponent("svc2-regular", WithGVK("apps", "v1", "Deployment"), WithName("svc2-deployment"), WithNamespace("default"), WithService(serviceID2)))
		require.NoError(t, err)
		err = storeInstance.SaveComponent(createHookJobPending("default", "svc2-hook", serviceID2))
		require.NoError(t, err)

		// Get attributes for service 1
		attrs1, err := storeInstance.GetComponentAttributes(serviceID1, false)
		require.NoError(t, err)
		assert.Len(t, attrs1, 1) // Only regular component, hook excluded

		// Get attributes for service 2
		attrs2, err := storeInstance.GetComponentAttributes(serviceID2, false)
		require.NoError(t, err)
		assert.Len(t, attrs2, 2) // Both components, hook included
	})

	t.Run("should return correct component attributes fields", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		serviceID := "test-service-fields"

		err = storeInstance.SaveComponent(createComponent("field-test-comp", WithGVK("apps", "v1", "Deployment"), WithName("test-deployment"), WithNamespace("test-ns"), WithService(serviceID)))
		require.NoError(t, err)

		attributes, err := storeInstance.GetComponentAttributes(serviceID, true)
		require.NoError(t, err)
		require.Len(t, attributes, 1)

		attr := attributes[0]
		assert.Equal(t, "field-test-comp", lo.FromPtr(attr.UID))
		assert.Equal(t, "apps", attr.Group)
		assert.Equal(t, "v1", attr.Version)
		assert.Equal(t, "Deployment", attr.Kind)
		assert.Equal(t, "test-deployment", attr.Name)
		assert.Equal(t, "test-ns", attr.Namespace)
		assert.True(t, attr.Synced)
	})

	t.Run("should handle nested children hierarchy", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		serviceID := "test-service-nested"

		// Create parent
		parentUID := "nested-parent"
		err = storeInstance.SaveComponent(createComponent(parentUID, WithGVK("apps", "v1", "Deployment"), WithName("deployment-parent"), WithNamespace("default"), WithService(serviceID)))
		require.NoError(t, err)

		// Create child level 1
		child1UID := "nested-child-1"
		err = storeInstance.SaveComponent(createComponent(child1UID, WithGVK("apps", "v1", "ReplicaSet"), WithName("nested-rs"), WithNamespace("default"), WithParent(parentUID), WithService(serviceID)))
		require.NoError(t, err)

		// Create child level 2
		child2UID := "nested-child-2"
		err = storeInstance.SaveComponent(createComponent(child2UID, WithGVK("", "v1", "Secret"), WithName("nested-secret"), WithNamespace("default"), WithParent(child1UID), WithService(serviceID)))
		require.NoError(t, err)

		attributes, err := storeInstance.GetComponentAttributes(serviceID, false)
		require.NoError(t, err)
		assert.Len(t, attributes, 1)

		// Find parent and verify children are populated
		for _, attr := range attributes {
			if lo.FromPtr(attr.UID) == parentUID {
				assert.NotNil(t, attr.Children)
				assert.Equal(t, len(attr.Children), 2)
			}
		}
	})
}

func TestComponentCache_GetServiceComponentsWithChildren(t *testing.T) {
	t.Run("should return top-level service components with children", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		serviceID := "test-svc-with-children"

		// Create parent component (top-level)
		parentUID := "parent-comp"
		err = storeInstance.SaveComponent(createComponent(parentUID, WithGVK("apps", "v1", "Deployment"), WithName("deployment-parent"), WithNamespace("default"), WithService(serviceID)))
		require.NoError(t, err)

		// Create child component
		childUID := "child-comp"
		err = storeInstance.SaveComponent(createComponent(childUID, WithGVK("apps", "v1", "ReplicaSet"), WithName("deployment-rs"), WithNamespace("default"), WithParent(parentUID), WithService(serviceID)))
		require.NoError(t, err)

		attributes, err := storeInstance.GetServiceComponentsWithChildren(serviceID, true)
		require.NoError(t, err)
		assert.Len(t, attributes, 1, "Should return only 1 top-level component")

		// Find parent and verify it has children
		attr := attributes[0]
		assert.Equal(t, parentUID, lo.FromPtr(attr.UID))
		assert.NotNil(t, attr.Children)
		assert.Len(t, attr.Children, 1)
		assert.Equal(t, childUID, attr.Children[0].UID)
	})

	t.Run("should return children up to 4 levels deep", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		serviceID := "test-svc-multi-level"

		// Root (top-level service component)
		rootUID := "root-uid"
		err = storeInstance.SaveComponent(createComponent(rootUID, WithName("root-component"), WithService(serviceID)))
		require.NoError(t, err)

		// Level 1
		uid1 := "uid-1"
		err = storeInstance.SaveComponent(createComponent(uid1, WithParent(rootUID), WithName("level-1-component")))
		require.NoError(t, err)

		// Level 2
		uid2 := "uid-2"
		err = storeInstance.SaveComponent(createComponent(uid2, WithParent(uid1), WithName("level-2-component")))
		require.NoError(t, err)

		// Level 3
		uid3 := "uid-3"
		err = storeInstance.SaveComponent(createComponent(uid3, WithParent(uid2), WithName("level-3-component")))
		require.NoError(t, err)

		// Level 4
		uid4 := "uid-4"
		err = storeInstance.SaveComponent(createComponent(uid4, WithParent(uid3), WithName("level-4-component")))
		require.NoError(t, err)

		// Level 5 (should NOT be included - exceeds 4 levels)
		uid5 := "uid-5"
		err = storeInstance.SaveComponent(createComponent(uid5, WithParent(uid4), WithName("level-5-component")))
		require.NoError(t, err)

		attributes, err := storeInstance.GetServiceComponentsWithChildren(serviceID, true)
		require.NoError(t, err)
		assert.Len(t, attributes, 1, "Should return only 1 top-level component")

		attr := attributes[0]
		assert.Equal(t, rootUID, lo.FromPtr(attr.UID))
		assert.NotNil(t, attr.Children)
		assert.Len(t, attr.Children, 4, "Should include children up to level 4 only")

		// Verify all 4 levels are present
		childUIDs := make([]string, 0, len(attr.Children))
		for _, child := range attr.Children {
			childUIDs = append(childUIDs, child.UID)
		}
		assert.Contains(t, childUIDs, uid1)
		assert.Contains(t, childUIDs, uid2)
		assert.Contains(t, childUIDs, uid3)
		assert.Contains(t, childUIDs, uid4)
		assert.NotContains(t, childUIDs, uid5, "Level 5 should not be included")
	})

	t.Run("should return multiple top-level components with their respective children", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		serviceID := "test-svc-multiple-parents"

		// First parent with children
		parent1UID := "parent1-uid"
		err = storeInstance.SaveComponent(createComponent(parent1UID, WithGVK("apps", "v1", "Deployment"), WithName("deployment-1"), WithNamespace("default"), WithService(serviceID)))
		require.NoError(t, err)

		child1UID := "child1-uid"
		err = storeInstance.SaveComponent(createComponent(child1UID, WithGVK("apps", "v1", "ReplicaSet"), WithName("rs-1"), WithNamespace("default"), WithParent(parent1UID)))
		require.NoError(t, err)

		// Second parent with children
		parent2UID := "parent2-uid"
		err = storeInstance.SaveComponent(createComponent(parent2UID, WithGVK("apps", "v1", "StatefulSet"), WithName("statefulset-1"), WithNamespace("default"), WithService(serviceID)))
		require.NoError(t, err)

		child2UID := "child2-uid"
		err = storeInstance.SaveComponent(createComponent(child2UID, WithGVK("", "v1", "Secret"), WithName("secret-1"), WithNamespace("default"), WithParent(parent2UID)))
		require.NoError(t, err)

		child3UID := "child3-uid"
		err = storeInstance.SaveComponent(createComponent(child3UID, WithGVK("", "v1", "Secret"), WithName("secret-2"), WithNamespace("default"), WithParent(parent2UID)))
		require.NoError(t, err)

		attributes, err := storeInstance.GetServiceComponentsWithChildren(serviceID, true)
		require.NoError(t, err)
		assert.Len(t, attributes, 2, "Should return 2 top-level components")

		// Build map for easier verification
		attrMap := make(map[string]client.ComponentAttributes)
		for _, a := range attributes {
			attrMap[lo.FromPtr(a.UID)] = a
		}

		// Verify first parent has 1 child
		assert.Contains(t, attrMap, parent1UID)
		assert.Len(t, attrMap[parent1UID].Children, 1)
		assert.Equal(t, child1UID, attrMap[parent1UID].Children[0].UID)

		// Verify second parent has 2 children
		assert.Contains(t, attrMap, parent2UID)
		assert.Len(t, attrMap[parent2UID].Children, 2)
	})

	t.Run("should not include components from other services", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		serviceID1 := "svc-1"
		serviceID2 := "svc-2"

		// Component for service 1
		parent1UID := "service1-parent"
		err = storeInstance.SaveComponent(createComponent(parent1UID, WithGVK("apps", "v1", "Deployment"), WithName("deployment-s1"), WithNamespace("default"), WithService(serviceID1)))
		require.NoError(t, err)

		// Component for service 2
		parent2UID := "service2-parent"
		err = storeInstance.SaveComponent(createComponent(parent2UID, WithGVK("apps", "v1", "Deployment"), WithName("deployment-s2"), WithNamespace("default"), WithService(serviceID2)))
		require.NoError(t, err)

		// Get components for service 1 only
		attributes, err := storeInstance.GetServiceComponentsWithChildren(serviceID1, true)
		require.NoError(t, err)
		assert.Len(t, attributes, 1)
		assert.Equal(t, parent1UID, lo.FromPtr(attributes[0].UID))
	})

	t.Run("should filter by onlyApplied when true", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		serviceID := "test-svc-applied"

		// Create applied component
		appliedUID := "applied-comp"
		err = storeInstance.SaveComponent(createComponent(appliedUID, WithGVK("apps", "v1", "Deployment"), WithName("applied-deployment"), WithNamespace("default"), WithService(serviceID)))
		require.NoError(t, err)

		// Get only applied components
		attributes, err := storeInstance.GetServiceComponentsWithChildren(serviceID, true)
		require.NoError(t, err)
		assert.Len(t, attributes, 1)
		assert.Equal(t, appliedUID, lo.FromPtr(attributes[0].UID))
	})

	t.Run("should return empty result for service with no components", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		attributes, err := storeInstance.GetServiceComponentsWithChildren("non-existent-service", true)
		require.NoError(t, err)
		assert.Len(t, attributes, 0)
	})

	t.Run("should handle component with no children", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		serviceID := "test-svc-no-children"

		// Create component without children
		parentUID := "lonely-comp"
		err = storeInstance.SaveComponent(createComponent(parentUID, WithGVK("apps", "v1", "Deployment"), WithName("lonely-deployment"), WithNamespace("default"), WithService(serviceID)))
		require.NoError(t, err)

		attributes, err := storeInstance.GetServiceComponentsWithChildren(serviceID, true)
		require.NoError(t, err)
		assert.Len(t, attributes, 1)
		assert.Equal(t, parentUID, lo.FromPtr(attributes[0].UID))
		assert.Empty(t, attributes[0].Children)
	})

	t.Run("should preserve parent_uid in children", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func(storeInstance store.Store) {
			require.NoError(t, storeInstance.Shutdown(), "failed to shutdown store")
		}(storeInstance)

		serviceID := "test-svc-parent-uid"

		// Root
		rootUID := "root"
		err = storeInstance.SaveComponent(createComponent(rootUID, WithName("root"), WithService(serviceID)))
		require.NoError(t, err)

		// Level 1
		level1UID := "level1"
		err = storeInstance.SaveComponent(createComponent(level1UID, WithParent(rootUID), WithName("level1")))
		require.NoError(t, err)

		// Level 2
		level2UID := "level2"
		err = storeInstance.SaveComponent(createComponent(level2UID, WithParent(level1UID), WithName("level2")))
		require.NoError(t, err)

		attributes, err := storeInstance.GetServiceComponentsWithChildren(serviceID, true)
		require.NoError(t, err)
		assert.Len(t, attributes, 1)

		// Verify parent_uid is preserved correctly
		childMap := make(map[string]*client.ComponentChildAttributes)
		for i := range attributes[0].Children {
			childMap[attributes[0].Children[i].UID] = attributes[0].Children[i]
		}

		assert.Equal(t, rootUID, lo.FromPtr(childMap[level1UID].ParentUID))
		assert.Equal(t, level1UID, lo.FromPtr(childMap[level2UID].ParentUID))
	})
}

// createHookJobPending creates a hook job that is still running/pending (has not reached desired state)
func createHookJobPending(namespace, name, serviceID string) unstructured.Unstructured {
	group := "batch"
	version := "v1"
	kind := "Job"

	u := createUnstructuredResource(group, version, kind, namespace, name)

	u.SetAnnotations(map[string]string{
		common.OwningInventoryKey:        serviceID,
		common.TrackingIdentifierKey:     common.NewKeyFromUnstructured(u).String(),
		common.SyncPhaseHookDeletePolicy: common.HookDeletePolicySucceeded,
	})

	// Set status to indicate job is still running (not complete/failed)
	u.Object["status"] = map[string]interface{}{
		"active": "1",
		"conditions": []interface{}{
			map[string]interface{}{
				"type":   "Running",
				"status": "True",
			},
		},
	}

	return u
}
