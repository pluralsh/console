package controller

import (
	"context"
	"fmt"
	"math/rand"
	"sync"
	"time"

	"github.com/pluralsh/deployment-operator/internal/helpers"
	"github.com/pluralsh/deployment-operator/pkg/common"

	"k8s.io/apimachinery/pkg/types"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"
	"k8s.io/apimachinery/pkg/util/uuid"
	"k8s.io/klog/v2"

	logf "sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	v1 "github.com/pluralsh/deployment-operator/pkg/controller/v1"
	internallog "github.com/pluralsh/deployment-operator/pkg/log"
)

type Controller struct {
	// Name is used to uniquely identify a Controller in tracing, logging and monitoring. Name is required.
	Name string

	// MaxConcurrentReconciles is the maximum number of concurrent Reconciles which can be run. Defaults to 1.
	MaxConcurrentReconciles int

	// Reconciler is a function that can be called at any time with the ID of an object and
	// ensures that the state of the system matches the state specified in the object.
	Do v1.Reconciler

	// mu is used to synchronize Controller setup
	mu sync.Mutex

	// protect lastPollTime and lastReconcileTime
	timesMu sync.RWMutex

	// CacheSyncTimeout refers to the time limit set on waiting for cache to sync
	// Defaults to 2 minutes if not set.
	CacheSyncTimeout time.Duration

	// PollJitter defines how much polling jitter should there be when polling for new resources.
	PollJitter time.Duration

	// RecoverPanic indicates whether the panic caused by reconcile should be recovered.
	RecoverPanic *bool

	// lastPollTime is the last time Reconciler.Poll was called.
	lastPollTime time.Time

	// lastReconcileTime is the last time Reconciler.Reconcile was called.
	lastReconcileTime time.Time

	DeQueueJitter time.Duration
}

func (c *Controller) SetupWithManager(manager *Manager) {
	c.MaxConcurrentReconciles = manager.MaxConcurrentReconciles
	c.CacheSyncTimeout = manager.CacheSyncTimeout
	c.RecoverPanic = manager.RecoverPanic
	c.PollJitter = manager.PollJitter
	c.DeQueueJitter = time.Second
	c.lastPollTime = time.Now()
	c.lastReconcileTime = time.Now()
}

// Start implements controller.Controller.
func (c *Controller) Start(ctx context.Context) {
	// use an IIFE to get proper lock handling
	// but lock outside to get proper handling of the queue shutdown
	c.mu.Lock()

	wg := &sync.WaitGroup{}
	func() {
		defer c.mu.Unlock()
		defer utilruntime.HandleCrash()

		go c.startPoller(ctx)

		concurrentReconciles := c.MaxConcurrentReconciles
		if maxConcurrentReconciles := common.GetConfigurationManager().GetMaxConcurrentReconciles(); maxConcurrentReconciles != nil && *maxConcurrentReconciles > 0 {
			concurrentReconciles = *maxConcurrentReconciles
		}

		wg.Add(concurrentReconciles)
		for i := 0; i < concurrentReconciles; i++ {
			go func() {
				defer wg.Done()
				// Run a worker thread that just dequeues items, processes them, and marks them done.
				// It enforces that the reconcileHandler is never invoked concurrently with the same object.
				for c.processNextWorkItem(ctx) {
					time.Sleep(time.Duration(rand.Int63n(int64(c.DeQueueJitter))))
				}
			}()
		}
	}()

	<-ctx.Done()
	wg.Wait()
}

func (c *Controller) Restart() {
	c.Do.Restart()
}

// LastPollTime returns the last time controller poll was executed.
// It signals whether the controller is alive and running.
func (c *Controller) LastPollTime() time.Time {
	c.timesMu.RLock()
	defer c.timesMu.RUnlock()
	return c.lastPollTime
}

func (c *Controller) setLastPollTime(t time.Time) {
	c.timesMu.Lock()
	defer c.timesMu.Unlock()
	c.lastPollTime = t
}

func (c *Controller) setLastReconcileTime(t time.Time) {
	c.timesMu.Lock()
	defer c.timesMu.Unlock()
	c.lastReconcileTime = t
}

// LastReconcileTime returns the last time controller poll was executed.
// It signals whether the controller is alive and running.
func (c *Controller) LastReconcileTime() time.Time {
	c.timesMu.RLock()
	defer c.timesMu.RUnlock()
	return c.lastReconcileTime
}

