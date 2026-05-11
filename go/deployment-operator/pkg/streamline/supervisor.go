package streamline

import (
	"context"
	"fmt"
	"sync"
	"time"

	cmap "github.com/orcaman/concurrent-map/v2"
	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/polly/cache"
	"github.com/samber/lo"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/watch"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/util/workqueue"
	"k8s.io/klog/v2"

	smcommon "github.com/pluralsh/deployment-operator/pkg/streamline/common"

	"github.com/pluralsh/deployment-operator/internal/metrics"
	discoverycache "github.com/pluralsh/deployment-operator/pkg/cache/discovery"
	"github.com/pluralsh/deployment-operator/pkg/common"
	"github.com/pluralsh/deployment-operator/pkg/log"
	"github.com/pluralsh/deployment-operator/pkg/streamline/store"
)

type Option func(*Supervisor)

type EventSubscriber func(event watch.Event)

func WithRestartDelay(d time.Duration) Option {
	return func(s *Supervisor) {
		s.restartDelay = d
	}
}

func WithCacheSyncTimeout(d time.Duration) Option {
	return func(s *Supervisor) {
		s.cacheSyncTimeout = d
	}
}

func WithMaxNotFoundRetries(n int) Option {
	return func(s *Supervisor) {
		s.maxNotFoundRetries = n
	}
}

func WithSynchronizerResyncInterval(d time.Duration) Option {
	return func(s *Supervisor) {
		s.synchronizerResyncInterval = d
	}
}

func WithEventSubscribers(gvr schema.GroupVersionResource, subscriber []EventSubscriber) Option {
	return func(s *Supervisor) {
		s.eventSubscribers.Set(gvr, subscriber)
	}
}

type Supervisor struct {
	mu                 sync.RWMutex
	started            bool
	client             dynamic.Interface
	discoveryCache     discoverycache.Cache
	svcCache           *cache.Cache[console.ServiceDeploymentForAgent]
	statusSynchronizer StatusSynchronizer
	store              store.Store

	registerQueue  workqueue.TypedRateLimitingInterface[schema.GroupVersionResource]
	componentQueue workqueue.TypedRateLimitingInterface[string]

	synchronizers          cmap.ConcurrentMap[schema.GroupVersionResource, Synchronizer]
	restartAttemptsLeftMap cmap.ConcurrentMap[schema.GroupVersionResource, int]

	eventSubscribers cmap.ConcurrentMap[schema.GroupVersionResource, []EventSubscriber]

	dequeueJitter                 time.Duration
	updateJitter                  time.Duration
	restartDelay                  time.Duration
	cacheSyncTimeout              time.Duration
	synchronizerResyncInterval    time.Duration
	maxNotFoundRetries            int
	maxConcurrentRegistrations    int
	maxConcurrentComponentUpdates int
}

func NewSupervisor(client dynamic.Interface, store store.Store, statusSynchronizer StatusSynchronizer,
	discoveryCache discoverycache.Cache, svcCache *cache.Cache[console.ServiceDeploymentForAgent], options ...Option) *Supervisor {
	s := &Supervisor{
		client:                        client,
		statusSynchronizer:            statusSynchronizer,
		discoveryCache:                discoveryCache,
		svcCache:                      svcCache,
		store:                         store,
		registerQueue:                 workqueue.NewTypedRateLimitingQueue(workqueue.DefaultTypedControllerRateLimiter[schema.GroupVersionResource]()),
		componentQueue:                workqueue.NewTypedRateLimitingQueue(workqueue.DefaultTypedControllerRateLimiter[string]()),
		synchronizers:                 cmap.NewStringer[schema.GroupVersionResource, Synchronizer](),
		restartAttemptsLeftMap:        cmap.NewStringer[schema.GroupVersionResource, int](),
		eventSubscribers:              cmap.NewStringer[schema.GroupVersionResource, []EventSubscriber](),
		maxNotFoundRetries:            3,
		restartDelay:                  1 * time.Second,
		cacheSyncTimeout:              5 * time.Second,
		synchronizerResyncInterval:    30 * time.Minute,
		dequeueJitter:                 200 * time.Millisecond,
		updateJitter:                  5 * time.Millisecond,
		maxConcurrentRegistrations:    20,
		maxConcurrentComponentUpdates: 10,
	}

	for _, option := range options {
		option(s)
	}

	return s
}

