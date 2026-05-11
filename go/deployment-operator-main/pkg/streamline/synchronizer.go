package streamline

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/pluralsh/console/go/polly/containers"
	"github.com/pluralsh/deployment-operator/internal/utils"
	"github.com/samber/lo"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/client-go/util/workqueue"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/watch"
	"k8s.io/client-go/dynamic"
	"k8s.io/klog/v2"

	"github.com/pluralsh/deployment-operator/internal/metrics"
	"github.com/pluralsh/deployment-operator/pkg/common"
	"github.com/pluralsh/deployment-operator/pkg/log"
	smcommon "github.com/pluralsh/deployment-operator/pkg/streamline/common"
	"github.com/pluralsh/deployment-operator/pkg/streamline/store"
)

type Synchronizer interface {
	Start(ctx context.Context) error
	Stop()
	Started() bool
}

type synchronizer struct {
	mu      sync.RWMutex
	startMu sync.Mutex
	started bool
	cancel  context.CancelFunc

	client dynamic.Interface

	gvr            schema.GroupVersionResource
	gvk            schema.GroupVersionKind
	store          store.Store
	resyncInterval time.Duration

	componentQueue   workqueue.TypedRateLimitingInterface[string]
	eventSubscribers []EventSubscriber
}

func NewSynchronizer(client dynamic.Interface, gvr schema.GroupVersionResource, gvk schema.GroupVersionKind, store store.Store, resyncInterval time.Duration, componentQueue workqueue.TypedRateLimitingInterface[string], subscribers []EventSubscriber) Synchronizer {
	return &synchronizer{
		gvr:              gvr,
		gvk:              gvk,
		client:           client,
		store:            store,
		resyncInterval:   resyncInterval,
		componentQueue:   componentQueue,
		eventSubscribers: subscribers,
	}
}

func (in *synchronizer) Start(ctx context.Context) error {
	in.mu.Lock()
	now := time.Now()

	internalCtx, cancel := context.WithCancel(ctx)
	in.cancel = cancel

	list, err := in.client.Resource(in.gvr).Namespace(metav1.NamespaceAll).List(internalCtx, metav1.ListOptions{})
	if err != nil {
		in.mu.Unlock()
		return fmt.Errorf("failed to list resources: %w", err)
	}

	in.handleList(lo.FromPtr(list))

	resourceVersion := list.GetResourceVersion()
	watchCh, err := in.client.Resource(in.gvr).Namespace(metav1.NamespaceAll).Watch(internalCtx, metav1.ListOptions{
		ResourceVersion: resourceVersion,
	})
	if err != nil {
		in.mu.Unlock()
		return fmt.Errorf("failed to start watch: %w", err)
	}

	interval := common.WithJitter(in.resyncInterval)
	resyncAfter := time.After(interval)
	in.mu.Unlock()

	in.startMu.Lock()
	in.started = true
	in.startMu.Unlock()

	klog.V(log.LogLevelVerbose).InfoS("started watching resources", "gvr", in.gvr, "resourceVersion", resourceVersion, "resyncAfter", interval, "took", time.Since(now))
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-internalCtx.Done():
			return nil
		case event, ok := <-watchCh.ResultChan():
			if !ok {
				return fmt.Errorf("watch channel closed")
			}

			metrics.Record().SynchronizationEvent(event)
			resourceVersion = common.GetResourceVersion(event.Object, resourceVersion)

			if event.Type == watch.Error {
				var errString string
				status, ok := event.Object.(apierrors.APIStatus)
				if !ok {
					errString = fmt.Sprintf("could not parse error event: %v", event.Object)
				} else {
					errString = fmt.Sprintf("status=%q, message=%q, reason=%q, code=%q", status.Status().Status, status.Status().Message, status.Status().Reason, status.Status().Code)
				}

				return fmt.Errorf("received error event from watch: %s", errString)
			}

			in.handleEvent(event)
		case <-resyncAfter:
			watchCh.Stop()
			in.resynchronize()
			interval = common.WithJitter(in.resyncInterval)
			resyncAfter = time.After(interval)
			watchCh, err = in.client.Resource(in.gvr).Namespace(metav1.NamespaceAll).Watch(internalCtx, metav1.ListOptions{
				ResourceVersion: resourceVersion,
			})
			if err != nil {
				return fmt.Errorf("failed to restart watch: %w", err)
			}
			klog.V(log.LogLevelExtended).InfoS("restarted watch", "gvr", in.gvr, "resourceVersion", resourceVersion, "resyncAfter", interval)
		}
	}
}

func (in *synchronizer) notifyEventSubscribers(e watch.Event) {
	for _, f := range in.eventSubscribers {
		go f(e)
	}
}

func (in *synchronizer) handleList(list unstructured.UnstructuredList) {
	for _, resource := range list.Items {
		in.notifyEventSubscribers(watch.Event{Type: watch.Added, Object: resource.DeepCopyObject()})
	}

	if err := in.store.SaveComponents(list.Items); err != nil {
		klog.ErrorS(err, "failed to save resource", "gvr", in.gvr)
	}
}

