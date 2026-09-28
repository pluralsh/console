package applier

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/dynamic/fake"
	ktesting "k8s.io/client-go/testing"

	client "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/streamline"
	smcommon "github.com/pluralsh/console/go/deployment-operator/pkg/streamline/common"
	"github.com/pluralsh/console/go/deployment-operator/pkg/streamline/store"
)

func TestDestroyDeletionOptions(t *testing.T) {
	const serviceID = "service-id"

	tests := []struct {
		name         string
		annotations  map[string]string
		wantRetained bool
	}{
		{
			name: "plural delete false",
			annotations: map[string]string{
				smcommon.SyncOptionsAnnotation: "Delete=False",
			},
			wantRetained: true,
		},
		{
			name: "argo delete false",
			annotations: map[string]string{
				smcommon.ArgoSyncOptionsAnnotation: "Delete=False",
			},
			wantRetained: true,
		},
		{
			name: "plural detach",
			annotations: map[string]string{
				smcommon.SyncOptionsAnnotation: smcommon.SyncOptionDetach,
			},
			wantRetained: true,
		},
		{
			name: "lifecycle detach",
			annotations: map[string]string{
				smcommon.LifecycleDeleteAnnotation: smcommon.PreventDeletion,
			},
			wantRetained: true,
		},
		{
			name: "prune false only applies to manifest removal",
			annotations: map[string]string{
				smcommon.SyncOptionsAnnotation: "Prune=False",
			},
		},
		{
			name: "argo detach is not a Plural detach option",
			annotations: map[string]string{
				smcommon.ArgoSyncOptionsAnnotation: smcommon.SyncOptionDetach,
			},
		},
		{
			name: "plural delete option takes precedence",
			annotations: map[string]string{
				smcommon.SyncOptionsAnnotation:     "Delete=True",
				smcommon.ArgoSyncOptionsAnnotation: "Delete=False",
			},
		},
		{
			name: "without retention annotations",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := context.Background()
			storeInstance, err := store.NewDatabaseStore(ctx)
			require.NoError(t, err)
			t.Cleanup(func() {
				require.NoError(t, storeInstance.Shutdown())
			})

			resource := makeResource("")
			resource.SetUID(types.UID("example-uid"))
			annotations := map[string]string{
				smcommon.OwningInventoryKey:    serviceID,
				smcommon.TrackingIdentifierKey: smcommon.NewKeyFromUnstructured(resource).String(),
			}
			for key, value := range tt.annotations {
				annotations[key] = value
			}
			resource.SetAnnotations(annotations)
			require.NoError(t, storeInstance.SaveComponent(resource))
			components, err := storeInstance.GetServiceComponents(serviceID, true)
			require.NoError(t, err)
			require.Len(t, components, 1)

			client := fake.NewSimpleDynamicClient(runtime.NewScheme(), &resource)
			applier := NewApplier(client, nil, storeInstance)
			_, err = applier.Destroy(ctx, serviceID)
			require.NoError(t, err)

			var updateAction ktesting.UpdateAction
			deleteCalled := false
			for _, action := range client.Actions() {
				switch action.GetVerb() {
				case "update":
					updateAction, _ = action.(ktesting.UpdateAction)
				case "delete":
					deleteCalled = true
				}
			}

			assert.Equal(t, tt.wantRetained, updateAction != nil)
			assert.Equal(t, !tt.wantRetained, deleteCalled)
			if tt.wantRetained {
				require.NotNil(t, updateAction)
				assert.Equal(t, "default", updateAction.GetNamespace())

				updated, ok := updateAction.GetObject().(*unstructured.Unstructured)
				require.True(t, ok)
				assert.NotContains(t, updated.GetAnnotations(), smcommon.OwningInventoryKey)
			}
		})
	}
}

func TestPruneFalseRetainsInventoryUntilDestroy(t *testing.T) {
	const serviceID = "service-id"

	ctx := context.Background()
	storeInstance, err := store.NewDatabaseStore(ctx)
	require.NoError(t, err)
	streamline.ResetGlobalStore()
	streamline.InitGlobalStore(storeInstance)
	t.Cleanup(func() {
		streamline.ResetGlobalStore()
		require.NoError(t, storeInstance.Shutdown())
	})

	resource := makeResource("Prune=False")
	resource.SetUID(types.UID("example-uid"))
	annotations := resource.GetAnnotations()
	annotations[smcommon.OwningInventoryKey] = serviceID
	annotations[smcommon.TrackingIdentifierKey] = smcommon.NewKeyFromUnstructured(resource).String()
	resource.SetAnnotations(annotations)
	require.NoError(t, storeInstance.SaveComponent(resource))

	dynamicClient := fake.NewSimpleDynamicClient(runtime.NewScheme(), &resource)
	applier := NewApplier(dynamicClient, nil, storeInstance)
	_, _, err = applier.Apply(ctx, client.ServiceDeploymentForAgent{ID: serviceID, Name: "example"}, nil)
	require.NoError(t, err)

	removalActions := dynamicClient.Actions()
	require.Len(t, removalActions, 1)
	assert.Equal(t, "get", removalActions[0].GetVerb())

	components, err := storeInstance.GetServiceComponents(serviceID, true)
	require.NoError(t, err)
	require.Len(t, components, 1)
	assert.Equal(t, resource.GetName(), components[0].Name)

	_, err = applier.Destroy(ctx, serviceID)
	require.NoError(t, err)

	var deleteAction ktesting.DeleteAction
	for _, action := range dynamicClient.Actions() {
		if action.GetVerb() == "delete" {
			deleteAction, _ = action.(ktesting.DeleteAction)
		}
	}
	require.NotNil(t, deleteAction)
	assert.Equal(t, resource.GetName(), deleteAction.GetName())
}
