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

// basicReconciler is a minimal test reconciler
type basicReconciler struct {
	pollCount      atomic.Int32
	reconcileCount atomic.Int32
	queue          workqueue.TypedRateLimitingInterface[string]
}

func newBasicReconciler() *basicReconciler {
	return &basicReconciler{
		queue: workqueue.NewTypedRateLimitingQueue[string](workqueue.NewTypedMaxOfRateLimiter[string]()),
	}
}

func (f *basicReconciler) Poll(ctx context.Context) error {
	f.pollCount.Add(1)
	// Enqueue a test key so Reconcile gets called
	f.queue.Add("test-key")
	return nil
}

func (f *basicReconciler) Reconcile(ctx context.Context, req string) (reconcile.Result, error) {
	f.reconcileCount.Add(1)
	return reconcile.Result{}, nil
}

func (f *basicReconciler) GetPollInterval() func() time.Duration {
	return func() time.Duration { return 100 * time.Millisecond }
}

func (f *basicReconciler) GetPublisher() (string, websocket.Publisher) {
	return name, &FakePublisher{}
}

func (f *basicReconciler) Queue() workqueue.TypedRateLimitingInterface[string] {
	return f.queue
}

func (f *basicReconciler) Restart() {}
func (f *basicReconciler) Shutdown() {
	f.queue.ShutDown()
}

func TestManagerRunsController(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 300*time.Millisecond)
	defer cancel()

	// Create manager
	mgr, err := controller.NewControllerManager(controller.WithSocket(&FakeSocket{}),
		controller.WithMaxConcurrentReconciles(1))
	assert.NoError(t, err)

	// Add fake reconciler
	reconciler := newBasicReconciler()
	mgr.AddController(&controller.Controller{
		Name: name,
		Do:   reconciler,
	})

	// Start manager
	err = mgr.Start(ctx)
	assert.NoError(t, err)

	// Allow some time for polling/reconciliation
	<-ctx.Done()

	assert.True(t, reconciler.pollCount.Load() > 0, "expected Poll() to be called at least once")
	assert.True(t, reconciler.reconcileCount.Load() > 0, "expected Reconcile() to be called at least once")
}
