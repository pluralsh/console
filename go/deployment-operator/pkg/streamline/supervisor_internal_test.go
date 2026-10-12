package streamline

import (
	"context"
	"errors"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/runtime/schema"

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

	t.Run("does not wait for a resource that failed to load", func(t *testing.T) {
		s := NewSupervisor(nil, nil, StatusSynchronizer{}, nil, nil)
		s.synchronizers.Set(podsGVR, &fakeSynchronizer{})
		s.failedStarts.Set(podsGVR, struct{}{})

		require.NoError(t, s.WaitUntilSynced(t.Context()))
	})

	t.Run("a failed start is recorded by the supervisor", func(t *testing.T) {
		s := NewSupervisor(nil, nil, StatusSynchronizer{}, failingDiscovery{}, nil)
		s.synchronizers.Set(podsGVR, &fakeSynchronizer{err: errors.New("forbidden")})

		s.startSynchronizer(t.Context(), podsGVR)

		assert.True(t, s.failedStarts.Has(podsGVR))
	})

	t.Run("returns when the context is done", func(t *testing.T) {
		s := NewSupervisor(nil, nil, StatusSynchronizer{}, nil, nil)
		s.synchronizers.Set(podsGVR, &fakeSynchronizer{})
		ctx, cancel := context.WithCancel(t.Context())
		cancel()

		require.ErrorIs(t, s.WaitUntilSynced(ctx), context.Canceled)
	})
}
