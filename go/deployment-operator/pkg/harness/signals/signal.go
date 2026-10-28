package signals

import (
	"context"
	"time"

	gqlclient "github.com/pluralsh/console/go/client"
	clienterrors "github.com/pluralsh/console/go/deployment-operator/internal/errors"
	"k8s.io/klog/v2"

	console "github.com/pluralsh/console/go/deployment-operator/pkg/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/harness/environment"
	"github.com/pluralsh/console/go/deployment-operator/pkg/harness/errors"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
	"github.com/pluralsh/console/go/deployment-operator/pkg/websocket"
)

// stackRunNotification is the deployAgentNotification resource console publishes on stack run updates.
const stackRunNotification = "stack_run"

type consoleSignal struct {
	client console.Client
	id     string
	socket websocket.Socket
	pushed chan struct{}
	dev    bool
}

// Publish implements websocket.Publisher. Notifications only carry the run id, so a
// matching one triggers an immediate status check rather than cancelling outright.
func (in *consoleSignal) Publish(id string, _ bool) {
	if id != in.id {
		return
	}

	select {
	case in.pushed <- struct{}{}:
	default:
	}
}

func (in *consoleSignal) Listen(cancelFunc context.CancelCauseFunc) {
	klog.V(log.LogLevelDebug).InfoS("starting console signal listener", "websocket", in.socket != nil)

	ctx, cancel := context.WithCancel(context.Background())

	const (
		maxInterval = 30 * time.Second
		factor      = 2.0
	)

	// Pushed notifications cover cancellation promptly, so polling is only a fallback
	// for missed events when the socket is up.
	baseInterval := 5 * time.Second
	if in.socket != nil {
		baseInterval = maxInterval
	}

	go func() {
		interval := baseInterval
		timer := time.NewTimer(interval)
		defer func() {
			// Stop the timer and drain its channel to avoid goroutine/memory leaks.
			if !timer.Stop() {
				select {
				case <-timer.C:
				default:
				}
			}
			if in.socket != nil {
				_ = in.socket.Close()
			}
		}()

		for {
			select {
			case <-ctx.Done():
				return
			case <-timer.C:
				if in.socket != nil {
					// No-op while connected; recreates the client after a dropped connection.
					if err := in.socket.Join(); err != nil {
						klog.V(log.LogLevelDebug).InfoS("could not rejoin console websocket", "error", err)
					}
				}
			case <-in.pushed:
				if !timer.Stop() {
					select {
					case <-timer.C:
					default:
					}
				}
			}

			stackRun, err := in.client.GetStackRunStatus(in.id)
			if err != nil {
				// Back off on error, reset to base on next success.
				interval = min(time.Duration(float64(interval)*factor), maxInterval)

				if clienterrors.IsUnauthenticated(err) {
					wrapped := errors.WrapUnauthenticated("could not resync stack run", err)
					klog.ErrorS(wrapped, "console authentication failed", "id", in.id)
					cancelFunc(wrapped)
					cancel()
					return
				}

				klog.ErrorS(err, "could not resync stack run", "id", in.id)
				// Timer already fired (drained via case <-timer.C above); safe to Reset.
				timer.Reset(interval)
				continue
			}

			// Successful API call, reset the interval.
			interval = baseInterval

			// Allow rerunning cancelled runs when in dev mode.
			if stackRun != nil && stackRun.Status == gqlclient.StackStatusCancelled && !in.dev {
				cancelFunc(errors.ErrRemoteCancel)
				cancel()
				return
			}

			// Timer already fired (drained via case <-timer.C above); safe to Reset.
			timer.Reset(interval)
		}
	}()
}

// NewConsoleSignal watches the console for cancellation of the given stack run. When socket is
// non-nil the signal subscribes to stack run notifications on it and polls far less often.
func NewConsoleSignal(client console.Client, id string, socket websocket.Socket) Signal {
	signal := &consoleSignal{
		client: client,
		id:     id,
		socket: socket,
		pushed: make(chan struct{}, 1),
		dev:    environment.IsDev(),
	}

	if socket != nil {
		socket.AddPublisher(stackRunNotification, signal)
	}

	return signal
}

type timeoutSignal struct {
	timeout time.Duration
}

func (in *timeoutSignal) Listen(cancelFunc context.CancelCauseFunc) {
	klog.V(log.LogLevelDebug).InfoS("starting timeout signal listener")
	timer := time.NewTimer(in.timeout)

	go func() {
		<-timer.C
		cancelFunc(errors.ErrTimeout)
	}()
}

func NewTimeoutSignal(timeout time.Duration) Signal {
	return &timeoutSignal{
		timeout,
	}
}
