package applier

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/watch"
	"k8s.io/client-go/dynamic/fake"
	ktesting "k8s.io/client-go/testing"

	console "github.com/pluralsh/console/go/client"
	discoverycache "github.com/pluralsh/console/go/deployment-operator/pkg/cache/discovery"
	"github.com/pluralsh/console/go/deployment-operator/pkg/streamline"
	smcommon "github.com/pluralsh/console/go/deployment-operator/pkg/streamline/common"
	"github.com/pluralsh/console/go/deployment-operator/pkg/streamline/store"
)

type fakeResourceInterface struct {
	calls []string

	createFn           func(context.Context, *unstructured.Unstructured, metav1.CreateOptions, ...string) (*unstructured.Unstructured, error)
	updateFn           func(context.Context, *unstructured.Unstructured, metav1.UpdateOptions, ...string) (*unstructured.Unstructured, error)
	updateStatusFn     func(context.Context, *unstructured.Unstructured, metav1.UpdateOptions) (*unstructured.Unstructured, error)
	deleteFn           func(context.Context, string, metav1.DeleteOptions, ...string) error
	deleteCollectionFn func(context.Context, metav1.DeleteOptions, metav1.ListOptions) error
	getFn              func(context.Context, string, metav1.GetOptions, ...string) (*unstructured.Unstructured, error)
	listFn             func(context.Context, metav1.ListOptions) (*unstructured.UnstructuredList, error)
	watchFn            func(context.Context, metav1.ListOptions) (watch.Interface, error)
	patchFn            func(context.Context, string, types.PatchType, []byte, metav1.PatchOptions, ...string) (*unstructured.Unstructured, error)
	applyFn            func(context.Context, string, *unstructured.Unstructured, metav1.ApplyOptions, ...string) (*unstructured.Unstructured, error)
	applyStatusFn      func(context.Context, string, *unstructured.Unstructured, metav1.ApplyOptions) (*unstructured.Unstructured, error)
}

func (f *fakeResourceInterface) Create(ctx context.Context, obj *unstructured.Unstructured, options metav1.CreateOptions, subresources ...string) (*unstructured.Unstructured, error) {
	f.calls = append(f.calls, "create")
	if f.createFn != nil {
		return f.createFn(ctx, obj, options, subresources...)
	}
	return obj.DeepCopy(), nil
}

func (f *fakeResourceInterface) Update(ctx context.Context, obj *unstructured.Unstructured, options metav1.UpdateOptions, subresources ...string) (*unstructured.Unstructured, error) {
	f.calls = append(f.calls, "update")
	if f.updateFn != nil {
		return f.updateFn(ctx, obj, options, subresources...)
	}
	return obj.DeepCopy(), nil
}

func (f *fakeResourceInterface) UpdateStatus(ctx context.Context, obj *unstructured.Unstructured, options metav1.UpdateOptions) (*unstructured.Unstructured, error) {
	f.calls = append(f.calls, "update-status")
	if f.updateStatusFn != nil {
		return f.updateStatusFn(ctx, obj, options)
	}
	return obj.DeepCopy(), nil
}

func (f *fakeResourceInterface) Delete(ctx context.Context, name string, options metav1.DeleteOptions, subresources ...string) error {
	f.calls = append(f.calls, "delete")
	if f.deleteFn != nil {
		return f.deleteFn(ctx, name, options, subresources...)
	}
	return nil
}

func (f *fakeResourceInterface) DeleteCollection(ctx context.Context, options metav1.DeleteOptions, listOptions metav1.ListOptions) error {
	f.calls = append(f.calls, "delete-collection")
	if f.deleteCollectionFn != nil {
		return f.deleteCollectionFn(ctx, options, listOptions)
	}
	return nil
}

func (f *fakeResourceInterface) Get(ctx context.Context, name string, options metav1.GetOptions, subresources ...string) (*unstructured.Unstructured, error) {
	f.calls = append(f.calls, "get")
	if f.getFn != nil {
		return f.getFn(ctx, name, options, subresources...)
	}
	return nil, apierrors.NewNotFound(schema.GroupResource{Group: "", Resource: "configmaps"}, name)
}

func (f *fakeResourceInterface) List(ctx context.Context, opts metav1.ListOptions) (*unstructured.UnstructuredList, error) {
	f.calls = append(f.calls, "list")
	if f.listFn != nil {
		return f.listFn(ctx, opts)
	}
	return &unstructured.UnstructuredList{}, nil
}

