package applier

import (
	"context"
	"fmt"
	"sync"
	"time"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/polly/cache"
	"github.com/pluralsh/deployment-operator/internal/errors"
	"github.com/pluralsh/deployment-operator/internal/helpers"
	"github.com/pluralsh/deployment-operator/internal/utils"
	discoverycache "github.com/pluralsh/deployment-operator/pkg/cache/discovery"
	"github.com/pluralsh/deployment-operator/pkg/common"
	"github.com/pluralsh/deployment-operator/pkg/log"
	"github.com/pluralsh/deployment-operator/pkg/manifests/template"
	"github.com/pluralsh/deployment-operator/pkg/streamline"
	smcommon "github.com/pluralsh/deployment-operator/pkg/streamline/common"
	"github.com/samber/lo"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/util/wait"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/util/workqueue"
	"k8s.io/klog/v2"
)

type WaveType string

const (
	ApplyWave  WaveType = "apply"
	DeleteWave WaveType = "delete"
)

// Wave is a collection of resources that will be applied or deleted together.
// It is used to group resources that are related to each other.
type Wave struct {
	// items is the list of resources in the wave
	items []unstructured.Unstructured

	// waveType is the type of the wave
	waveType WaveType
}

func NewWave(resources []unstructured.Unstructured, waveType WaveType) Wave {
	result := Wave{
		items:    resources,
		waveType: waveType,
	}

	return result
}

func (in *Wave) Add(resource unstructured.Unstructured) {
	in.items = append(in.items, resource)
}

func (in *Wave) Len() int {
	return len(in.items)
}

type WaveStatistics struct {
	attemptedApplies int
	applied          int
	attemptedDeletes int
	deleted          int
}

func (in *WaveStatistics) Applied() string {
	return fmt.Sprintf("%d/%d", in.applied, in.attemptedApplies)
}

func (in *WaveStatistics) Deleted() string {
	return fmt.Sprintf("%d/%d", in.deleted, in.attemptedDeletes)
}

func (in *WaveStatistics) Add(ws WaveStatistics) {
	in.attemptedApplies += ws.attemptedApplies
	in.applied += ws.applied
	in.attemptedDeletes += ws.attemptedDeletes
	in.deleted += ws.deleted
}

func NewWaveStatistics(w Wave) WaveStatistics {
	return WaveStatistics{
		attemptedApplies: lo.Ternary(w.waveType == ApplyWave, w.Len(), 0),
		applied:          0,
		attemptedDeletes: lo.Ternary(w.waveType == DeleteWave, w.Len(), 0),
		deleted:          0,
	}
}

const (
	defaultMaxConcurrentApplies = 10
	defaultDeQueueDelay         = 100 * time.Millisecond
)

// WaveProcessor processes a wave of resources. It applies or deletes the resources in the wave.
// It uses a work queue to process the items in the wave concurrently. It uses a channel to communicate
// between the workers and the collector goroutine. The collector goroutine collects the components and errors
// from the channels and returns them to the caller.
type WaveProcessor struct {
	mu sync.Mutex

	// client is the dynamic client used to apply the resources.
	client dynamic.Interface

	// discoveryCache is the discovery discoveryCache used to get information about the API resources.
	discoveryCache discoverycache.Cache

	phase smcommon.SyncPhase

	// wave to be processed. It contains the resources to be applied or deleted.
	wave Wave

	// componentChan is used to communicate between the workers and the collector goroutine
	// when a resource is successfully applied, the worker sends the component attributes to the channel.
	componentChan chan console.ComponentAttributes

	// errorsChan is used to communicate between the workers and the collector goroutine
	// when a resource fails to be applied, the worker sends the error to the channel.
	errorsChan chan console.ServiceErrorAttributes

	// queue is the work queue used to process the items in the wave.
	queue *workqueue.Typed[smcommon.Key]

	// keyToResource is a map of the wave items to their keys.
	// It is used to lookup the resource from the key when processing the items in the queue.
	keyToResource map[smcommon.Key]unstructured.Unstructured

	// maxConcurrentApplies is the maximum number of workers that can be started.
	maxConcurrentApplies int

	// concurrentApplies is the number of workers that will be started.
	// It is calculated based on the number of items in the wave and the maxConcurrentApplies option.
	// If the wave contains more items than the maxConcurrentApplies option, the number of workers
	// will be set to the maxConcurrentApplies otherwise it will be set to the number of items in the wave.
	concurrentApplies int

	// deQueueDelay is the amount of time to wait before dequeuing the next item from the queue
	// by the same worker.
	deQueueDelay time.Duration

	// dryRun determines if the wave should be applied in dry run mode, meaning that the changes will not be persisted.
	dryRun bool

	// onApplyCallback is a callback function called when a resource is applied
	onApplyCallback func(resource unstructured.Unstructured)

	// svcCache is the discoveryCache used to get the service deployment for an agent.
	svcCache *cache.Cache[console.ServiceDeploymentForAgent]

	// waveStatistics contains statistics about the wave that was processed.
	// TODO: make it thread-safe
	waveStatistics WaveStatistics
}

