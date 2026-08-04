package test

import (
	"context"
	"sync/atomic"
	"testing"
	"time"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
	"github.com/pluralsh/console/go/deployment-operator/pkg/controller"
	"github.com/pluralsh/console/go/deployment-operator/pkg/websocket"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/client-go/util/workqueue"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

// slowStartReconciler uses a large poll interval so jitter-based initial delay is observable.
type slowStartReconciler struct {
	pollCount atomic.Int32
	queue     workqueue.TypedRateLimitingInterface[string]
}

func newSlowStartReconciler() *slowStartReconciler {
	return &slowStartReconciler{
		queue: workqueue.NewTypedRateLimitingQueue[string](workqueue.NewTypedMaxOfRateLimiter[string]()),
	}
}

func (r *slowStartReconciler) Poll(_ context.Context) error {
	r.pollCount.Add(1)
	return nil
}

func (r *slowStartReconciler) Reconcile(_ context.Context, _ string) (reconcile.Result, error) {
	return reconcile.Result{}, nil
}

// GetPollInterval returns 10s so the jittered initial delay is drawn from [0, 10s).
// A 100ms observation window has only ~1% chance of catching a near-zero jitter.
func (r *slowStartReconciler) GetPollInterval() func() time.Duration {
	return func() time.Duration { return 10 * time.Second }
}

func (r *slowStartReconciler) GetPublisher() (string, websocket.Publisher) {
	return name, &FakePublisher{}
}

func (r *slowStartReconciler) Queue() workqueue.TypedRateLimitingInterface[string] { return r.queue }
func (r *slowStartReconciler) Restart()                                             {}
func (r *slowStartReconciler) Shutdown()                                            { r.queue.ShutDown() }

func resetPollImmediatelyConfig() {
	_ = common.GetConfigurationManager().SetDefaults(v1alpha1.AgentConfigurationSpec{})
}

// TestManagerDoesNotPollImmediatelyWhenDisabled verifies that when pollImmediately=false
// the controller does not execute its first poll before the jittered initial delay elapses.
func TestManagerDoesNotPollImmediatelyWhenDisabled(t *testing.T) {
	t.Cleanup(resetPollImmediatelyConfig)
	resetPollImmediatelyConfig()

	pollImmediately := false
	require.NoError(t, common.GetConfigurationManager().SetDefaults(v1alpha1.AgentConfigurationSpec{
		PollImmediately: &pollImmediately,
	}))

	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	reconciler := newSlowStartReconciler()
	mgr, err := controller.NewControllerManager(
		controller.WithSocket(&FakeSocket{}),
		controller.WithMaxConcurrentReconciles(1),
	)
	require.NoError(t, err)

	mgr.AddController(&controller.Controller{
		Name: name,
		Do:   reconciler,
	})

	require.NoError(t, mgr.Start(ctx))
	<-ctx.Done()

	assert.Equal(t, int32(0), reconciler.pollCount.Load(), "expected no polls during initial jitter delay")
}