func (f *fakeResourceInterface) Watch(ctx context.Context, opts metav1.ListOptions) (watch.Interface, error) {
	f.calls = append(f.calls, "watch")
	if f.watchFn != nil {
		return f.watchFn(ctx, opts)
	}
	return nil, nil
}

func (f *fakeResourceInterface) Patch(ctx context.Context, name string, pt types.PatchType, data []byte, options metav1.PatchOptions, subresources ...string) (*unstructured.Unstructured, error) {
	f.calls = append(f.calls, "patch")
	if f.patchFn != nil {
		return f.patchFn(ctx, name, pt, data, options, subresources...)
	}
	return &unstructured.Unstructured{}, nil
}

func (f *fakeResourceInterface) Apply(ctx context.Context, name string, obj *unstructured.Unstructured, options metav1.ApplyOptions, subresources ...string) (*unstructured.Unstructured, error) {
	f.calls = append(f.calls, "apply")
	if f.applyFn != nil {
		return f.applyFn(ctx, name, obj, options, subresources...)
	}
	return obj.DeepCopy(), nil
}

func (f *fakeResourceInterface) ApplyStatus(ctx context.Context, name string, obj *unstructured.Unstructured, options metav1.ApplyOptions) (*unstructured.Unstructured, error) {
	f.calls = append(f.calls, "apply-status")
	if f.applyStatusFn != nil {
		return f.applyStatusFn(ctx, name, obj, options)
	}
	return obj.DeepCopy(), nil
}

func makeResource(syncOptions string) unstructured.Unstructured {
	annotations := map[string]any{}
	if syncOptions != "" {
		annotations["deployment.plural.sh/sync-options"] = syncOptions
	}

	return unstructured.Unstructured{Object: map[string]any{
		"apiVersion": "v1",
		"kind":       "ConfigMap",
		"metadata": map[string]any{
			"name":        "example",
			"namespace":   "default",
			"annotations": annotations,
		},
	}}
}

func TestOnDeleteResourceAnnotations(t *testing.T) {
	streamline.ResetGlobalStore()
	storeInstance, err := store.NewDatabaseStore(context.Background())
	require.NoError(t, err)
	streamline.InitGlobalStore(storeInstance)
	t.Cleanup(func() {
		streamline.ResetGlobalStore()
		require.NoError(t, storeInstance.Shutdown())
	})

	tests := []struct {
		name              string
		annotations       map[string]string
		expectDelete      bool
		expectUpdate      bool
		wantStoreRetained bool
		wantStoreRemoved  bool
	}{
		{
			name: "plural prune option",
			annotations: map[string]string{
				smcommon.SyncOptionsAnnotation: "Prune=False",
			},
			wantStoreRetained: true,
		},
		{
			name: "argo prune option",
			annotations: map[string]string{
				smcommon.ArgoSyncOptionsAnnotation: "Prune=False",
			},
			wantStoreRetained: true,
		},
		{
			name: "prune false with delete false detaches during prune",
			annotations: map[string]string{
				smcommon.SyncOptionsAnnotation: "Prune=False, Delete=False",
			},
			wantStoreRemoved: true,
			expectUpdate:     true,
		},
		{
			name: "plural detach option",
			annotations: map[string]string{
				smcommon.SyncOptionsAnnotation: smcommon.SyncOptionDetach,
			},
			wantStoreRemoved: true,
			expectUpdate:     true,
		},
		{
			name: "lifecycle detach annotation",
			annotations: map[string]string{
				smcommon.LifecycleDeleteAnnotation: smcommon.PreventDeletion,
			},
			wantStoreRemoved: true,
			expectUpdate:     true,
		},
		{
			name: "plural delete option only applies to service destruction",
			annotations: map[string]string{
				smcommon.SyncOptionsAnnotation: "Delete=False",
			},
			expectDelete: true,
		},
		{
			name: "argo delete option only applies to service destruction",
			annotations: map[string]string{
				smcommon.ArgoSyncOptionsAnnotation: "Delete=False",
			},
			expectDelete: true,
		},
		{
			name:         "without a retention annotation",
			expectDelete: true,
		},
	}

	mapper := meta.NewDefaultRESTMapper([]schema.GroupVersion{{Version: "v1"}})
	mapper.Add(schema.GroupVersionKind{Version: "v1", Kind: "ConfigMap"}, meta.RESTScopeNamespace)
	discoveryCache := discoverycache.NewCache(nil, mapper)

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resource := makeResource("")
			resource.SetUID(types.UID("example-uid"))
			annotations := map[string]string{
				smcommon.OwningInventoryKey:    "test-service",
				smcommon.TrackingIdentifierKey: smcommon.NewKeyFromUnstructured(resource).String(),
			}
			for key, value := range tt.annotations {
				annotations[key] = value
			}
			resource.SetAnnotations(annotations)
			require.NoError(t, storeInstance.SaveComponent(resource))

			client := fake.NewSimpleDynamicClient(runtime.NewScheme(), &resource)
			processor := &WaveProcessor{client: client, discoveryCache: discoveryCache}
			processor.onDelete(context.Background(), resource)

			mutatingActions := make([]string, 0, 1)
			for _, action := range client.Actions() {
				if action.GetVerb() != "get" {
					mutatingActions = append(mutatingActions, action.GetVerb())
				}
			}

			wantMutatingActions := []string{}
			if tt.expectDelete {
				wantMutatingActions = []string{"delete"}
			}
			if tt.expectUpdate {
				wantMutatingActions = []string{"update"}
			}
			assert.Equal(t, wantMutatingActions, mutatingActions)

			components, err := storeInstance.GetServiceComponents("test-service", true)
			require.NoError(t, err)
			if tt.wantStoreRetained {
				require.Len(t, components, 1)
			}
			if tt.wantStoreRemoved {
				require.Empty(t, components)
			}

			assert.Equal(t, 1, processor.waveStatistics.deleted)
		})
	}
}