func (in *WaveProcessor) Run(ctx context.Context) (components []console.ComponentAttributes, errors []console.ServiceErrorAttributes) {
	in.mu.Lock()
	defer in.mu.Unlock()
	now := time.Now()

	in.init()

	workerWG := &sync.WaitGroup{}
	collectorWG := &sync.WaitGroup{}

	workerWG.Add(in.concurrentApplies)
	in.runWorkers(ctx, func() { workerWG.Done() })

	collectorWG.Add(1)
	cmpChan := in.componentChan
	errChan := in.errorsChan

	// run a collector goroutine to collect components and errors from the channels
	go func() {
		defer collectorWG.Done()
		for cmpChan != nil || errChan != nil {
			select {
			case <-ctx.Done():
				return
			case component, ok := <-cmpChan:
				if !ok {
					klog.V(log.LogLevelTrace).InfoS("component channel closed")
					cmpChan = nil
					continue
				}

				klog.V(log.LogLevelExtended).InfoS("received component", "component", component)
				components = append(components, component)
			case err, ok := <-errChan:
				if !ok {
					klog.V(log.LogLevelTrace).InfoS("error channel closed")
					errChan = nil
					continue
				}

				klog.V(log.LogLevelDebug).InfoS("received error", "error", err)
				errors = append(errors, err)
			}
		}
	}()

	// no more items will be added, allow workers to drain and exit
	in.queue.ShutDown()

	workerWG.Wait()
	close(in.componentChan)
	close(in.errorsChan)
	collectorWG.Wait()

	klog.V(log.LogLevelExtended).InfoS("finished wave", "type", in.wave.waveType, "count", in.wave.Len(), "duration", time.Since(now))
	return components, errors
}

func (in *WaveProcessor) runWorkers(ctx context.Context, onWorkerDone func()) {
	for i := 0; i < in.concurrentApplies; i++ {
		go func() {
			defer onWorkerDone()
			for {
				select {
				case <-ctx.Done():
					return
				default:
					if !in.processNextWorkItem(ctx) {
						klog.V(log.LogLevelTrace).InfoS("queue drained, exiting", "worker", i)
						return
					}

					// Sleep only when there is at least one full batch waiting and we are at max concurrency.
					// This avoids delay when the remaining items are fewer than the number of workers.
					if in.maxConcurrentApplies == in.concurrentApplies && in.queue.Len() > in.concurrentApplies {
						time.Sleep(common.WithJitter(in.deQueueDelay))
					}
				}
			}
		}()
	}
}

func (in *WaveProcessor) processNextWorkItem(ctx context.Context) bool {
	id, shutdown := in.queue.Get()
	if shutdown {
		return false
	}

	defer in.queue.Done(id)

	resource, exists := in.keyToResource[id]
	if !exists {
		klog.V(log.LogLevelTrace).InfoS("resource not found in keyToResource map, continuing", "id", id)
		return true
	}

	in.processWaveItem(ctx, id, resource)
	return true
}