func (c *Controller) startPoller(ctx context.Context) {
	defer c.Do.Shutdown()

	klog.V(internallog.LogLevelExtended).InfoS("Starting controller poller", "ctrl", c.Name)
	_ = helpers.DynamicPollUntilContextCancel(ctx, c.Do.GetPollInterval(), func(_ context.Context) (bool, error) {
		defer func() {
			c.setLastPollTime(time.Now())
		}()

		if err := c.Do.Poll(ctx); err != nil {
			klog.ErrorS(err, "poller failed")
		}

		// never stop
		return false, nil
	})
	klog.V(internallog.LogLevelDefault).InfoS("Controller poller finished", "ctrl", c.Name)
}

// processNextWorkItem will read a single work item off the workqueue and
// attempt to process it, by calling the reconcileHandler.
func (c *Controller) processNextWorkItem(ctx context.Context) bool {
	id, shutdown := c.Do.Queue().Get()
	if shutdown {
		// Stop working
		return false
	}

	// We call Done here so the workqueue knows we have finished
	// processing this item. We also must remember to call Forget if we
	// do not want this work item being re-queued. For example, we do
	// not call Forget if a transient error occurs, instead the item is
	// put back on the workqueue and attempted again after a back-off
	// period.
	defer c.Do.Queue().Done(id)
	c.reconcileHandler(ctx, id)
	return true
}

func (c *Controller) reconcileHandler(ctx context.Context, id string) {
	log := logf.FromContext(ctx)
	reconcileID := uuid.NewUUID()
	ctx = addReconcileID(ctx, reconcileID)

	// RunInformersAndControllers the syncHandler, passing it the Namespace/Name string of the
	// resource to be synced.
	log.V(5).Info("Reconciling")
	result, err := c.reconcile(ctx, id)

	if !result.IsZero() && err != nil {
		log.V(1).Info("Warning: Reconciler returned both a non-zero result and a non-nil error. The result will always be ignored if the error is non-nil and the non-nil error causes reqeueuing with exponential backoff. For more details, see: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/reconcile#Reconciler")
	}

	switch {
	case err != nil:
		log.Error(err, "Reconciler error, requeuing", "numRequeues", c.Do.Queue().NumRequeues(id))
		c.Do.Queue().AddRateLimited(id)
	case result.RequeueAfter > 0:
		log.V(5).Info(fmt.Sprintf("Reconcile done, requeueing after %s", result.RequeueAfter))
		// The result.RequeueAfter request will be lost, if it is returned
		// along with a non-nil error. But this is intended as
		// We need to drive to stable reconcile loops before queuing due
		// to result.RequestAfter
		c.Do.Queue().Forget(id)
		c.Do.Queue().AddAfter(id, result.RequeueAfter)
		// TODO: Remove once deprecation period ends.
	case result.Requeue: //nolint:staticcheck
		log.V(5).Info("Reconcile done, requeueing")
		c.Do.Queue().AddRateLimited(id)
	default:
		log.V(5).Info("Reconcile successful")
		// Finally, if no error occurs we Forget this item so it does not
		// get queued again until another change happens.
		c.Do.Queue().Forget(id)
	}
}

func (c *Controller) reconcile(ctx context.Context, req string) (_ reconcile.Result, err error) {
	defer func() {
		if r := recover(); r != nil {
			if c.RecoverPanic != nil && *c.RecoverPanic {
				for _, fn := range utilruntime.PanicHandlers {
					fn(ctx, r)
				}
				logf.FromContext(ctx).V(1).Error(err, fmt.Sprintf("Observed a panic in reconciler: %v", r))
				return
			}

			log := logf.FromContext(ctx)
			log.V(1).Info(fmt.Sprintf("Observed a panic in reconciler: %v", r))
			panic(r)
		} else {
			// Update last reconcile time on successful reconcile
			c.setLastReconcileTime(time.Now())
		}
	}()
	return c.Do.Reconcile(ctx, req)
}

// reconcileIDKey is a context.Context Value key. Its associated value should
// be a types.UID.
type reconcileIDKey struct{}

func addReconcileID(ctx context.Context, reconcileID types.UID) context.Context {
	return context.WithValue(ctx, reconcileIDKey{}, reconcileID)
}