func TestOnDeleteDetachedResourceStaysDetachedAfterWatchUpdate(t *testing.T) {
	const serviceID = "test-service"

	tests := []struct {
		name        string
		annotations map[string]string
	}{
		{
			name: "plural detach option",
			annotations: map[string]string{
				smcommon.SyncOptionsAnnotation: smcommon.SyncOptionDetach,
			},
		},
		{
			name: "lifecycle detach annotation",
			annotations: map[string]string{
				smcommon.LifecycleDeleteAnnotation: smcommon.PreventDeletion,
			},
		},
		{
			name: "plural prune and delete disabled",
			annotations: map[string]string{
				smcommon.SyncOptionsAnnotation: "Prune=False,Delete=False",
			},
		},
		{
			name: "argo prune and delete disabled",
			annotations: map[string]string{
				smcommon.ArgoSyncOptionsAnnotation: "Prune=False,Delete=False",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := context.Background()
			storeInstance, err := store.NewDatabaseStore(ctx)
			require.NoError(t, err)
			streamline.ResetGlobalStore()
			streamline.InitGlobalStore(storeInstance)
			t.Cleanup(func() {
				streamline.ResetGlobalStore()
				require.NoError(t, storeInstance.Shutdown())
			})

			resource := makeResource("")
			resource.SetUID("example-uid")
			annotations := resource.GetAnnotations()
			for key, value := range tt.annotations {
				annotations[key] = value
			}
			annotations[smcommon.OwningInventoryKey] = serviceID
			annotations[smcommon.TrackingIdentifierKey] = smcommon.NewKeyFromUnstructured(resource).String()
			resource.SetAnnotations(annotations)
			require.NoError(t, storeInstance.SaveComponent(resource))

			client := fake.NewSimpleDynamicClient(runtime.NewScheme(), &resource)
			processor := &WaveProcessor{client: client}
			processor.onDelete(ctx, resource)

			components, err := storeInstance.GetServiceComponents(serviceID, true)
			require.NoError(t, err)
			require.Empty(t, components, "prune should remove the resource from service inventory")

			live, err := client.Resource(schema.GroupVersionResource{Version: "v1", Resource: "configmaps"}).
				Namespace(resource.GetNamespace()).Get(ctx, resource.GetName(), metav1.GetOptions{})
			require.NoError(t, err, "detached resource should remain live")
			require.NoError(t, storeInstance.SaveComponent(*live)) // Simulate a Modified watch event.

			components, err = storeInstance.GetServiceComponents(serviceID, true)
			require.NoError(t, err)
			require.Empty(t, components, "watch updates must not restore a detached resource to service inventory")
		})
	}
}