func (in *Supervisor) WaitForCacheSync(ctx context.Context) error {
	timeoutChan := time.After(in.cacheSyncTimeout)
	syncedCount := 0
	syncedFunc := func() bool {
		syncedCount = lo.CountBy(lo.Values(in.synchronizers.Items()), func(s Synchronizer) bool { return s.Started() })
		return syncedCount == in.synchronizers.Count()
	}
	for {
		select {
		case <-ctx.Done():
			return nil
		case <-timeoutChan:
			if syncedFunc() {
				return nil
			}

			return fmt.Errorf("timed out waiting for cache sync, synced %d out of %d synchronizers", syncedCount, in.synchronizers.Count())
		case <-time.After(time.Second):
			if syncedFunc() {
				return nil
			}
		}
	}
}

func (in *Supervisor) MaybeRegister(gvr schema.GroupVersionResource) {
	if smcommon.OptionalResourceVersionList.Has(fmt.Sprintf("%s/%s", gvr.Resource, gvr.Version)) {
		klog.V(log.LogLevelVerbose).InfoS("skipping resource to watch as it is optional", "gvr", gvr.String())
		return
	}

	in.Register(gvr)
}

func (in *Supervisor) Register(gvr schema.GroupVersionResource) {
	if smcommon.GroupBlacklist.Has(gvr.Group) || smcommon.ResourceVersionBlacklist.Has(fmt.Sprintf("%s/%s", gvr.Resource, gvr.Version)) {
		klog.V(log.LogLevelExtended).InfoS("skipping resource to watch as it is blacklisted", "gvr", gvr.String())
		return
	}

	if in.synchronizers.Has(gvr) {
		klog.V(log.LogLevelDebug).InfoS("skipping resource to watch as it is already being watched", "gvr", gvr.String())
		return
	}

	in.mu.RLock()
	if !in.started {
		in.mu.RUnlock()
		return
	}
	in.mu.RUnlock()

	in.resetAttempts(gvr)

	gvk, err := in.discoveryCache.KindFor(gvr)
	if err != nil {
		klog.V(log.LogLevelExtended).ErrorS(err, "failed to register resource, could not get gvk for resource", "gvr", gvr.String())
		return
	}

	klog.V(log.LogLevelExtended).InfoS("registering resource to watch", "gvr", gvr.String())
	eventSubscribers, _ := in.eventSubscribers.Get(gvr)
	in.synchronizers.Set(gvr, NewSynchronizer(in.client, gvr, gvk, in.store, in.synchronizerResyncInterval, in.componentQueue, eventSubscribers))
	in.registerQueue.Add(gvr)
}

func (in *Supervisor) Unregister(gvr schema.GroupVersionResource) {
	if s, ok := in.synchronizers.Get(gvr); ok {
		klog.V(log.LogLevelVerbose).InfoS("unregistering resource from watch", "gvr", gvr.String())
		s.Stop()
		in.synchronizers.Remove(gvr)
	}

	in.clearAttempts(gvr)
}

func (in *Supervisor) Run(ctx context.Context) {
	in.mu.Lock()

	if in.started {
		in.mu.Unlock()
		return
	}

	in.started = true
	in.mu.Unlock()

	go func() {
		for i := 0; i < in.maxConcurrentRegistrations; i++ {
			go func() {
				for in.processNextWorkItem(ctx) {
					time.Sleep(common.WithJitter(in.dequeueJitter))
				}
			}()
		}
	}()

	go func() {
		for i := 0; i < in.maxConcurrentComponentUpdates; i++ {
			go func() {
				for in.processComponentUpdate() {
					time.Sleep(common.WithJitter(in.updateJitter))
				}
			}()
		}
	}()

	in.registerInitialResources()
	in.watchDiscoveryCacheChanges()
}

func (in *Supervisor) processNextWorkItem(ctx context.Context) bool {
	gvr, shutdown := in.registerQueue.Get()
	if shutdown {
		// Stop working
		return false
	}

	defer func() {
		in.registerQueue.Forget(gvr)
		in.registerQueue.Done(gvr)
	}()
	go in.startSynchronizer(ctx, gvr)
	return true
}

func (in *Supervisor) Stop() {
	in.mu.RLock()
	if !in.started {
		in.mu.RUnlock()
		return
	}
	in.mu.RUnlock()

	in.mu.Lock()
	in.started = false
	in.registerQueue.ShutDown()
	in.synchronizers.Clear()
	in.restartAttemptsLeftMap.Clear()
	in.mu.Unlock()

	for _, s := range in.synchronizers.Items() {
		s.Stop()
	}
}

