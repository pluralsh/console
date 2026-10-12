package streamline

import (
	"context"
	"errors"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/util/workqueue"

	discoverycache "github.com/pluralsh/console/go/deployment-operator/pkg/cache/discovery"
)

type fakeSynchronizer struct {
	started atomic.Bool
	err     error
}

func (f *fakeSynchronizer) Start(context.Context) error { return f.err }
func (f *fakeSynchronizer) Stop()                       {}
func (f *fakeSynchronizer) Started() bool               { return f.started.Load() }

// failingDiscovery makes startSynchronizer give up right after a failed start instead of re-registering.
type failingDiscovery struct{ discoverycache.Cache }

func (failingDiscovery) KindFor(schema.GroupVersionResource) (schema.GroupVersionKind, error) {
	return schema.GroupVersionKind{}, errors.New("unknown resource")
}

// knownDiscovery makes startSynchronizer restart the synchronizer after a failed start.
type knownDiscovery struct{ discoverycache.Cache }

func (knownDiscovery) KindFor(gvr schema.GroupVersionResource) (schema.GroupVersionKind, error) {
	return schema.GroupVersionKind{Version: gvr.Version, Kind: "Pod"}, nil
}

var (
	podsGVR       = schema.GroupVersionResource{Version: "v1", Resource: "pods"}
	deploymentGVR = schema.GroupVersionResource{Group: "apps", Version: "v1", Resource: "deployments"}
)

