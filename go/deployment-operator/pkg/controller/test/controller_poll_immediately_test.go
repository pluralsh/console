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

func (r *slowStartReconciler) GetPollInterval() func() time.Duration {
	return func() time.Duration { return time.Second }
}

func (r *slowStartReconciler) GetPublisher() (string, websocket.Publisher) {
	return name, &FakePublisher{}
}

func (r *slowStartReconciler) Queue() workqueue.TypedRateLimitingInterface[string] { return r.queue }
func (r *slowStartReconciler) Restart()                                            {}
func (r *slowStartReconciler) Shutdown()                                           { r.queue.ShutDown() }

func resetPollImmediatelyConfig() {
	_ = common.GetConfigurationManager().SetDefaults(v1alpha1.AgentConfigurationSpec{})
}

// TestManagerDoesNotPollImmediatelyWhenDisabled verifies that when pollImmediately=false
// the controller waits for the configured initial delay before the first poll.
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
		// Fixed long delay keeps the assertion deterministic without shared mutable state.
		InitialPollDelay: func(time.Duration) time.Duration { return time.Hour },
	})

	require.NoError(t, mgr.Start(ctx))
	<-ctx.Done()

	assert.Equal(t, int32(0), reconciler.pollCount.Load(), "expected no polls during fixed initial delay")
}

// TestManagerPollsImmediatelyWhenEnabled verifies that when pollImmediately=true
// the controller polls without waiting for the initial delay.
func TestManagerPollsImmediatelyWhenEnabled(t *testing.T) {
	t.Cleanup(resetPollImmediatelyConfig)
	resetPollImmediatelyConfig()

	pollImmediately := true
	require.NoError(t, common.GetConfigurationManager().SetDefaults(v1alpha1.AgentConfigurationSpec{
		PollImmediately: &pollImmediately,
	}))

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
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
		// Would block forever if the delay path were incorrectly taken.
		InitialPollDelay: func(time.Duration) time.Duration { return time.Hour },
	})

	require.NoError(t, mgr.Start(ctx))

	require.Eventually(t, func() bool {
		return reconciler.pollCount.Load() > 0
	}, time.Second, 10*time.Millisecond, "expected an immediate poll when pollImmediately=true")

	cancel()
}
