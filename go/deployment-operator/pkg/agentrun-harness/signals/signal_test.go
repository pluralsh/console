package signals_test

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strconv"
	"sync"
	"testing"
	"time"

	gqlclient "github.com/pluralsh/console/go/client"
	"github.com/stretchr/testify/require"

	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/environment"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/events"
	agentsignals "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/signals"
	harnesserrors "github.com/pluralsh/console/go/deployment-operator/pkg/harness/errors"
	"github.com/pluralsh/console/go/deployment-operator/pkg/harness/signals"
)

// fakeSidecar serves events.Update long-polls the way the mcpserver sidecar does.
type fakeSidecar struct {
	mu      sync.Mutex
	update  events.Update
	changed chan struct{}
}

func newFakeSidecar(t *testing.T) (*fakeSidecar, string) {
	sidecar := &fakeSidecar{update: events.Update{Connected: true}, changed: make(chan struct{})}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		since, _ := strconv.ParseUint(r.URL.Query().Get("since"), 10, 64)
		connected := r.URL.Query().Get("connected") == "true"
		sidecar.mu.Lock()
		update, changed := sidecar.update, sidecar.changed
		sidecar.mu.Unlock()
		if update.Generation == since && update.Connected == connected {
			select {
			case <-changed:
			case <-r.Context().Done():
				return
			}
			sidecar.mu.Lock()
			update = sidecar.update
			sidecar.mu.Unlock()
		}
		_ = json.NewEncoder(w).Encode(update)
	}))
	t.Cleanup(server.Close)
	return sidecar, server.URL
}

func (in *fakeSidecar) push(run *gqlclient.AgentRunStatusFragment) {
	in.mu.Lock()
	defer in.mu.Unlock()
	in.update.Generation++
	in.update.Run = run
	close(in.changed)
	in.changed = make(chan struct{})
}

func useReleaseVersion(t *testing.T) {
	// Dev builds deliberately ignore remote cancellation.
	version := environment.Version
	environment.Version = "test"
	t.Cleanup(func() { environment.Version = version })
}

func startWatcher(t *testing.T, url string) *events.Watcher {
	watcher := events.NewWatcher(url)
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	go watcher.Run(ctx)
	require.Eventually(t, func() bool { return watcher.Latest().Connected }, 5*time.Second, 10*time.Millisecond)
	return watcher
}

func TestConsoleSignalCancelsOnPushedStatusWithoutFetching(t *testing.T) {
	useReleaseVersion(t)
	sidecar, url := newFakeSidecar(t)
	watcher := startWatcher(t, url)
	status := events.NewStatus(watcher, time.Hour, func(context.Context) (*gqlclient.AgentRunStatusFragment, error) {
		t.Error("a pushed status must not be fetched again")
		return nil, errors.New("unexpected fetch")
	})

	ctx := signals.NewCancelableContext(context.Background(), agentsignals.NewConsoleSignal(status, "run-id"))
	sidecar.push(&gqlclient.AgentRunStatusFragment{ID: "run-id", Status: gqlclient.AgentRunStatusCancelled})

	select {
	case <-ctx.Done():
		require.True(t, errors.Is(context.Cause(ctx), harnesserrors.ErrRemoteCancel))
	case <-time.After(5 * time.Second):
		t.Fatal("expected the pushed status to cancel the run before the fallback poll")
	}
}

func TestConsoleSignalFetchesOnlyUntilStatusIsKnown(t *testing.T) {
	useReleaseVersion(t)
	sidecar, url := newFakeSidecar(t)
	watcher := startWatcher(t, url)

	var mu sync.Mutex
	fetches := 0
	status := events.NewStatus(watcher, time.Hour, func(context.Context) (*gqlclient.AgentRunStatusFragment, error) {
		mu.Lock()
		defer mu.Unlock()
		fetches++
		return &gqlclient.AgentRunStatusFragment{ID: "run-id", Status: gqlclient.AgentRunStatusRunning}, nil
	})

	ctx := signals.NewCancelableContext(context.Background(), agentsignals.NewConsoleSignal(status, "run-id"))
	// A push without a payload, e.g. from a sidecar that just restarted, still kicks a check.
	sidecar.push(nil)
	require.Eventually(t, func() bool {
		mu.Lock()
		defer mu.Unlock()
		return fetches == 1
	}, 5*time.Second, 10*time.Millisecond)

	for range 3 {
		sidecar.push(&gqlclient.AgentRunStatusFragment{ID: "run-id", Status: gqlclient.AgentRunStatusRunning})
		time.Sleep(20 * time.Millisecond)
	}

	mu.Lock()
	defer mu.Unlock()
	require.Equal(t, 1, fetches)
	require.NoError(t, ctx.Err())
}