func (in *WaveProcessor) processWaveItem(ctx context.Context, id smcommon.Key, resource unstructured.Unstructured) {
	now := time.Now()

	switch in.wave.waveType {
	case DeleteWave:
		klog.V(log.LogLevelDefault).InfoS("deleting resource", "resource", id)
		in.onDelete(ctx, resource)
	case ApplyWave:
		klog.V(log.LogLevelDebug).InfoS("applying resource", "resource", id)
		in.onApply(ctx, resource)
	}

	klog.V(log.LogLevelDebug).InfoS("finished processing wave item", "resource", id, "duration", time.Since(now))
}

func (in *WaveProcessor) clientForResource(resource unstructured.Unstructured) (dynamic.ResourceInterface, error) {
	mapping, err := in.discoveryCache.RestMapping(resource.GroupVersionKind())
	if err != nil {
		return nil, err
	}

	gvr := schema.GroupVersionResource{
		Group:    mapping.Resource.Group,
		Version:  mapping.Resource.Version,
		Resource: mapping.Resource.Resource,
	}

	if mapping.Scope.Name() == meta.RESTScopeNameNamespace {
		namespace := lo.Ternary(len(resource.GetNamespace()) == 0, "default", resource.GetNamespace())
		return in.client.Resource(gvr).Namespace(namespace), nil
	}

	return in.client.Resource(gvr), nil
}

func (in *WaveProcessor) onDelete(ctx context.Context, resource unstructured.Unstructured) {
	live, err := in.client.Resource(helpers.GVRFromGVK(resource.GroupVersionKind())).Namespace(resource.GetNamespace()).Get(ctx, resource.GetName(), metav1.GetOptions{})
	if apierrors.IsNotFound(err) {
		if err := streamline.GetGlobalStore().DeleteComponent(smcommon.NewStoreKeyFromUnstructured(resource)); err != nil {
			klog.V(log.LogLevelDefault).ErrorS(err, "failed to delete component from store", "resource", resource.GetUID())
		}

		in.waveStatistics.deleted++
		return
	}

	if err != nil {
		klog.V(log.LogLevelDefault).ErrorS(err, "failed to get resource from store", "resource", resource.GetUID())
		return
	}

	if live.GetAnnotations() != nil && live.GetAnnotations()[smcommon.LifecycleDeleteAnnotation] == smcommon.PreventDeletion {
		if err := streamline.GetGlobalStore().DeleteComponent(smcommon.NewStoreKeyFromUnstructured(lo.FromPtr(live))); err != nil {
			klog.V(log.LogLevelDefault).ErrorS(err, "failed to delete component", "resource", live.GetUID())
		}

		// skip deletion when prevented by annotation
		in.waveStatistics.deleted++ // In statistics, count as deleted
		return
	}

	c, err := in.clientForResource(*live)
	if err != nil {
		in.errorsChan <- console.ServiceErrorAttributes{
			Source:  "delete",
			Message: fmt.Sprintf("failed to build client for resource %s/%s: %s", live.GetNamespace(), live.GetName(), err.Error()),
		}
		return
	}

	err = c.Delete(ctx, live.GetName(), metav1.DeleteOptions{
		DryRun: lo.Ternary(in.dryRun, []string{metav1.DryRunAll}, []string{}),
	})
	if errors.IgnoreNotFound(err) != nil {
		in.errorsChan <- console.ServiceErrorAttributes{
			Source:  "delete",
			Message: fmt.Sprintf("failed to delete %s/%s: %s", live.GetNamespace(), live.GetName(), err.Error()),
		}
		return
	}

	in.waveStatistics.deleted++

	if in.dryRun {
		component := common.ToComponentAttributes(live)
		component = in.withDryRun(ctx, component, lo.FromPtr(live), true)
		in.componentChan <- lo.FromPtr(component)

		return
	}
}

