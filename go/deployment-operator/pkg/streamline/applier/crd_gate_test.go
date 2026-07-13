package applier

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/polly/containers"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/util/wait"
	"k8s.io/apimachinery/pkg/version"
	"k8s.io/client-go/dynamic"

	discoverycache "github.com/pluralsh/console/go/deployment-operator/pkg/cache/discovery"
	"github.com/pluralsh/console/go/deployment-operator/pkg/streamline"
	smcommon "github.com/pluralsh/console/go/deployment-operator/pkg/streamline/common"
	"github.com/pluralsh/console/go/deployment-operator/pkg/streamline/store"
)

type fakeDynamicClient struct {
	resource dynamic.NamespaceableResourceInterface
}

type failingAppliedStore struct {
	store.Store
	err error
}

func (in *failingAppliedStore) GetAppliedComponent(unstructured.Unstructured) (*smcommon.Component, error) {
	return nil, in.err
}

func (in *fakeDynamicClient) Resource(schema.GroupVersionResource) dynamic.NamespaceableResourceInterface {
	return in.resource
}

type fakeCRDDiscoveryCache struct {
	mu               sync.Mutex
	mapping          *meta.RESTMapping
	restMappingErr   error
	restMappingFunc  func(schema.GroupVersionKind) (*meta.RESTMapping, error)
	restMappingCalls int
	resetCalls       int
	addedGVKs        []schema.GroupVersionKind
}

type doneObservedContext struct {
	context.Context
	once     sync.Once
	observed chan struct{}
}

func (in *doneObservedContext) Done() <-chan struct{} {
	in.once.Do(func() { close(in.observed) })
	return in.Context.Done()
}

func (in *fakeCRDDiscoveryCache) Add(gvks ...schema.GroupVersionKind) {
	in.mu.Lock()
	defer in.mu.Unlock()
	in.addedGVKs = append(in.addedGVKs, gvks...)
}

func (in *fakeCRDDiscoveryCache) Delete(...schema.GroupVersionKind)               {}
func (in *fakeCRDDiscoveryCache) Refresh() error                                  { return nil }
func (in *fakeCRDDiscoveryCache) MaybeResetRESTMapper(...schema.GroupVersionKind) {}

func (in *fakeCRDDiscoveryCache) ResetRESTMapper() {
	in.mu.Lock()
	defer in.mu.Unlock()
	in.resetCalls++
}

func (in *fakeCRDDiscoveryCache) GroupVersionKind() containers.Set[schema.GroupVersionKind] {
	return containers.NewSet[schema.GroupVersionKind]()
}

func (in *fakeCRDDiscoveryCache) GroupVersionResource() containers.Set[schema.GroupVersionResource] {
	return containers.NewSet[schema.GroupVersionResource]()
}

func (in *fakeCRDDiscoveryCache) GroupVersion() containers.Set[schema.GroupVersion] {
	return containers.NewSet[schema.GroupVersion]()
}

func (in *fakeCRDDiscoveryCache) ServerVersion() *version.Info { return &version.Info{} }

func (in *fakeCRDDiscoveryCache) KindFor(gvr schema.GroupVersionResource) (schema.GroupVersionKind, error) {
	return schema.GroupVersionKind{Group: gvr.Group, Version: gvr.Version}, nil
}

func (in *fakeCRDDiscoveryCache) RestMapping(gvk schema.GroupVersionKind) (*meta.RESTMapping, error) {
	in.mu.Lock()
	in.restMappingCalls++
	fn := in.restMappingFunc
	mapping, err := in.mapping, in.restMappingErr
	in.mu.Unlock()
	if fn != nil {
		return fn(gvk)
	}
	return mapping, err
}

func (in *fakeCRDDiscoveryCache) OnGroupVersionAdded(discoverycache.GroupVersionUpdateFunc)         {}
func (in *fakeCRDDiscoveryCache) OnGroupVersionDeleted(discoverycache.GroupVersionUpdateFunc)       {}
func (in *fakeCRDDiscoveryCache) OnGroupVersionKindAdded(discoverycache.GroupVersionKindUpdateFunc) {}
func (in *fakeCRDDiscoveryCache) OnGroupVersionKindDeleted(discoverycache.GroupVersionKindUpdateFunc) {
}
func (in *fakeCRDDiscoveryCache) OnGroupVersionResourceAdded(discoverycache.GroupVersionResourceUpdateFunc) {
}
func (in *fakeCRDDiscoveryCache) OnGroupVersionResourceDeleted(discoverycache.GroupVersionResourceUpdateFunc) {
}