func TestOnDeleteDetachUpdateFailureKeepsInventory(t *testing.T) {
	const serviceID = "test-service"

	ctx := context.Background()
	storeInstance, err := store.NewDatabaseStore(ctx)
	require.NoError(t, err)
	streamline.ResetGlobalStore()
	streamline.InitGlobalStore(storeInstance)
	t.Cleanup(func() {
		streamline.ResetGlobalStore()
		require.NoError(t, storeInstance.Shutdown())
	})

	resource := makeResource(smcommon.SyncOptionDetach)
	resource.SetUID("example-uid")
	annotations := resource.GetAnnotations()
	annotations[smcommon.OwningInventoryKey] = serviceID
	annotations[smcommon.TrackingIdentifierKey] = smcommon.NewKeyFromUnstructured(resource).String()
	resource.SetAnnotations(annotations)
	require.NoError(t, storeInstance.SaveComponent(resource))

	client := fake.NewSimpleDynamicClient(runtime.NewScheme(), &resource)
	client.PrependReactor("update", "configmaps", func(ktesting.Action) (bool, runtime.Object, error) {
		return true, nil, errors.New("update failed")
	})
	processor := &WaveProcessor{client: client, errorsChan: make(chan console.ServiceErrorAttributes, 1)}
	processor.onDelete(ctx, resource)

	components, err := storeInstance.GetServiceComponents(serviceID, true)
	require.NoError(t, err)
	require.Len(t, components, 1, "failed live update must not remove inventory")
	assert.Equal(t, 0, processor.waveStatistics.deleted)
	require.Len(t, processor.errorsChan, 1)
	assert.Equal(t, "delete", (<-processor.errorsChan).Source)
}

func TestOnDeleteDetachDryRunDoesNotMutate(t *testing.T) {
	const serviceID = "test-service"

	ctx := context.Background()
	storeInstance, err := store.NewDatabaseStore(ctx)
	require.NoError(t, err)
	streamline.ResetGlobalStore()
	streamline.InitGlobalStore(storeInstance)
	t.Cleanup(func() {
		streamline.ResetGlobalStore()
		require.NoError(t, storeInstance.Shutdown())
	})

	resource := makeResource(smcommon.SyncOptionDetach)
	resource.SetUID("example-uid")
	annotations := resource.GetAnnotations()
	annotations[smcommon.OwningInventoryKey] = serviceID
	annotations[smcommon.TrackingIdentifierKey] = smcommon.NewKeyFromUnstructured(resource).String()
	resource.SetAnnotations(annotations)
	require.NoError(t, storeInstance.SaveComponent(resource))

	client := fake.NewSimpleDynamicClient(runtime.NewScheme(), &resource)
	processor := &WaveProcessor{client: client, dryRun: true}
	processor.onDelete(ctx, resource)

	components, err := storeInstance.GetServiceComponents(serviceID, true)
	require.NoError(t, err)
	require.Len(t, components, 1, "dry-run must not remove inventory")
	for _, action := range client.Actions() {
		assert.Equal(t, "get", action.GetVerb(), "dry-run must not update the live object")
	}
}

func TestDoReplaceCreatesWhenMissing(t *testing.T) {
	ctx := context.Background()
	wp := &WaveProcessor{}
	resource := makeResource("replace=true")

	fake := &fakeResourceInterface{
		getFn: func(context.Context, string, metav1.GetOptions, ...string) (*unstructured.Unstructured, error) {
			return nil, apierrors.NewNotFound(schema.GroupResource{Resource: "configmaps"}, "example")
		},
	}

	result, err := wp.doReplace(ctx, fake, resource)
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, []string{"get", "create"}, fake.calls)
}

func TestDoReplaceUpdatesWithCurrentResourceVersion(t *testing.T) {
	ctx := context.Background()
	wp := &WaveProcessor{}
	resource := makeResource("replace=true")
	resource.SetResourceVersion("old")

	var updated *unstructured.Unstructured
	fake := &fakeResourceInterface{
		getFn: func(context.Context, string, metav1.GetOptions, ...string) (*unstructured.Unstructured, error) {
			existing := makeResource("")
			existing.SetResourceVersion("123")
			return &existing, nil
		},
		updateFn: func(_ context.Context, obj *unstructured.Unstructured, _ metav1.UpdateOptions, _ ...string) (*unstructured.Unstructured, error) {
			updated = obj.DeepCopy()
			return obj.DeepCopy(), nil
		},
	}

	result, err := wp.doReplace(ctx, fake, resource)
	require.NoError(t, err)
	require.NotNil(t, result)
	require.NotNil(t, updated)
	assert.Equal(t, "123", updated.GetResourceVersion())
	assert.Equal(t, []string{"get", "update"}, fake.calls)
}