func (in *WaveProcessor) onApply(ctx context.Context, resource unstructured.Unstructured) {
	entry, _ := streamline.GetGlobalStore().GetComponent(resource)
	if in.isManaged(entry, resource) {
		warning := fmt.Sprintf("resource %s/%s is already managed by another service %s", resource.GetKind(), resource.GetName(), entry.ServiceID)
		klog.V(log.LogLevelDebug).Info(warning)
		if !template.IsCRD(&resource) {
			in.errorsChan <- console.ServiceErrorAttributes{Source: "apply", Message: warning, Warning: lo.ToPtr(true)}
		}

		resource.SetUID(types.UID(entry.UID))
		in.componentChan <- lo.FromPtr(common.ToComponentAttributes(&resource))
		return
	}

	c, err := in.clientForResource(resource)
	if err != nil {
		in.errorsChan <- console.ServiceErrorAttributes{
			Source:  in.phase.String(),
			Message: fmt.Sprintf("failed to build client for resource %s/%s: %s", resource.GetNamespace(), resource.GetName(), err.Error()),
		}
		return
	}

	appliedResource, err := in.doApply(ctx, c, resource)
	if err != nil {
		if err := streamline.GetGlobalStore().ExpireSHA(resource); err != nil {
			klog.ErrorS(err, "failed to expire sha", "resource", resource.GetName(), "kind", resource.GetKind())
		}

		in.errorsChan <- console.ServiceErrorAttributes{
			Source:  in.phase.String(),
			Message: fmt.Sprintf("failed to apply %s/%s: %s", resource.GetNamespace(), resource.GetName(), err.Error()),
		}

		return
	}

	if appliedResource == nil {
		return
	}

	in.waveStatistics.applied++

	if in.onApplyCallback != nil {
		in.onApplyCallback(resource)
		klog.V(log.LogLevelDebug).InfoS("onApplyCallback called", "resource", resource.GetName(), "kind", resource.GetKind())
	}

	if in.dryRun {
		component := common.ToComponentAttributes(&resource)
		component = in.withDryRun(ctx, component, lo.FromPtr(appliedResource), false)
		in.componentChan <- lo.FromPtr(component)

		return
	}

	// The following function will skip save if it is unnecessary, i.e., the resource has no delete policy annotation set.
	if err = streamline.GetGlobalStore().SaveHookComponentWithManifestSHA(resource, lo.FromPtr(appliedResource)); err != nil {
		klog.V(log.LogLevelExtended).ErrorS(err, "failed to save hook component manifest sha", "resource", resource.GetName(), "kind", resource.GetKind())
		in.componentChan <- lo.FromPtr(common.ToComponentAttributes(appliedResource))
		return
	}

	// Sync component SHAs and mark the component with the manifest flag.
	if err := streamline.GetGlobalStore().SyncAppliedResource(lo.FromPtr(appliedResource)); err != nil {
		klog.V(log.LogLevelExtended).ErrorS(err, "failed to sync resource SHA",
			"resource", resource.GetName(), "kind", resource.GetKind())
	}

	in.componentChan <- lo.FromPtr(common.ToComponentAttributes(appliedResource))
}

// doReplace uses full PUT instead of SSA, creating the resource if it is missing.
func (in *WaveProcessor) doReplace(ctx context.Context, c dynamic.ResourceInterface, u unstructured.Unstructured) (*unstructured.Unstructured, error) {
	dryRunOptions := lo.Ternary(in.dryRun, []string{metav1.DryRunAll}, []string{})

	existing, err := c.Get(ctx, u.GetName(), metav1.GetOptions{})
	if err != nil {
		if apierrors.IsNotFound(err) {
			return c.Create(ctx, &u, metav1.CreateOptions{DryRun: dryRunOptions})
		}

		return nil, err
	}

	u.SetResourceVersion(existing.GetResourceVersion()) // Keep the resource version so the API server accepts the PUT.
	return c.Update(ctx, &u, metav1.UpdateOptions{DryRun: dryRunOptions})
}