func TestCRDGateEligibility(t *testing.T) {
	t.Run("activates only a newly and successfully applied CRD", func(t *testing.T) {
		storeInstance := newCRDGateTestStore(t)
		cache := &fakeCRDDiscoveryCache{}
		crd := testCRD("widgets.example.com", "", "")
		require.NoError(t, storeInstance.SyncServiceComponents("service", []unstructured.Unstructured{crd}))

		gate := newTestCRDGate(storeInstance, cache, withCRDGateResources([]unstructured.Unstructured{crd}, false))
		assert.True(t, gate.Enabled())

		_, eligible := gate.appliedCRD(widgetGVK())
		assert.False(t, eligible)
		require.NoError(t, runPreApplyGate(gate, context.Background(), widgetGVK()))
		assert.Equal(t, 0, cache.restMappingCalls)

		applied := testCRD("widgets.example.com", "uid-new", "True")
		markTestGate(t, gate, applied)
		actual, eligible := gate.appliedCRD(widgetGVK())
		assert.True(t, eligible)
		assert.Equal(t, applied.GetUID(), actual.GetUID())
	})

	t.Run("does not register an existing CRD", func(t *testing.T) {
		storeInstance := newCRDGateTestStore(t)
		cache := &fakeCRDDiscoveryCache{}
		crd := testCRD("widgets.example.com", "uid-existing", "True")
		require.NoError(t, storeInstance.SaveComponent(crd))
		require.NoError(t, storeInstance.SyncServiceComponents("service", []unstructured.Unstructured{crd}))

		gate := newTestCRDGate(storeInstance, cache, withCRDGateResources([]unstructured.Unstructured{crd}, false))
		assert.False(t, gate.Enabled())
		markTestGate(t, gate, crd)

		_, eligible := gate.appliedCRD(widgetGVK())
		assert.False(t, eligible)
	})

	t.Run("does not register dry run resources", func(t *testing.T) {
		storeInstance := newCRDGateTestStore(t)
		crd := testCRD("widgets.example.com", "", "")
		require.NoError(t, storeInstance.SyncServiceComponents("service", []unstructured.Unstructured{crd}))

		gate := newTestCRDGate(storeInstance, &fakeCRDDiscoveryCache{}, withCRDGateResources([]unstructured.Unstructured{crd}, true))
		assert.False(t, gate.Enabled())
		markTestGate(t, gate, testCRD("widgets.example.com", "uid-dry", "True"))

		_, eligible := gate.appliedCRD(widgetGVK())
		assert.False(t, eligible)
	})

	t.Run("fails open when candidate classification fails", func(t *testing.T) {
		storeInstance := newCRDGateTestStore(t)
		classificationErr := errors.New("database unavailable")
		crd := testCRD("widgets.example.com", "", "")
		gate := newTestCRDGate(&failingAppliedStore{Store: storeInstance, err: classificationErr}, &fakeCRDDiscoveryCache{}, withCRDGateResources([]unstructured.Unstructured{crd}, false))

		assert.False(t, gate.Enabled())
		markTestGate(t, gate, testCRD("widgets.example.com", "uid-new", "True"))

		_, eligible := gate.appliedCRD(widgetGVK())
		assert.False(t, eligible)
	})
}

