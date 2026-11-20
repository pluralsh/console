package events

import (
	"context"
	"sync"
	"time"

	console "github.com/pluralsh/console/go/client"
)

// Status serves the run's status from Console's pushes while the sidecar's websocket is connected,
// and fetches it before the first push, while disconnected, or once resync has passed without a
// push or fetch in case a push was missed.
type Status struct {
	watcher *Watcher
	fetch   func(ctx context.Context) (*console.AgentRunStatusFragment, error)
	resync  time.Duration

	mu          sync.Mutex
	cached      *console.AgentRunStatusFragment
	pushedGen   uint64
	refreshedAt time.Time
}

func NewStatus(watcher *Watcher, resync time.Duration, fetch func(ctx context.Context) (*console.AgentRunStatusFragment, error)) *Status {
	return &Status{watcher: watcher, fetch: fetch, resync: resync}
}

// Subscribe returns a channel kicked whenever Console pushes a new status.
func (in *Status) Subscribe() <-chan struct{} {
	return in.watcher.Subscribe()
}

// PollInterval is how long a loop may wait between checks: the resync period while pushes are
// connected, kicked while the sidecar is configured but its websocket is down, and base without one.
func (in *Status) PollInterval(base, kicked time.Duration) time.Duration {
	switch {
	case in.watcher == nil:
		return base
	case in.watcher.Latest().Connected:
		return in.resync
	default:
		return kicked
	}
}

func (in *Status) Get(ctx context.Context) (*console.AgentRunStatusFragment, error) {
	update := in.watcher.Latest()

	in.mu.Lock()
	if update.Run != nil && update.Generation != in.pushedGen {
		in.cached, in.pushedGen, in.refreshedAt = update.Run, update.Generation, time.Now()
	}
	if update.Connected && in.cached != nil && time.Since(in.refreshedAt) < in.resync {
		cached := in.cached
		in.mu.Unlock()
		return cached, nil
	}
	in.mu.Unlock()

	run, err := in.fetch(ctx)
	if err != nil {
		return nil, err
	}

	in.mu.Lock()
	defer in.mu.Unlock()
	in.cached, in.refreshedAt = run, time.Now()
	return run, nil
}
