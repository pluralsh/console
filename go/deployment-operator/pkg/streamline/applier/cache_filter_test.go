package applier

import (
	"context"
	"testing"

	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"

	"github.com/pluralsh/deployment-operator/pkg/common"
	"github.com/pluralsh/deployment-operator/pkg/streamline"
	"github.com/pluralsh/deployment-operator/pkg/streamline/store"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCacheFilter(t *testing.T) {
	const (
		resourceName = "test-filter"
		namespace    = "default"
	)

	setupTest := func(t *testing.T) (store.Store, unstructured.Unstructured, func()) {
		// Ensure no leftover global from previous test
		streamline.ResetGlobalStore()

		storeInstance, err := store.NewDatabaseStore(context.Background())
		require.NoError(t, err, "failed to create store")

		streamline.InitGlobalStore(storeInstance)

		pod := v1.Pod{
			ObjectMeta: metav1.ObjectMeta{
				Name:      resourceName,
				Namespace: namespace,
				UID:       "test-uid-123",
				Labels:    map[string]string{common.ManagedByLabel: common.AgentLabelValue},
			},
			Spec: v1.PodSpec{
				Containers: []v1.Container{{Name: "test", Image: "test:v1"}},
			},
		}

		res, err := runtime.DefaultUnstructuredConverter.ToUnstructured(&pod)
		require.NoError(t, err, "failed to convert pod to unstructured")

		unstructuredPod := unstructured.Unstructured{Object: res}

		cleanup := func() {
			// Clear global store so later tests don’t reuse a closed DB
			streamline.ResetGlobalStore()

			if storeInstance != nil {
				err := storeInstance.Shutdown()
				require.NoError(t, err)
			}
		}

		return storeInstance, unstructuredPod, cleanup
	}

	t.Run("should return true for discoveryCache miss when component not in store", func(t *testing.T) {
		storeInstance, unstructuredPod, cleanup := setupTest(t)
		streamline.InitGlobalStore(storeInstance)
		defer cleanup()

		assert.True(t, CacheFilter()(unstructuredPod), "expected discoveryCache miss when first applying resource")
	})

	t.Run("should return true for discoveryCache miss when component has no SHA", func(t *testing.T) {
		storeInstance, unstructuredPod, cleanup := setupTest(t)
		// Always reset the global store to this new instance
		streamline.InitGlobalStore(storeInstance)
		defer cleanup()

		err := storeInstance.SaveComponent(unstructuredPod)
		require.NoError(t, err, "failed to save component")

		assert.True(t, CacheFilter()(unstructuredPod), "expected discoveryCache miss when component has no SHA")
	})

	t.Run("should return false for discoveryCache hit when manifest hasn't changed", func(t *testing.T) {
		storeInstance, unstructuredPod, cleanup := setupTest(t)
		// Always reset the global store to this new instance
		streamline.InitGlobalStore(storeInstance)
		defer cleanup()

		err := storeInstance.SaveComponent(unstructuredPod)
		require.NoError(t, err, "failed to save component")

		err = storeInstance.UpdateComponentSHA(unstructuredPod, store.ManifestSHA)
		require.NoError(t, err, "failed to set manifest SHA to simulate previous apply")

		err = storeInstance.UpdateComponentSHA(unstructuredPod, store.ApplySHA)
		require.NoError(t, err, "failed to set apply SHA")

		err = storeInstance.UpdateComponentSHA(unstructuredPod, store.ServerSHA)
		require.NoError(t, err, "failed to set server SHA, same as apply SHA to simulate no drift")

		assert.False(t, CacheFilter()(unstructuredPod), "expected discoveryCache hit when manifest hasn't changed")
	})

	t.Run("should return true for discoveryCache miss when manifest has changed", func(t *testing.T) {
		storeInstance, unstructuredPod, cleanup := setupTest(t)
		defer cleanup()

		err := storeInstance.SaveComponent(unstructuredPod)
		require.NoError(t, err, "failed to save component")

		err = storeInstance.UpdateComponentSHA(unstructuredPod, store.ManifestSHA)
		require.NoError(t, err, "failed to set manifest SHA to simulate previous apply")

		err = storeInstance.UpdateComponentSHA(unstructuredPod, store.ApplySHA)
		require.NoError(t, err, "failed to set apply SHA")

		err = storeInstance.UpdateComponentSHA(unstructuredPod, store.ServerSHA)
		require.NoError(t, err, "failed to set server SHA, same as apply SHA to simulate no drift")

		pod := v1.Pod{
			ObjectMeta: metav1.ObjectMeta{
				Name:      resourceName,
				Namespace: namespace,
				UID:       "test-uid-123",
				Labels:    map[string]string{common.ManagedByLabel: common.AgentLabelValue},
			},
			Spec: v1.PodSpec{Containers: []v1.Container{{Name: "test", Image: "test:v2"}}},
		}
		res, err := runtime.DefaultUnstructuredConverter.ToUnstructured(&pod)
		require.NoError(t, err, "failed to convert pod to unstructured")
		modifiedPod := unstructured.Unstructured{Object: res}

		assert.True(t, CacheFilter()(modifiedPod), "expected discoveryCache miss when manifest has changed (different image)")
	})

	t.Run("should return true for discoveryCache miss when server SHA differs from apply SHA", func(t *testing.T) {
		storeInstance, unstructuredPod, cleanup := setupTest(t)
		defer cleanup()

		err := storeInstance.SaveComponent(unstructuredPod)
		require.NoError(t, err, "failed to save component")

		err = storeInstance.UpdateComponentSHA(unstructuredPod, store.ManifestSHA)
		require.NoError(t, err, "failed to set manifest SHA to simulate previous apply")

		err = storeInstance.UpdateComponentSHA(unstructuredPod, store.ApplySHA)
		require.NoError(t, err, "failed to set apply SHA")

		pod := v1.Pod{
			ObjectMeta: metav1.ObjectMeta{
				Name:      resourceName,
				Namespace: namespace,
				UID:       "test-uid-123",
				Labels:    map[string]string{common.ManagedByLabel: common.AgentLabelValue},
			},
			Spec: v1.PodSpec{Containers: []v1.Container{{Name: "test", Image: "test:drifted"}}},
		}
		res, err := runtime.DefaultUnstructuredConverter.ToUnstructured(&pod)
		require.NoError(t, err, "failed to convert pod to unstructured")
		driftedPod := unstructured.Unstructured{Object: res}

		err = storeInstance.UpdateComponentSHA(driftedPod, store.ServerSHA)
		require.NoError(t, err, "failed to set server SHA")

		assert.True(t, CacheFilter()(unstructuredPod), "expected discoveryCache miss when server SHA differs from apply SHA")
	})

	t.Run("should update transient manifest SHA on each call", func(t *testing.T) {
		storeInstance, unstructuredPod, cleanup := setupTest(t)
		defer cleanup()

		err := storeInstance.SaveComponent(unstructuredPod)
		require.NoError(t, err, "failed to save component")

		CacheFilter()(unstructuredPod)

		entry, err := storeInstance.GetAppliedComponent(unstructuredPod)
		require.NoError(t, err, "failed to get component")
		assert.NotEmpty(t, entry.TransientManifestSHA, "expected transient manifest SHA to be set after filter call")
	})
}
