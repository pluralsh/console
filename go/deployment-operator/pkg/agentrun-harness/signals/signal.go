package signals

import (
	"context"
	"time"

	gqlclient "github.com/pluralsh/console/go/client"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/environment"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/events"
	"github.com/pluralsh/console/go/deployment-operator/pkg/harness/errors"
	types "github.com/pluralsh/console/go/deployment-operator/pkg/harness/signals"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
)

const (
	resyncPeriod = 5 * time.Second
	// kickedResyncPeriod applies while the sidecar is configured but its websocket is down.
	kickedResyncPeriod = 30 * time.Second
)

type consoleSignal struct {
	status *events.Status
	id     string
	kicks  <-chan struct{}
	dev    bool
}

func (in *consoleSignal) Listen(cancelFunc context.CancelCauseFunc) {
	klog.V(log.LogLevelDebug).InfoS("starting console signal listener")

	go func() {
		ctx := context.Background()
		timer := time.NewTimer(in.period())
		defer timer.Stop()

		for {
			select {
			case <-timer.C:
			case <-in.kicks:
				if !timer.Stop() {
					select {
					case <-timer.C:
					default:
					}
				}
			}

			if in.cancelled(ctx) {
				cancelFunc(errors.ErrRemoteCancel)
				return
			}
			timer.Reset(in.period())
		}
	}()
}

func (in *consoleSignal) period() time.Duration {
	return in.status.PollInterval(resyncPeriod, kickedResyncPeriod)
}

func (in *consoleSignal) cancelled(ctx context.Context) bool {
	agentRun, err := in.status.Get(ctx)
	if err != nil {
		klog.ErrorS(err, "could not resync agent run", "id", in.id)
		return false
	}

	klog.V(log.LogLevelDebug).InfoS("resyncing agent run", "status", agentRun.Status, "dev", in.dev)
	// Allow rerunning cancelled runs when in dev mode.
	return agentRun.Status == gqlclient.AgentRunStatusCancelled && !in.dev
}

// NewConsoleSignal watches the run's status for remote cancellation, checking on every push and
// polling only as often as status.PollInterval allows.
func NewConsoleSignal(status *events.Status, id string) types.Signal {
	return &consoleSignal{
		status: status,
		id:     id,
		kicks:  status.Subscribe(),
		dev:    environment.IsDev(),
	}
}