func TestDoApplyReplaceWithoutForceReturnsError(t *testing.T) {
	ctx := context.Background()
	wp := &WaveProcessor{}
	resource := makeResource("replace=true")

	replaceErr := errors.New("replace failed")
	fake := &fakeResourceInterface{
		getFn: func(context.Context, string, metav1.GetOptions, ...string) (*unstructured.Unstructured, error) {
			existing := makeResource("")
			existing.SetResourceVersion("1")
			return &existing, nil
		},
		updateFn: func(context.Context, *unstructured.Unstructured, metav1.UpdateOptions, ...string) (*unstructured.Unstructured, error) {
			return nil, replaceErr
		},
	}

	result, err := wp.doApply(ctx, fake, resource)
	require.ErrorIs(t, err, replaceErr)
	assert.Nil(t, result)
	assert.Equal(t, []string{"get", "update"}, fake.calls)
}

func TestDoApplyReplaceWithForceEscalatesToRecreate(t *testing.T) {
	ctx := context.Background()
	wp := &WaveProcessor{}
	resource := makeResource("replace=true,force=true")

	replaceErr := errors.New("replace failed")
	fake := &fakeResourceInterface{
		getFn: func(context.Context, string, metav1.GetOptions, ...string) (*unstructured.Unstructured, error) {
			existing := makeResource("")
			existing.SetResourceVersion("1")
			return &existing, nil
		},
		updateFn: func(context.Context, *unstructured.Unstructured, metav1.UpdateOptions, ...string) (*unstructured.Unstructured, error) {
			return nil, replaceErr
		},
	}

	result, err := wp.doApply(ctx, fake, resource)
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, []string{"get", "update", "patch", "delete", "create"}, fake.calls)
}

func TestDoApplyReplaceWithForceAndSuccessfulReplaceDoesNotEscalate(t *testing.T) {
	ctx := context.Background()
	wp := &WaveProcessor{}
	resource := makeResource("replace=true,force=true")

	fake := &fakeResourceInterface{
		getFn: func(context.Context, string, metav1.GetOptions, ...string) (*unstructured.Unstructured, error) {
			existing := makeResource("")
			existing.SetResourceVersion("1")
			return &existing, nil
		},
		updateFn: func(_ context.Context, obj *unstructured.Unstructured, _ metav1.UpdateOptions, _ ...string) (*unstructured.Unstructured, error) {
			return obj.DeepCopy(), nil
		},
	}

	result, err := wp.doApply(ctx, fake, resource)
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, []string{"get", "update"}, fake.calls)
}

func TestDoApplyReplaceWithForceInDryRunDoesNotEscalate(t *testing.T) {
	ctx := context.Background()
	wp := &WaveProcessor{dryRun: true}
	resource := makeResource("replace=true,force=true")

	replaceErr := errors.New("replace failed")
	fake := &fakeResourceInterface{
		getFn: func(context.Context, string, metav1.GetOptions, ...string) (*unstructured.Unstructured, error) {
			existing := makeResource("")
			existing.SetResourceVersion("1")
			return &existing, nil
		},
		updateFn: func(context.Context, *unstructured.Unstructured, metav1.UpdateOptions, ...string) (*unstructured.Unstructured, error) {
			return nil, replaceErr
		},
	}

	result, err := wp.doApply(ctx, fake, resource)
	require.ErrorIs(t, err, replaceErr)
	assert.Nil(t, result)
	assert.Equal(t, []string{"get", "update"}, fake.calls)
}

func TestDoApplyWithoutReplaceUsesSSAApply(t *testing.T) {
	ctx := context.Background()
	wp := &WaveProcessor{}
	resource := makeResource("")

	applied := makeResource("")
	fake := &fakeResourceInterface{
		applyFn: func(context.Context, string, *unstructured.Unstructured, metav1.ApplyOptions, ...string) (*unstructured.Unstructured, error) {
			return &applied, nil
		},
	}

	result, err := wp.doApply(ctx, fake, resource)
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, []string{"apply"}, fake.calls)
}

