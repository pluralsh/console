package applier

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/watch"
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