func TestSupervisorWaitUntilSynced(t *testing.T) {
	t.Run("returns once every synchronizer has started", func(t *testing.T) {
		s := NewSupervisor(nil, nil, StatusSynchronizer{}, nil, nil)
		pods, deployments := &fakeSynchronizer{}, &fakeSynchronizer{}
		s.synchronizers.Set(podsGVR, pods)
		s.synchronizers.Set(deploymentGVR, deployments)

		done := make(chan error, 1)
		go func() { done <- s.WaitUntilSynced(t.Context()) }()

		pods.started.Store(true)
		select {
		case <-done:
			t.Fatal("returned while a synchronizer was still loading")
		case <-time.After(1500 * time.Millisecond):
		}

		deployments.started.Store(true)
		select {
		case err := <-done:
			require.NoError(t, err)
		case <-time.After(5 * time.Second):
			t.Fatal("did not return after all synchronizers started")
		}
	})

	t.Run("waits for a resource that is still being retried", func(t *testing.T) {
		s := NewSupervisor(nil, nil, StatusSynchronizer{}, nil, nil,
			WithRestartDelay(10*time.Millisecond), WithMaxRestartBackoff(40*time.Millisecond))
		s.synchronizers.Set(podsGVR, &fakeSynchronizer{})
		s.registerQueue.AddRateLimited(podsGVR)

		assert.False(t, s.synced())
	})

	t.Run("does not wait for a resource that keeps failing", func(t *testing.T) {
		s := NewSupervisor(nil, nil, StatusSynchronizer{}, nil, nil,
			WithRestartDelay(10*time.Millisecond), WithMaxRestartBackoff(40*time.Millisecond))
		s.synchronizers.Set(podsGVR, &fakeSynchronizer{})
		s.registerQueue.AddRateLimited(podsGVR)
		s.registerQueue.AddRateLimited(podsGVR)

		require.NoError(t, s.WaitUntilSynced(t.Context()))
	})

	t.Run("a failed start is retried with a growing delay", func(t *testing.T) {
		s := NewSupervisor(nil, nil, StatusSynchronizer{}, knownDiscovery{}, nil,
			WithRestartDelay(time.Hour), WithRestartJitter(0))
		s.synchronizers.Set(podsGVR, &fakeSynchronizer{err: errors.New("forbidden")})

		s.startSynchronizer(t.Context(), podsGVR)
		assert.Equal(t, 1, s.registerQueue.NumRequeues(podsGVR))
		assert.True(t, s.synchronizers.Has(podsGVR), "the resource is registered again")

		s.synchronizers.Set(podsGVR, &fakeSynchronizer{err: errors.New("forbidden")})
		s.startSynchronizer(t.Context(), podsGVR)
		assert.Equal(t, 2, s.registerQueue.NumRequeues(podsGVR))
	})

	t.Run("a started synchronizer resets the failures", func(t *testing.T) {
		s := NewSupervisor(nil, nil, StatusSynchronizer{}, knownDiscovery{}, nil, WithRestartDelay(time.Hour))
		s.registerQueue.AddRateLimited(podsGVR)
		started := &fakeSynchronizer{err: errors.New("watch closed")}
		started.started.Store(true)
		s.synchronizers.Set(podsGVR, started)

		s.startSynchronizer(t.Context(), podsGVR)

		assert.Equal(t, 1, s.registerQueue.NumRequeues(podsGVR), "only the restart after the closed watch is counted")
	})

	t.Run("is broken only once the next restart waits for the cap", func(t *testing.T) {
		s := NewSupervisor(nil, nil, StatusSynchronizer{}, nil, nil,
			WithRestartDelay(10*time.Millisecond), WithMaxRestartBackoff(40*time.Millisecond))
		s.registerQueue.AddRateLimited(podsGVR)
		assert.False(t, s.broken(podsGVR), "the next restart waits 20ms")

		s.registerQueue.AddRateLimited(podsGVR)
		assert.True(t, s.broken(podsGVR), "the next restart waits 40ms")
	})

	t.Run("a resource that is not found is retried until its attempts are used", func(t *testing.T) {
		s := NewSupervisor(nil, nil, StatusSynchronizer{}, knownDiscovery{}, nil,
			WithRestartDelay(time.Hour), WithRestartJitter(0), WithMaxNotFoundRetries(2))
		notFound := apierrors.NewNotFound(schema.GroupResource{Resource: "pods"}, "pods")

		s.synchronizers.Set(podsGVR, &fakeSynchronizer{err: notFound})
		s.startSynchronizer(t.Context(), podsGVR)
		assert.Equal(t, 1, s.registerQueue.NumRequeues(podsGVR))
		assert.True(t, s.synchronizers.Has(podsGVR), "it is waiting for its restart")

		s.synchronizers.Set(podsGVR, &fakeSynchronizer{err: notFound})
		s.startSynchronizer(t.Context(), podsGVR)
		assert.Zero(t, s.registerQueue.NumRequeues(podsGVR))
		assert.False(t, s.synchronizers.Has(podsGVR), "it was given up on")
	})

	t.Run("a resource that is given up on is forgotten", func(t *testing.T) {
		s := NewSupervisor(nil, nil, StatusSynchronizer{}, failingDiscovery{}, nil, WithRestartDelay(time.Hour))
		s.registerQueue.AddRateLimited(podsGVR)
		s.synchronizers.Set(podsGVR, &fakeSynchronizer{err: errors.New("forbidden")})

		s.startSynchronizer(t.Context(), podsGVR)

		assert.Zero(t, s.registerQueue.NumRequeues(podsGVR))
		assert.False(t, s.synchronizers.Has(podsGVR))
	})

	t.Run("returns when the context is done", func(t *testing.T) {
		s := NewSupervisor(nil, nil, StatusSynchronizer{}, nil, nil)
		s.synchronizers.Set(podsGVR, &fakeSynchronizer{})
		ctx, cancel := context.WithCancel(t.Context())
		cancel()

		require.ErrorIs(t, s.WaitUntilSynced(ctx), context.Canceled)
	})
}

func TestJitteredRateLimiter(t *testing.T) {
	inner := workqueue.NewTypedItemExponentialFailureRateLimiter[schema.GroupVersionResource](time.Second, time.Minute)

	t.Run("spreads a delay by at most the jitter", func(t *testing.T) {
		limiter := jitteredRateLimiter{TypedRateLimiter: inner, jitter: 10 * time.Second}
		for range 50 {
			inner.Forget(podsGVR)
			for range 5 {
				inner.When(podsGVR) // 1s, 2s, 4s, 8s, 16s
			}
			delay := limiter.When(podsGVR) // 32s
			assert.GreaterOrEqual(t, delay, 32*time.Second)
			assert.Less(t, delay, 42*time.Second)
		}
	})

	t.Run("never spreads more than the delay itself", func(t *testing.T) {
		limiter := jitteredRateLimiter{TypedRateLimiter: inner, jitter: 10 * time.Second}
		inner.Forget(podsGVR)

		delay := limiter.When(podsGVR) // 1s
		assert.GreaterOrEqual(t, delay, time.Second)
		assert.Less(t, delay, 2*time.Second)
	})

	t.Run("leaves the delay alone without jitter", func(t *testing.T) {
		limiter := jitteredRateLimiter{TypedRateLimiter: inner}
		inner.Forget(podsGVR)

		assert.Equal(t, time.Second, limiter.When(podsGVR))
	})
}
