package test

import (
	"context"
	"sync/atomic"
	"testing"
	"time"

	"github.com/pluralsh/deployment-operator/pkg/websocket"

	"github.com/pluralsh/deployment-operator/pkg/controller"
	"github.com/stretchr/testify/assert"
	"k8s.io/client-go/util/workqueue"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

// dynamicPollerReconciler is a minimal test reconciler
type dynamicPollerReconciler struct {
	pollCount      atomic.Int32
	reconcileCount atomic.Int32
	stopPoller     atomic.Bool
	queue          workqueue.TypedRateLimitingInterface[string]
}

func newDynamicPollerReconciler() *dynamicPollerReconciler {
	return &dynamicPollerReconciler{
		queue: workqueue.NewTypedRateLimitingQueue[string](workqueue.NewTypedMaxOfRateLimiter[string]()),
	}
}

func (f *dynamicPollerReconciler) Poll(ctx context.Context) error {
	f.pollCount.Add(1)
	// Enqueue a test key so Reconcile gets called
	f.queue.Add("test-key")
	return nil
}

func (f *dynamicPollerReconciler) Reconcile(ctx context.Context, req string) (reconcile.Result, error) {
	f.reconcileCount.Add(1)
	f.queue.Forget(req)
	return reconcile.Result{}, nil
}

func (f *dynamicPollerReconciler) GetPollInterval() func() time.Duration {
	return func() time.Duration {
		if f.stopPoller.Load() {
			return 0
		}
		return 100 * time.Millisecond
	}
}

func (f *dynamicPollerReconciler) GetPublisher() (string, websocket.Publisher) {
	return name, &FakePublisher{}
}

func (f *dynamicPollerReconciler) Queue() workqueue.TypedRateLimitingInterface[string] {
	return f.queue
}

func (f *dynamicPollerReconciler) Restart() {}
func (f *dynamicPollerReconciler) Shutdown() {
	f.queue.ShutDown()
}

func TestManagerRunsControllerStopPoller(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 300*time.Millisecond)
	defer cancel()

	// Create manager
	mgr, err := controller.NewControllerManager(controller.WithSocket(&FakeSocket{}),
		controller.WithMaxConcurrentReconciles(1))
	assert.NoError(t, err)

	// Add fake reconciler
	reconciler := newDynamicPollerReconciler()
	reconciler.stopPoller.Store(true)
	mgr.AddController(&controller.Controller{
		Name: name,
		Do:   reconciler,
	})

	// Start manager
	err = mgr.Start(ctx)
	assert.NoError(t, err)

	// Allow some time for polling/reconciliation
	<-ctx.Done()

	assert.Equal(t, int32(0), reconciler.pollCount.Load(), "expected poll count to be zero")
	assert.Equal(t, int32(0), reconciler.reconcileCount.Load(), "expected reconcile count to be zero")
}

func TestManagerRunsControllerStopStartPoller(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	// Create manager
	mgr, err := controller.NewControllerManager(controller.WithSocket(&FakeSocket{}),
		controller.WithMaxConcurrentReconciles(1))
	assert.NoError(t, err)

	// Add fake reconciler
	reconciler := newDynamicPollerReconciler()
	reconciler.stopPoller.Store(true)
	mgr.AddController(&controller.Controller{
		Name: name,
		Do:   reconciler,
	})

	// Start manager
	err = mgr.Start(ctx)
	assert.NoError(t, err)

	go func() {
		time.Sleep(500 * time.Millisecond)
		reconciler.stopPoller.Store(false)
	}()

	// Allow some time for polling/reconciliation
	<-ctx.Done()

	assert.True(t, reconciler.pollCount.Load() > 0, "expected Poll() to be called at least once")
	assert.True(t, reconciler.reconcileCount.Load() > 0, "expected Reconcile() to be called at least once")
}