func TestCRDGateWaitForMapping(t *testing.T) {
	t.Run("uses persisted establishment and refreshes discovery", func(t *testing.T) {
		storeInstance := newCRDGateTestStore(t)
		mapping := widgetMapping()
		cache := &fakeCRDDiscoveryCache{mapping: mapping}
		gate, applied := activeTestCRDGate(t, storeInstance, cache)
		require.NoError(t, storeInstance.SaveComponent(applied))

		require.NoError(t, runPreApplyGate(gate, context.Background(), widgetGVK()))
		assert.Equal(t, 1, cache.resetCalls)
		assert.Equal(t, 1, cache.restMappingCalls)
		assert.Contains(t, cache.addedGVKs, widgetGVK())

		require.NoError(t, runPreApplyGate(gate, context.Background(), widgetGVK()))
		assert.Equal(t, 2, cache.resetCalls)
		assert.Equal(t, 2, cache.restMappingCalls)
	})

	t.Run("waits for watch persistence and delayed discovery", func(t *testing.T) {
		storeInstance := newCRDGateTestStore(t)
		var mappingCalls int
		cache := &fakeCRDDiscoveryCache{restMappingFunc: func(gvk schema.GroupVersionKind) (*meta.RESTMapping, error) {
			mappingCalls++
			if mappingCalls == 1 {
				return nil, &meta.NoKindMatchError{GroupKind: gvk.GroupKind(), SearchedVersions: []string{gvk.Version}}
			}
			return widgetMapping(), nil
		}}
		gate, applied := activeTestCRDGate(t, storeInstance, cache)
		pending := applied.DeepCopy()
		pending.Object["status"] = map[string]any{
			"conditions": []any{map[string]any{"type": "Established", "status": "False"}},
		}
		require.NoError(t, storeInstance.SaveComponent(*pending))

		resultCh := make(chan error, 1)
		go func() {
			resultCh <- runPreApplyGate(gate, context.Background(), widgetGVK())
		}()
		require.NoError(t, storeInstance.SaveComponent(applied))

		require.NoError(t, <-resultCh)
		assert.Equal(t, 2, cache.resetCalls)
		assert.Equal(t, 2, cache.restMappingCalls)
	})

	t.Run("requires the applied UID", func(t *testing.T) {
		storeInstance := newCRDGateTestStore(t)
		cache := &fakeCRDDiscoveryCache{mapping: widgetMapping()}
		gate, _ := activeTestCRDGate(t, storeInstance, cache)
		require.NoError(t, storeInstance.SaveComponent(testCRD("widgets.example.com", "different-uid", "True")))
		gate.waitTimeout = 15 * time.Millisecond

		assert.Error(t, runPreApplyGate(gate, context.Background(), widgetGVK()))
		assert.Equal(t, 0, cache.resetCalls)
	})

	t.Run("deduplicates concurrent exact GVK waits", func(t *testing.T) {
		storeInstance := newCRDGateTestStore(t)
		started := make(chan struct{})
		release := make(chan struct{})
		var once sync.Once
		cache := &fakeCRDDiscoveryCache{restMappingFunc: func(schema.GroupVersionKind) (*meta.RESTMapping, error) {
			once.Do(func() { close(started) })
			<-release
			return widgetMapping(), nil
		}}
		gate, applied := activeTestCRDGate(t, storeInstance, cache)
		require.NoError(t, storeInstance.SaveComponent(applied))

		errCh := make(chan error, 2)
		go func() {
			errCh <- runPreApplyGate(gate, context.Background(), widgetGVK())
		}()
		<-started

		secondCtx, cancel := context.WithCancel(context.Background())
		defer cancel()
		observedCtx := &doneObservedContext{Context: secondCtx, observed: make(chan struct{})}
		go func() {
			errCh <- runPreApplyGate(gate, observedCtx, widgetGVK())
		}()
		<-observedCtx.observed
		close(release)

		require.NoError(t, <-errCh)
		require.NoError(t, <-errCh)
		assert.Equal(t, 1, cache.resetCalls)
		assert.Equal(t, 1, cache.restMappingCalls)
	})

	t.Run("resolves different served GVKs independently", func(t *testing.T) {
		storeInstance := newCRDGateTestStore(t)
		v1 := widgetGVK()
		v2 := schema.GroupVersionKind{Group: v1.Group, Version: "v2", Kind: v1.Kind}
		blocked := make(chan struct{})
		release := make(chan struct{})
		cache := &fakeCRDDiscoveryCache{restMappingFunc: func(gvk schema.GroupVersionKind) (*meta.RESTMapping, error) {
			if gvk == v1 {
				close(blocked)
				<-release
			}
			return &meta.RESTMapping{
				Resource:         schema.GroupVersionResource{Group: gvk.Group, Version: gvk.Version, Resource: "widgets"},
				GroupVersionKind: gvk,
				Scope:            meta.RESTScopeNamespace,
			}, nil
		}}
		manifest := testCRD("widgets.example.com", "", "")
		versions, _, _ := unstructured.NestedSlice(manifest.Object, "spec", "versions")
		versions = append(versions, map[string]any{"name": "v2", "served": true, "storage": false})
		require.NoError(t, unstructured.SetNestedSlice(manifest.Object, versions, "spec", "versions"))
		require.NoError(t, storeInstance.SyncServiceComponents("service", []unstructured.Unstructured{manifest}))
		gate := newTestCRDGate(storeInstance, cache, withCRDGateResources([]unstructured.Unstructured{manifest}, false))
		applied := manifest.DeepCopy()
		applied.SetUID("uid-multiversion")
		applied.Object["status"] = map[string]any{
			"conditions": []any{map[string]any{"type": "Established", "status": "True"}},
		}
		markTestGate(t, gate, *applied)
		require.NoError(t, storeInstance.SaveComponent(*applied))

		v1Result := make(chan error, 1)
		go func() {
			v1Result <- runPreApplyGate(gate, context.Background(), v1)
		}()
		<-blocked

		require.NoError(t, runPreApplyGate(gate, context.Background(), v2))
		assert.Contains(t, cache.addedGVKs, v2)

		close(release)
		require.NoError(t, <-v1Result)
	})

	t.Run("returns immediately for unrelated GVK", func(t *testing.T) {
		storeInstance := newCRDGateTestStore(t)
		cache := &fakeCRDDiscoveryCache{}
		gate, _ := activeTestCRDGate(t, storeInstance, cache)

		require.NoError(t, runPreApplyGate(gate, context.Background(), schema.GroupVersionKind{Group: "other.io", Version: "v1", Kind: "Other"}))
		assert.Equal(t, 0, cache.restMappingCalls)
	})

	t.Run("honors cancellation", func(t *testing.T) {
		storeInstance := newCRDGateTestStore(t)
		gate, _ := activeTestCRDGate(t, storeInstance, &fakeCRDDiscoveryCache{})
		ctx, cancel := context.WithCancel(context.Background())
		cancel()

		assert.ErrorIs(t, runPreApplyGate(gate, ctx, widgetGVK()), context.Canceled)
	})

	t.Run("times out while establishment is absent", func(t *testing.T) {
		storeInstance := newCRDGateTestStore(t)
		gate, _ := activeTestCRDGate(t, storeInstance, &fakeCRDDiscoveryCache{})
		gate.waitTimeout = 15 * time.Millisecond

		err := runPreApplyGate(gate, context.Background(), widgetGVK())
		assert.Error(t, err)
		assert.True(t, errors.Is(err, context.DeadlineExceeded) || errors.Is(err, wait.ErrWaitTimeout))
	})
}