func (in *Supervisor) startSynchronizer(ctx context.Context, gvr schema.GroupVersionResource) {
	syn, ok := in.synchronizers.Get(gvr)
	if !ok {
		return
	}

	metrics.Record().ResourceCacheWatchStart(gvr.String())
	err := syn.Start(ctx) // start is a blocking operation
	metrics.Record().ResourceCacheWatchEnd(gvr.String())

	in.synchronizers.Remove(gvr)

	if err == nil {
		klog.V(log.LogLevelVerbose).InfoS("synchronizer stopped", "gvr", gvr.String())
		metrics.Record().ResourceCacheWatchRemove(gvr.String())
		return
	}

	if apierrors.IsMethodNotSupported(err) {
		klog.V(log.LogLevelVerbose).ErrorS(err, "skipping resource as it is not supported", "gvr", gvr.String())
		metrics.Record().ResourceCacheWatchRemove(gvr.String())
		return
	}

	gvk, discErr := in.discoveryCache.KindFor(gvr)
	if discErr != nil {
		klog.V(log.LogLevelVerbose).ErrorS(discErr, "failed to register resource, could not get gvk for resource", "gvr", gvr.String())
		metrics.Record().ResourceCacheWatchRemove(gvr.String())
		return
	}

	if apierrors.IsNotFound(err) {
		left, used := in.decreaseAttempts(gvr)
		if left == 0 {
			klog.V(log.LogLevelVerbose).ErrorS(err, "resource not found after retries, skipping", "gvr", gvr.String(), "attempts", used)
			in.clearAttempts(gvr)
			metrics.Record().ResourceCacheWatchRemove(gvr.String())
			return
		}

		klog.V(log.LogLevelExtended).ErrorS(err, "resource not found, retrying", "gvr", gvr.String(), "attemptsLeft", left)
	} else {
		klog.V(log.LogLevelDefault).ErrorS(err, "unknown synchronizer error, restarting", "gvr", gvr.String())
	}

	eventSubscribers, _ := in.eventSubscribers.Get(gvr)
	in.synchronizers.Set(gvr, NewSynchronizer(in.client, gvr, gvk, in.store, in.synchronizerResyncInterval, in.componentQueue, eventSubscribers))
	in.registerQueue.AddRateLimited(gvr)
}

func (in *Supervisor) registerInitialResources() {
	for _, gvr := range in.discoveryCache.GroupVersionResource().List() {
		in.MaybeRegister(gvr)
	}

	klog.V(log.LogLevelDefault).InfoS("initial resources registered", "count", in.synchronizers.Count())
}

func (in *Supervisor) watchDiscoveryCacheChanges() {
	in.discoveryCache.OnGroupVersionResourceAdded(func(gvr schema.GroupVersionResource) {
		in.MaybeRegister(gvr)
	})

	in.discoveryCache.OnGroupVersionResourceDeleted(func(gvr schema.GroupVersionResource) {
		in.Unregister(gvr)
	})
}

func (in *Supervisor) resetAttempts(gvr schema.GroupVersionResource) {
	in.restartAttemptsLeftMap.Set(gvr, in.maxNotFoundRetries)
}

func (in *Supervisor) decreaseAttempts(gvr schema.GroupVersionResource) (left int, used int) {
	v, ok := in.restartAttemptsLeftMap.Get(gvr)
	if !ok {
		v = in.maxNotFoundRetries
	}

	v--
	if v < 0 {
		v = 0
	}

	in.restartAttemptsLeftMap.Set(gvr, v)
	return v, in.maxNotFoundRetries - v
}

func (in *Supervisor) clearAttempts(gvr schema.GroupVersionResource) {
	in.restartAttemptsLeftMap.Remove(gvr)
}

func (in *Supervisor) processComponentUpdate() bool {
	serviceId, shutdown := in.componentQueue.Get()
	if shutdown {
		return false
	}

	defer func() {
		in.componentQueue.Forget(serviceId)
		in.componentQueue.Done(serviceId)
	}()

	in.flushComponentUpdates(serviceId)
	return true
}

func (in *Supervisor) flushComponentUpdates(serviceId string) {
	svc, err := in.svcCache.Get(serviceId)
	if err != nil {
		klog.ErrorS(err, "failed to get service from cache", "service", serviceId)
		return
	}

	attrs, err := in.store.GetComponentAttributes(serviceId, lo.FromPtr(svc.DeletedAt) != "")
	if err != nil {
		klog.ErrorS(err, "failed to get service components", "service", serviceId)
		return
	}

	if err = in.statusSynchronizer.UpdateServiceComponents(serviceId, lo.ToSlicePtr(attrs)); err != nil {
		klog.ErrorS(err, "failed to update service components", "service", serviceId)
	}
}