func TestDoApplyWithoutReplaceAndWithoutForceReturnsApplyError(t *testing.T) {
	ctx := context.Background()
	wp := &WaveProcessor{}
	resource := makeResource("")

	applyErr := errors.New("apply failed")
	fake := &fakeResourceInterface{
		applyFn: func(context.Context, string, *unstructured.Unstructured, metav1.ApplyOptions, ...string) (*unstructured.Unstructured, error) {
			return nil, applyErr
		},
	}

	result, err := wp.doApply(ctx, fake, resource)
	require.ErrorIs(t, err, applyErr)
	assert.Nil(t, result)
	assert.Equal(t, []string{"apply"}, fake.calls)
}

func TestDoApplyWithoutReplaceAndWithForceEscalatesToRecreate(t *testing.T) {
	ctx := context.Background()
	wp := &WaveProcessor{}
	resource := makeResource("force=true")

	applyErr := errors.New("apply failed")
	fake := &fakeResourceInterface{
		applyFn: func(context.Context, string, *unstructured.Unstructured, metav1.ApplyOptions, ...string) (*unstructured.Unstructured, error) {
			return nil, applyErr
		},
	}

	result, err := wp.doApply(ctx, fake, resource)
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, []string{"apply", "patch", "delete", "create"}, fake.calls)
}

func TestDoApplyWithoutReplaceAndWithForceAndSuccessDoesNotEscalate(t *testing.T) {
	ctx := context.Background()
	wp := &WaveProcessor{}
	resource := makeResource("force=true")

	applied := makeResource("")
	fake := &fakeResourceInterface{
		applyFn: func(context.Context, string, *unstructured.Unstructured, metav1.ApplyOptions, ...string) (*unstructured.Unstructured, error) {
			return &applied, nil
		},
	}

	result, err := wp.doApply(ctx, fake, resource)
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, []string{"apply"}, fake.calls)
}

func TestDoApplyWithoutReplaceAndWithForceEscalationReturnsDeleteError(t *testing.T) {
	ctx := context.Background()
	wp := &WaveProcessor{}
	resource := makeResource("force=true")

	applyErr := errors.New("apply failed")
	deleteErr := errors.New("delete failed")
	fake := &fakeResourceInterface{
		applyFn: func(context.Context, string, *unstructured.Unstructured, metav1.ApplyOptions, ...string) (*unstructured.Unstructured, error) {
			return nil, applyErr
		},
		deleteFn: func(context.Context, string, metav1.DeleteOptions, ...string) error {
			return deleteErr
		},
	}

	result, err := wp.doApply(ctx, fake, resource)
	require.ErrorIs(t, err, deleteErr)
	assert.Nil(t, result)
	assert.Equal(t, []string{"apply", "patch", "delete"}, fake.calls)
}

func TestDoApplyWithoutReplaceAndWithForceEscalatesEvenWhenPatchFails(t *testing.T) {
	ctx := context.Background()
	wp := &WaveProcessor{}
	resource := makeResource("force=true")

	applyErr := errors.New("apply failed")
	patchErr := errors.New("patch failed")
	fake := &fakeResourceInterface{
		applyFn: func(context.Context, string, *unstructured.Unstructured, metav1.ApplyOptions, ...string) (*unstructured.Unstructured, error) {
			return nil, applyErr
		},
		patchFn: func(context.Context, string, types.PatchType, []byte, metav1.PatchOptions, ...string) (*unstructured.Unstructured, error) {
			return nil, patchErr
		},
	}

	result, err := wp.doApply(ctx, fake, resource)
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, []string{"apply", "patch", "delete", "create"}, fake.calls)
}

func TestDoApplyWithoutReplaceAndWithForceInDryRunDoesNotEscalate(t *testing.T) {
	ctx := context.Background()
	wp := &WaveProcessor{dryRun: true}
	resource := makeResource("force=true")

	applyErr := errors.New("apply failed")
	fake := &fakeResourceInterface{
		applyFn: func(context.Context, string, *unstructured.Unstructured, metav1.ApplyOptions, ...string) (*unstructured.Unstructured, error) {
			return nil, applyErr
		},
	}

	result, err := wp.doApply(ctx, fake, resource)
	require.ErrorIs(t, err, applyErr)
	assert.Nil(t, result)
	assert.Equal(t, []string{"apply"}, fake.calls)
}