func TestOnApplyCRDGateIsolation(t *testing.T) {
	noMatch := func(gvk schema.GroupVersionKind) error {
		return &meta.NoKindMatchError{GroupKind: gvk.GroupKind(), SearchedVersions: []string{gvk.Version}}
	}

	t.Run("runs matching introduced GVK gate before client lookup", func(t *testing.T) {
		storeInstance := newCRDGateTestStore(t)
		streamline.ResetGlobalStore()
		streamline.InitGlobalStore(storeInstance)
		t.Cleanup(streamline.ResetGlobalStore)

		cache := &fakeCRDDiscoveryCache{mapping: widgetMapping()}
		gate, applied := activeTestCRDGate(t, storeInstance, cache)
		require.NoError(t, storeInstance.SaveComponent(applied))
		resource := &fakeResourceInterface{applyFn: func(_ context.Context, _ string, obj *unstructured.Unstructured, _ metav1.ApplyOptions, _ ...string) (*unstructured.Unstructured, error) {
			applied := obj.DeepCopy()
			applied.SetUID("widget-uid")
			return applied, nil
		}}
		processor := NewWaveProcessor(
			&fakeDynamicClient{resource: resource},
			cache,
			smcommon.SyncPhaseSync,
			NewWave([]unstructured.Unstructured{testResource(widgetGVK())}, ApplyWave),
			WithWaveGates(gate),
			WithWaveMaxConcurrentApplies(1),
		)

		_, serviceErrors := processor.Run(context.Background())

		assert.Empty(t, serviceErrors)
		assert.Equal(t, 1, cache.resetCalls)
		assert.Equal(t, []string{"apply"}, resource.calls)
	})

	t.Run("runs post-apply gate when client lookup succeeds before pre-apply is eligible", func(t *testing.T) {
		storeInstance := newCRDGateTestStore(t)
		streamline.ResetGlobalStore()
		streamline.InitGlobalStore(storeInstance)
		t.Cleanup(streamline.ResetGlobalStore)

		crd := testCRD("widgets.example.com", "", "")
		require.NoError(t, storeInstance.SyncServiceComponents("service", []unstructured.Unstructured{crd}))
		cache := &fakeCRDDiscoveryCache{mapping: widgetMapping()}
		gate := newTestCRDGate(storeInstance, cache, withCRDGateResources([]unstructured.Unstructured{crd}, false))
		resource := &fakeResourceInterface{applyFn: func(_ context.Context, _ string, obj *unstructured.Unstructured, _ metav1.ApplyOptions, _ ...string) (*unstructured.Unstructured, error) {
			applied := obj.DeepCopy()
			if obj.GetKind() == "CustomResourceDefinition" {
				applied.SetUID("crd-uid")
				applied.Object["status"] = map[string]any{
					"conditions": []any{map[string]any{"type": "Established", "status": "True"}},
				}
			}
			return applied, nil
		}}
		processor := NewWaveProcessor(
			&fakeDynamicClient{resource: resource},
			cache,
			smcommon.SyncPhaseSync,
			NewWave([]unstructured.Unstructured{crd}, ApplyWave),
			WithWaveGates(gate),
			WithWaveMaxConcurrentApplies(1),
		)

		_, serviceErrors := processor.Run(context.Background())

		require.Empty(t, serviceErrors)
		applied, eligible := gate.appliedCRD(widgetGVK())
		assert.True(t, eligible)
		assert.Equal(t, types.UID("crd-uid"), applied.GetUID())
		assert.Equal(t, []string{"apply"}, resource.calls)
	})

	t.Run("preserves unrelated no-match", func(t *testing.T) {
		storeInstance := newCRDGateTestStore(t)
		streamline.ResetGlobalStore()
		streamline.InitGlobalStore(storeInstance)
		t.Cleanup(streamline.ResetGlobalStore)

		other := schema.GroupVersionKind{Group: "other.io", Version: "v1", Kind: "Other"}
		cache := &fakeCRDDiscoveryCache{restMappingFunc: func(gvk schema.GroupVersionKind) (*meta.RESTMapping, error) {
			return nil, noMatch(gvk)
		}}
		gate, _ := activeTestCRDGate(t, storeInstance, cache)
		processor := NewWaveProcessor(
			nil,
			cache,
			smcommon.SyncPhaseSync,
			NewWave([]unstructured.Unstructured{testResource(other)}, ApplyWave),
			WithWaveGates(gate),
			WithWaveMaxConcurrentApplies(1),
		)

		_, serviceErrors := processor.Run(context.Background())

		assert.Len(t, serviceErrors, 1)
		assert.Equal(t, 0, cache.resetCalls)
		assert.Equal(t, 1, cache.restMappingCalls)
	})

	t.Run("preserves non-no-match errors", func(t *testing.T) {
		storeInstance := newCRDGateTestStore(t)
		streamline.ResetGlobalStore()
		streamline.InitGlobalStore(storeInstance)
		t.Cleanup(streamline.ResetGlobalStore)

		other := schema.GroupVersionKind{Group: "other.io", Version: "v1", Kind: "Other"}
		mappingErr := errors.New("discovery unavailable")
		cache := &fakeCRDDiscoveryCache{restMappingErr: mappingErr}
		gate, _ := activeTestCRDGate(t, storeInstance, cache)
		processor := NewWaveProcessor(
			nil,
			cache,
			smcommon.SyncPhaseSync,
			NewWave([]unstructured.Unstructured{testResource(other)}, ApplyWave),
			WithWaveGates(gate),
			WithWaveMaxConcurrentApplies(1),
		)

		_, serviceErrors := processor.Run(context.Background())

		assert.Len(t, serviceErrors, 1)
		assert.Equal(t, 0, cache.resetCalls)
		assert.Equal(t, 1, cache.restMappingCalls)
	})
}