func (in *WaveProcessor) doApply(ctx context.Context, c dynamic.ResourceInterface, u unstructured.Unstructured) (*unstructured.Unstructured, error) {
	// Replace takes priority over apply; with the force flag set, failures escalate.
	if smcommon.HasReplaceSyncOption(u) {
		appliedResource, err := in.doReplace(ctx, c, u)
		if err == nil || in.dryRun || !smcommon.HasForceSyncOption(u) {
			return appliedResource, err
		}

		// Replace failed and the force flag is set, escalate to delete and recreate.
		klog.V(log.LogLevelDebug).ErrorS(err, "replace failed, forcing recreate", "resource", u.GetName())
		return in.forceRecreate(ctx, c, u)
	}

	appliedResource, err := c.Apply(ctx, u.GetName(), &u, metav1.ApplyOptions{
		FieldManager: smcommon.ClientFieldManager,
		Force:        true,
		DryRun:       lo.Ternary(in.dryRun, []string{metav1.DryRunAll}, []string{}),
	})

	// Return early if no error occurred,
	// if the service is in dry run mode
	// or if the resource does not have the force sync option enabled.
	if err == nil || in.dryRun || !smcommon.HasForceSyncOption(u) {
		return appliedResource, err
	}

	klog.V(log.LogLevelDebug).ErrorS(err, "apply failed, forcing recreate", "resource", u.GetName())
	return in.forceRecreate(ctx, c, u)
}

func (in *WaveProcessor) forceRecreate(ctx context.Context, c dynamic.ResourceInterface, u unstructured.Unstructured) (*unstructured.Unstructured, error) {
	// Mark the resource as with resync in progress to use custom logic in status synchronizer.
	patch := unstructured.Unstructured{
		Object: map[string]any{
			"metadata": map[string]any{
				"annotations": map[string]any{
					smcommon.ResyncInProgressAnnotation: "true",
				},
			},
		},
	}
	patchBytes, _ := patch.MarshalJSON()
	if _, err := c.Patch(ctx, u.GetName(), types.MergePatchType, patchBytes, metav1.PatchOptions{}); err != nil {
		klog.V(log.LogLevelDebug).ErrorS(err, "failed to patch resource with resync annotation", "resource", u.GetName())
	}

	// Force sync by deleting the resource and letting it recreate next.
	if err := c.Delete(ctx, u.GetName(), metav1.DeleteOptions{
		GracePeriodSeconds: lo.ToPtr(int64(0)),
		PropagationPolicy:  lo.ToPtr(metav1.DeletePropagationForeground),
	}); err != nil {
		return nil, err
	}

	return CreateWithBackoff(ctx, c, u), nil
}

func (in *WaveProcessor) isManaged(entry *smcommon.Component, resource unstructured.Unstructured) bool {
	if entry == nil {
		return false
	}

	_, err := in.svcCache.Get(entry.ServiceID)
	if errors.IsNotFound(err) {
		return false
	}

	serviceID := smcommon.GetOwningInventory(resource)
	return len(entry.ServiceID) > 0 && len(serviceID) > 0 && entry.ServiceID != serviceID
}

func (in *WaveProcessor) withDryRun(ctx context.Context, component *console.ComponentAttributes, resource unstructured.Unstructured, delete bool) *console.ComponentAttributes {
	desiredJSON := utils.UnstructuredAsJSON(&resource)
	if delete {
		desiredJSON = "# n/a"
	}

	liveJSON := "# n/a"
	liveResource := in.refetch(ctx, resource)
	if liveResource != nil {
		liveJSON = utils.UnstructuredAsJSON(liveResource)
	}

	component.Synced = liveJSON == desiredJSON
	component.Content = &console.ComponentContentAttributes{
		Desired: &desiredJSON,
		Live:    &liveJSON,
	}
	component.State = common.ToStatus(&resource)
	component.Version = resource.GroupVersionKind().Version

	return component
}

