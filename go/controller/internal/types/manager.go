package types

import (
	"context"
	"fmt"
	"math/rand"
	"sync"
	"time"

	"github.com/samber/lo"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"
	"k8s.io/client-go/util/workqueue"
	ctrl "sigs.k8s.io/controller-runtime"
	logf "sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

type Processor interface {
	Process(ctx context.Context, req ctrl.Request) (ctrl.Result, error)

	// Queue returns a queue.
	Queue() workqueue.TypedRateLimitingInterface[ctrl.Request]
}

type Manager struct {
	// Name is used to uniquely identify a Controller in tracing, logging and monitoring. Name is required.
	Name string

	// Reconciler is a function that can be called at any time with the information about object and
	// ensures that the state of the system matches the state specified in the object.
	Do Processor

	// mu is used to synchronize Controller setup
	mu sync.Mutex

	// MaxConcurrentReconciles is the maximum number of concurrent Reconciles which can be run. Defaults to 1.
	MaxConcurrentReconciles int

	// RecoverPanic indicates whether the panic caused by reconcile should be recovered.
	RecoverPanic *bool

	// DeQueueJitter is a random duration that is added to the dequeue time to avoid thundering herd problem.
	DeQueueJitter time.Duration
}

// Start implements controller.Controller.
func (c *Manager) Start(ctx context.Context) {
	// use an IIFE to get proper lock handling
	// but lock outside to get proper handling of the queue shutdown
	c.mu.Lock()

	wg := &sync.WaitGroup{}
	func() {
		defer c.mu.Unlock()
		defer utilruntime.HandleCrash()

		wg.Add(c.MaxConcurrentReconciles)
		for i := 0; i < c.MaxConcurrentReconciles; i++ {
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

// processNextWorkItem will read a single work item off the workqueue and
// attempt to process it, by calling the reconcileHandler.
func (c *Manager) processNextWorkItem(ctx context.Context) bool {
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

func (c *Manager) reconcileHandler(ctx context.Context, req ctrl.Request) {
	log := logf.FromContext(ctx)

	// RunInformersAndControllers the syncHandler, passing it the Namespace/Name string of the
	// resource to be synced.
	log.V(5).Info("Reconciling")
	result, err := c.reconcile(ctx, req)
	switch {
	case err != nil:
		c.Do.Queue().AddRateLimited(req)

		if !result.IsZero() {
			log.V(1).Info("Warning: Reconciler returned both a non-zero result and a non-nil error. The result will always be ignored if the error is non-nil and the non-nil error causes reqeueuing with exponential backoff. For more details, see: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/reconcile#Reconciler")
		}
		log.Error(err, "Reconciler error")
	case result.RequeueAfter > 0:
		log.V(5).Info(fmt.Sprintf("Reconcile done, requeueing after %s", result.RequeueAfter))
		// The result.RequeueAfter request will be lost, if it is returned
		// along with a non-nil error. But this is intended as
		// We need to drive to stable reconcile loops before queuing due
		// to result.RequestAfter
		c.Do.Queue().Forget(req)
		c.Do.Queue().AddAfter(req, result.RequeueAfter)
	default:
		log.V(5).Info("Reconcile successful")
		// Finally, if no error occurs we Forget this item so it does not
		// get queued again until another change happens.
		c.Do.Queue().Forget(req)
	}
}

func (c *Manager) reconcile(ctx context.Context, req ctrl.Request) (_ reconcile.Result, err error) {
	defer func() {
		if r := recover(); r != nil {
			if c.RecoverPanic != nil && *c.RecoverPanic {
				for _, fn := range utilruntime.PanicHandlers {
					fn(ctx, r)
				}
				err = fmt.Errorf("panic: %v [recovered]", r)
				return
			}

			log := logf.FromContext(ctx)
			log.V(1).Info(fmt.Sprintf("Observed a panic in reconciler: %v", r))
			panic(r)
		}
	}()
	return c.Do.Process(ctx, req)
}

func NewManager(name string, maxConcurrentReconciles int, processor Processor) Manager {
	return Manager{
		MaxConcurrentReconciles: maxConcurrentReconciles,
		RecoverPanic:            lo.ToPtr(true),
		DeQueueJitter:           1 * time.Second,
		Do:                      processor,
		Name:                    name,
	}
}