func TestApplierCreatesCRDAwareResourcesInOneApply(t *testing.T) {
	storeInstance := newCRDGateTestStore(t)
	streamline.ResetGlobalStore()
	streamline.InitGlobalStore(storeInstance)
	t.Cleanup(streamline.ResetGlobalStore)

	crd := testCRD("widgets.example.com", "", "")
	widget := testResource(widgetGVK())
	crdMapping := &meta.RESTMapping{
		Resource: schema.GroupVersionResource{
			Group: "apiextensions.k8s.io", Version: "v1", Resource: "customresourcedefinitions",
		},
		GroupVersionKind: crd.GroupVersionKind(),
		Scope:            meta.RESTScopeRoot,
	}
	var widgetMappingCalls int
	cache := &fakeCRDDiscoveryCache{restMappingFunc: func(gvk schema.GroupVersionKind) (*meta.RESTMapping, error) {
		if gvk == crd.GroupVersionKind() {
			return crdMapping, nil
		}

		widgetMappingCalls++
		if widgetMappingCalls == 1 {
			return nil, &meta.NoKindMatchError{GroupKind: gvk.GroupKind(), SearchedVersions: []string{gvk.Version}}
		}
		return widgetMapping(), nil
	}}
	resource := &fakeResourceInterface{applyFn: func(_ context.Context, _ string, obj *unstructured.Unstructured, _ metav1.ApplyOptions, _ ...string) (*unstructured.Unstructured, error) {
		applied := obj.DeepCopy()
		if obj.GetKind() == "CustomResourceDefinition" {
			applied.SetUID("crd-uid")
			applied.Object["status"] = map[string]any{
				"conditions": []any{map[string]any{"type": "Established", "status": "True"}},
			}
			if err := storeInstance.SaveComponent(*applied); err != nil {
				return nil, err
			}
		} else {
			applied.SetUID("widget-uid")
		}
		return applied, nil
	}}
	applier := NewApplier(&fakeDynamicClient{resource: resource}, cache, storeInstance, WithWaveDelay(time.Millisecond))
	dryRun := false

	components, serviceErrors, err := applier.Apply(context.Background(), client.ServiceDeploymentForAgent{
		ID: "service", Name: "service", Namespace: "default", DryRun: &dryRun,
	}, []unstructured.Unstructured{crd, widget})

	require.NoError(t, err)
	assert.Empty(t, serviceErrors)
	assert.Len(t, components, 2)
	assert.Equal(t, 2, cache.resetCalls)
	assert.Equal(t, 3, widgetMappingCalls)
	assert.Contains(t, cache.addedGVKs, widgetGVK())
	assert.Equal(t, []string{"apply", "apply"}, resource.calls)
}

