package test

import (
	"context"
	"sync/atomic"
	"testing"
	"time"

	"github.com/pluralsh/deployment-operator/pkg/controller/service"
	"github.com/pluralsh/deployment-operator/pkg/websocket"

	"github.com/pluralsh/deployment-operator/pkg/controller"
	"github.com/stretchr/testify/assert"
	"k8s.io/client-go/util/workqueue"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

// recoverReconciler is a minimal test reconciler
type supervisorReconciler struct {
	reconcileCount atomic.Int32
	queue          workqueue.TypedRateLimitingInterface[string]
}

func newSupervisorReconciler() *supervisorReconciler {
	return &supervisorReconciler{
		queue: workqueue.NewTypedRateLimitingQueue[string](workqueue.NewTypedMaxOfRateLimiter[string]()),
	}
}

func (f *supervisorReconciler) Poll(ctx context.Context) error {
	// Enqueue a test key so Reconcile gets called
	f.queue.Add("test-key")
	return nil
}

func (f *supervisorReconciler) Reconcile(ctx context.Context, req string) (reconcile.Result, error) {
	f.reconcileCount.Add(1)
	f.queue.Forget(req)
	if f.reconcileCount.Load() == 1 { // enforce restart
		time.Sleep(2 * time.Second)
	}
	return reconcile.Result{}, nil
}

func (f *supervisorReconciler) GetPollInterval() func() time.Duration {
	return func() time.Duration { return 10 * time.Millisecond }
}

func (f *supervisorReconciler) GetPublisher() (string, websocket.Publisher) {
	return "fake", &FakePublisher{}
}

func (f *supervisorReconciler) Queue() workqueue.TypedRateLimitingInterface[string] {
	return f.queue
}

func (f *supervisorReconciler) Restart() {
	f.queue.ShutDown()
	f.queue = workqueue.NewTypedRateLimitingQueue[string](workqueue.NewTypedMaxOfRateLimiter[string]())
}
func (f *supervisorReconciler) Shutdown() {
	f.queue.ShutDown()
}

func TestManagerSupervisor(t *testing.T) {
	// wait 3sec because DeQueueJitter is set to 1sec
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	// Create manager
	mgr, err := controller.NewControllerManager(controller.WithSocket(&FakeSocket{}),
		controller.WithMaxConcurrentReconciles(1),
		controller.WithLivenessCheckInterval(100*time.Millisecond))
	assert.NoError(t, err)

	// Add fake reconciler
	reconciler := newSupervisorReconciler()
	mgr.AddController(&controller.Controller{
		Name: service.Identifier,
		Do:   reconciler,
	})

	// Start manager
	err = mgr.Start(ctx)
	assert.NoError(t, err)

	// Allow some time for polling/reconciliation
	<-ctx.Done()

	assert.True(t, reconciler.reconcileCount.Load() >= 2)
}
