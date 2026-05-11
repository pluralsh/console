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

// recoverReconciler is a minimal test reconciler
type recoverReconciler struct {
	pollCount      atomic.Int32
	reconcileCount atomic.Int32
	queue          workqueue.TypedRateLimitingInterface[string]
}

func newRecoverReconciler() *recoverReconciler {
	return &recoverReconciler{
		queue: workqueue.NewTypedRateLimitingQueue[string](workqueue.NewTypedMaxOfRateLimiter[string]()),
	}
}

func (f *recoverReconciler) Poll(ctx context.Context) error {
	f.pollCount.Add(1)
	// Enqueue a test key so Reconcile gets called
	f.queue.Add("test-key")
	if f.pollCount.Load() == 3 {
		panic("simulated poll panic")
	}
	return nil
}

func (f *recoverReconciler) Reconcile(ctx context.Context, req string) (reconcile.Result, error) {
	f.reconcileCount.Add(1)
	if f.reconcileCount.Load() == 1 {
		panic("simulated reconcile panic")
	}
	return reconcile.Result{}, nil
}

func (f *recoverReconciler) GetPollInterval() func() time.Duration {
	return func() time.Duration { return 50 * time.Millisecond }
}

func (f *recoverReconciler) GetPublisher() (string, websocket.Publisher) {
	return "fake", &FakePublisher{}
}

func (f *recoverReconciler) Queue() workqueue.TypedRateLimitingInterface[string] {
	return f.queue
}

func (f *recoverReconciler) Restart() {}
func (f *recoverReconciler) Shutdown() {
	f.queue.ShutDown()
}

func TestManagerRecover(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	// Create manager
	mgr, err := controller.NewControllerManager(controller.WithSocket(&FakeSocket{}),
		controller.WithMaxConcurrentReconciles(1),
		controller.WithRecoverPanic(true))
	assert.NoError(t, err)

	// Add fake reconciler
	reconciler := newRecoverReconciler()
	mgr.AddController(&controller.Controller{
		Name: name,
		Do:   reconciler,
	})

	// Start manager
	err = mgr.Start(ctx)
	assert.NoError(t, err)

	// Allow some time for polling/reconciliation
	<-ctx.Done()

	assert.True(t, reconciler.pollCount.Load() > 1, "expected Poll() to be called at least once, was %d", reconciler.pollCount.Load())
	assert.True(t, reconciler.reconcileCount.Load() > 1, "expected Reconcile() to be called at least once, was %d", reconciler.reconcileCount.Load())
}