func newCRDGateTestStore(t *testing.T) store.Store {
	t.Helper()
	result, err := store.NewDatabaseStore(context.Background())
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, result.Shutdown()) })
	return result
}

func newTestCRDGate(store store.Store, cache discoverycache.Cache, opts ...CRDGateOption) *crdGate {
	gate := newCRDGate(store, cache, opts...)
	gate.waitTimeout = time.Second
	gate.backoff = wait.Backoff{Duration: time.Millisecond, Factor: 1, Steps: 100, Cap: time.Millisecond}
	return gate
}

func activeTestCRDGate(t *testing.T, storeInstance store.Store, cache discoverycache.Cache) (*crdGate, unstructured.Unstructured) {
	t.Helper()
	manifest := testCRD("widgets.example.com", "", "")
	require.NoError(t, storeInstance.SyncServiceComponents("service", []unstructured.Unstructured{manifest}))
	gate := newTestCRDGate(storeInstance, cache, withCRDGateResources([]unstructured.Unstructured{manifest}, false))
	applied := testCRD("widgets.example.com", "uid-new", "True")
	markTestGate(t, gate, applied)
	return gate, applied
}

func markTestGate(t *testing.T, gate *crdGate, resource unstructured.Unstructured) {
	t.Helper()
	require.NoError(t, gate.Run(context.Background(), GateConditionPostApply, resource))
}

func runPreApplyGate(gate *crdGate, ctx context.Context, gvk schema.GroupVersionKind) error {
	return gate.Run(ctx, GateConditionPreApply, testResource(gvk))
}

func testCRD(name, uid, established string) unstructured.Unstructured {
	result := unstructured.Unstructured{Object: map[string]any{
		"apiVersion": "apiextensions.k8s.io/v1",
		"kind":       "CustomResourceDefinition",
		"metadata": map[string]any{
			"name": name,
		},
		"spec": map[string]any{
			"group": "example.com",
			"names": map[string]any{"kind": "Widget", "plural": "widgets"},
			"versions": []any{map[string]any{
				"name": "v1", "served": true, "storage": true,
			}},
		},
	}}
	result.SetUID(types.UID(uid))
	if established != "" {
		result.Object["status"] = map[string]any{
			"conditions": []any{map[string]any{"type": "Established", "status": established}},
		}
	}
	return result
}

func widgetGVK() schema.GroupVersionKind {
	return schema.GroupVersionKind{Group: "example.com", Version: "v1", Kind: "Widget"}
}

func widgetMapping() *meta.RESTMapping {
	return &meta.RESTMapping{
		Resource:         schema.GroupVersionResource{Group: "example.com", Version: "v1", Resource: "widgets"},
		GroupVersionKind: widgetGVK(),
		Scope:            meta.RESTScopeNamespace,
	}
}

func testResource(gvk schema.GroupVersionKind) unstructured.Unstructured {
	result := unstructured.Unstructured{}
	result.SetGroupVersionKind(gvk)
	result.SetName("example")
	result.SetNamespace("default")
	return result
}