func (in *synchronizer) handleEvent(ev watch.Event) {
	in.notifyEventSubscribers(ev)

	switch ev.Type {
	case watch.Added, watch.Modified:
		obj, err := common.ToUnstructured(ev.Object)
		if err != nil {
			klog.ErrorS(err, "failed to convert to unstructured", "gvr", in.gvr)
			return
		}

		klog.V(log.LogLevelTrace).InfoS("adding/updating resource in the store", "gvr", in.gvr, "name", obj.GetName())
		if err := in.store.SaveComponent(*obj); err != nil {
			klog.ErrorS(err, "failed to save resource", "gvr", in.gvr, "name", obj.GetName())
			return
		}

		// Once a component is saved, check if it belongs to a service and update service components if needed.
		in.maybeSyncServiceComponents(*obj, false)
	case watch.Deleted:
		obj, err := common.ToUnstructured(ev.Object)
		if err != nil {
			klog.ErrorS(err, "failed to convert to unstructured", "gvr", in.gvr)
			return
		}

		// If a component force resync is in progress, do not delete it from the database and only mark as unsynced.
		if smcommon.HasResyncInProgressAnnotation(obj) {
			if err = in.store.SetComponentUnsynced(*obj); err != nil {
				klog.ErrorS(err, "failed to mark component as unsynced", "gvr", in.gvr, "name", obj.GetName())
				return
			}

			in.maybeSyncServiceComponents(*obj, true)
			return
		}

		klog.V(log.LogLevelTrace).InfoS("deleting resource from the store", "gvr", in.gvr, "name", obj.GetName())
		if err = in.store.DeleteComponent(smcommon.NewStoreKeyFromUnstructured(lo.FromPtr(obj))); err != nil {
			klog.ErrorS(err, "failed to delete resource", "gvr", in.gvr, "name", obj.GetName())
			return
		}
		in.maybeSyncServiceComponents(*obj, true)
	}
}

func (in *synchronizer) maybeSyncServiceComponents(resource unstructured.Unstructured, delete bool) {
	// Check if the resource belongs to a service.
	serviceId := smcommon.GetOwningInventory(resource)
	if serviceId == "" {
		return
	}

	if !delete {
		component, err := in.store.GetAppliedComponent(resource)
		if err != nil || component == nil || !component.Manifest {
			return
		}
	}

	in.componentQueue.AddRateLimited(serviceId)
}

func (in *synchronizer) Stop() {
	in.startMu.Lock()
	if !in.started {
		in.startMu.Unlock()
		return
	}
	in.startMu.Unlock()

	in.mu.Lock()
	defer in.mu.Unlock()
	if err := in.store.DeleteComponents(in.gvk.Group, in.gvk.Version, in.gvk.Kind); err != nil {
		klog.ErrorS(err, "failed to delete resources from store", "gvr", in.gvr)
	}

	in.cancel()
	in.started = false
}

func (in *synchronizer) Started() bool {
	in.startMu.Lock()
	defer in.startMu.Unlock()

	return in.started
}

func (in *synchronizer) resynchronize() {
	now := time.Now()
	list, err := in.client.Resource(in.gvr).Namespace(metav1.NamespaceAll).List(context.Background(), metav1.ListOptions{})
	if err != nil || list == nil {
		klog.ErrorS(err, "failed to list resources from API", "gvr", in.gvr)
		return
	}

	var gvk *schema.GroupVersionKind
	liveResourceSet := containers.NewSet[smcommon.Key]()
	liveResourceMap := make(map[smcommon.Key]unstructured.Unstructured)
	for _, resource := range list.Items {
		key := smcommon.NewKeyFromUnstructured(resource)
		liveResourceSet.Add(key)
		liveResourceMap[key] = resource

		if gvk == nil {
			gvk = lo.ToPtr(resource.GroupVersionKind())
		}
	}

	entries, err := in.store.GetAppliedComponentsByGVK(lo.FromPtr(gvk))
	if err != nil {
		klog.ErrorS(err, "failed to get applied components from the store", "gvr", in.gvr)
		return
	}

	storeResourceSet := containers.NewSet[smcommon.Key]()
	storeResourceMap := make(map[smcommon.Key]smcommon.Component)
	for _, entry := range entries {
		key := entry.StoreKey().Key()
		storeResourceSet.Add(key)
		storeResourceMap[key] = entry
	}

	toDelete := storeResourceSet.Difference(liveResourceSet)
	toAdd := liveResourceSet.Difference(storeResourceSet)
	toUpdate := liveResourceSet.Intersect(storeResourceSet)

	for _, key := range toDelete.List() {
		entry := storeResourceMap[key]
		klog.V(log.LogLevelDebug).InfoS("resync - deleting component from store", "gvr", in.gvr, "resource", entry.UID)
		if err := in.store.DeleteComponent(entry.StoreKey()); err != nil {
			klog.ErrorS(err, "failed to delete component from store", "resource", entry.UID)
		}
	}

	for _, key := range toAdd.List() {
		resource := liveResourceMap[key]
		klog.V(log.LogLevelDebug).InfoS("resync - adding component to store", "gvr", in.gvr, "resource", resource.GetName())
		if err := in.store.SaveComponent(resource); err != nil {
			klog.ErrorS(err, "failed to save component to store", "resource", resource.GetName())
			continue
		}
	}

	for _, key := range toUpdate.List() {
		resource := liveResourceMap[key]
		entry := storeResourceMap[key]

		liveSHA, err := utils.HashResource(resource)
		if err != nil {
			klog.ErrorS(err, "failed to hash resource", "resource", resource.GetName())
			continue
		}

		if liveSHA == entry.ServerSHA {
			continue
		}

		klog.V(log.LogLevelDebug).InfoS("resync - updating component in store", "gvr", in.gvr, "resource", resource.GetName())
		if err := in.store.SaveComponent(resource); err != nil {
			klog.ErrorS(err, "failed to save component to store", "resource", resource.GetName())
		}
	}
	klog.V(log.LogLevelVerbose).InfoS("resync complete", "gvr", in.gvr, "duration", time.Since(now))
}
