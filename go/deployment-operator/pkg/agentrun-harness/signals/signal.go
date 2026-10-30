package signals

import (
	"context"
	"time"

	gqlclient "github.com/pluralsh/console/go/client"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/environment"
	console "github.com/pluralsh/console/go/deployment-operator/pkg/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/harness/errors"
	types "github.com/pluralsh/console/go/deployment-operator/pkg/harness/signals"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
)

const (
	resyncPeriod = 5 * time.Second
	// kickedResyncPeriod only covers missed kicks, so it can be much longer.
	kickedResyncPeriod = 30 * time.Second
)

type consoleSignal struct {
	client console.Client
	id     string
	kicks  <-chan struct{}
	dev    bool
}

func (in *consoleSignal) Listen(cancelFunc context.CancelCauseFunc) {
	klog.V(log.LogLevelDebug).InfoS("starting console signal listener")

	period := resyncPeriod
	if in.kicks != nil {
		period = kickedResyncPeriod
	}

	go func() {
		ctx := context.Background()
		timer := time.NewTimer(period)
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
			timer.Reset(period)
		}
	}()
}

func (in *consoleSignal) cancelled(ctx context.Context) bool {
	agentRun, err := in.client.GetAgentRunStatus(ctx, in.id)
	if err != nil {
		klog.ErrorS(err, "could not resync agent run", "id", in.id)
		return false
	}

	klog.V(log.LogLevelDebug).InfoS("resyncing agent run", "status", agentRun.Status, "dev", in.dev)
	// Allow rerunning cancelled runs when in dev mode.
	return agentRun.Status == gqlclient.AgentRunStatusCancelled && !in.dev
}

// NewConsoleSignal polls the run's status for remote cancellation. kicks, when set, triggers an
// immediate check and lets the poll back off, see events.Watcher.
func NewConsoleSignal(client console.Client, id string, kicks <-chan struct{}) types.Signal {
	return &consoleSignal{
		client: client,
		id:     id,
		kicks:  kicks,
		dev:    environment.IsDev(),
	}
}
