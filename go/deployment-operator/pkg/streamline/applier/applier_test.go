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
