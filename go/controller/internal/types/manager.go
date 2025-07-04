package types

import (
	"context"
	"fmt"
	"math/rand"
	"sync"
	"time"

	cmap "github.com/orcaman/concurrent-map/v2"
	"github.com/samber/lo"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"
	"k8s.io/client-go/util/workqueue"
	"k8s.io/klog/v2"
	ctrl "sigs.k8s.io/controller-runtime"
	logf "sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

const (
	DefaultShardedReconcilerWorkers = 16
)

type Processor interface {
	Process(ctx context.Context, req ctrl.Request) (ctrl.Result, error)

	// Queue returns a queue.
	Queue() workqueue.TypedRateLimitingInterface[ctrl.Request]

	// Name returns the name of the processor.
	Name() Reconciler
}

type Manager struct {
	// Reconciler is a function that can be called at any time with the information about object and
	// ensures that the state of the system matches the state specified in the object.
	Do Processor

	// mu is used to synchronize Controller setup
	mu sync.Mutex

	// inProgress is a map of currently in-progress reconciles.
	// It is used to ensure that the same object is not being processed concurrently.
	inProgress cmap.ConcurrentMap[string, struct{}]

	// inProgessLock is used to synchronize in-progress reconciles handling
	inProgessLock sync.Mutex

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
	klog.InfoS("starting processor manager", "controller", c.Do.Name(), "max_concurrent_reconciles", c.MaxConcurrentReconciles)

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
				for c.processNextWorkItem(ctx, i) {
					time.Sleep(time.Duration(rand.Int63n(int64(c.DeQueueJitter))))
				}
			}()
		}
	}()

	<-ctx.Done()
	wg.Wait()
}

func (c *Manager) isInProgress(req ctrl.Request) bool {
	_, exists := c.inProgress.Get(req.String())
	return exists
}

// processNextWorkItem will read a single work item off the workqueue and
// attempt to process it, by calling the reconcileHandler.
func (c *Manager) processNextWorkItem(ctx context.Context, idx int) bool {
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

	c.inProgessLock.Lock()
	if c.isInProgress(id) {
		c.Do.Queue().Forget(id)
		c.Do.Queue().AddAfter(id, 5*time.Second)
		c.inProgessLock.Unlock()
		return true
	}
	c.inProgress.Set(id.String(), struct{}{})
	c.inProgessLock.Unlock()
	defer c.inProgress.Remove(id.String())

	c.reconcileHandler(ctx, id, idx)
	return true
}

func (c *Manager) reconcileHandler(ctx context.Context, req ctrl.Request, idx int) {
	log := logf.FromContext(ctx)

	// RunInformersAndControllers the syncHandler, passing it the Namespace/Name string of the
	// resource to be synced.
	log.V(3).Info("Reconciling", "controller", c.Do.Name(), "req", req, "worker_number", idx)
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

func NewManager(processor Processor, opts ...Option) *Manager {
	manager := &Manager{
		MaxConcurrentReconciles: DefaultShardedReconcilerWorkers,
		RecoverPanic:            lo.ToPtr(true),
		DeQueueJitter:           time.Second,
		Do:                      processor,
		inProgress:              cmap.New[struct{}](),
		inProgessLock:           sync.Mutex{},
		mu:                      sync.Mutex{},
	}

	for _, opt := range opts {
		opt(manager)
	}

	return manager
}

type Option func(*Manager)

// WithMaxConcurrentReconciles sets the maximum number of concurrent reconciles.
func WithMaxConcurrentReconciles(max int) Option {
	return func(m *Manager) {
		m.MaxConcurrentReconciles = max
	}
}

// WithRecoverPanic sets whether the panic caused by reconcile should be recovered.
func WithRecoverPanic(recover bool) Option {
	return func(m *Manager) {
		m.RecoverPanic = lo.ToPtr(recover)
	}
}

// WithDeQueueJitter sets the random duration that is added to the dequeue time to avoid thundering herd problem.
func WithDeQueueJitter(jitter time.Duration) Option {
	return func(m *Manager) {
		m.DeQueueJitter = jitter
	}
}