func (in *WaveProcessor) refetch(ctx context.Context, resource unstructured.Unstructured) *unstructured.Unstructured {
	result, err := in.client.Resource(helpers.GVRFromGVK(resource.GroupVersionKind())).Namespace(resource.GetNamespace()).Get(ctx, resource.GetName(), metav1.GetOptions{})
	if err != nil {
		return nil
	}

	return result
}

func (in *WaveProcessor) init() {
	in.concurrentApplies = in.maxConcurrentApplies

	if len(in.wave.items) < in.maxConcurrentApplies {
		klog.V(log.LogLevelDebug).InfoS("optimizing concurrent applies", "max", in.maxConcurrentApplies, "optimized", in.wave.Len())
		in.concurrentApplies = len(in.wave.items)
	}

	in.componentChan = make(chan console.ComponentAttributes, in.concurrentApplies)
	in.errorsChan = make(chan console.ServiceErrorAttributes, in.concurrentApplies)
	in.keyToResource = make(map[smcommon.Key]unstructured.Unstructured)
	in.queue = workqueue.NewTyped[smcommon.Key]()

	for _, obj := range in.wave.items {
		key := smcommon.NewKeyFromUnstructured(obj)
		in.keyToResource[key] = obj
		in.queue.Add(key)
	}
}

func (in *WaveProcessor) Statistics() WaveStatistics {
	return in.waveStatistics
}

type WaveProcessorOption func(*WaveProcessor)

func WithWaveMaxConcurrentApplies(n int) WaveProcessorOption {
	return func(w *WaveProcessor) {
		if n < 1 {
			n = defaultMaxConcurrentApplies
		}
		w.maxConcurrentApplies = n
	}
}

func WithWaveDeQueueDelay(d time.Duration) WaveProcessorOption {
	return func(w *WaveProcessor) {
		if d <= 0 {
			d = defaultDeQueueDelay
		}
		w.deQueueDelay = d
	}
}

func WithWaveDryRun(dryRun bool) WaveProcessorOption {
	return func(w *WaveProcessor) {
		w.dryRun = dryRun
	}
}

func WithWaveOnApply(onApply func(resource unstructured.Unstructured)) WaveProcessorOption {
	return func(w *WaveProcessor) {
		w.onApplyCallback = onApply
	}
}

func WithWaveSvcCache(c *cache.Cache[console.ServiceDeploymentForAgent]) WaveProcessorOption {
	return func(w *WaveProcessor) {
		w.svcCache = c
	}
}

func NewWaveProcessor(dynamicClient dynamic.Interface, cache discoverycache.Cache, phase smcommon.SyncPhase, wave Wave, opts ...WaveProcessorOption) *WaveProcessor {
	result := &WaveProcessor{
		mu:                   sync.Mutex{},
		client:               dynamicClient,
		discoveryCache:       cache,
		phase:                phase,
		wave:                 wave,
		maxConcurrentApplies: defaultMaxConcurrentApplies,
		deQueueDelay:         defaultDeQueueDelay,
		waveStatistics:       NewWaveStatistics(wave),
	}

	for _, opt := range opts {
		opt(result)
	}

	return result
}

func CreateWithBackoff(ctx context.Context, c dynamic.ResourceInterface, obj unstructured.Unstructured) *unstructured.Unstructured {
	var result *unstructured.Unstructured

	backoff := wait.Backoff{
		Steps:    2,
		Duration: 100 * time.Millisecond,
		Factor:   3.0,
		Jitter:   0.1,
	}

	_ = wait.ExponentialBackoffWithContext(ctx, backoff, func(ctx context.Context) (bool, error) {
		var err error
		result, err = c.Create(ctx, &obj, metav1.CreateOptions{})
		if err != nil {
			// retry on any error
			return false, nil
		}
		return true, nil
	})

	return result
}
