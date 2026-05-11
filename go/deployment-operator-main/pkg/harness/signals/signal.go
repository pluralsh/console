package signals

import (
	"context"
	"time"

	gqlclient "github.com/pluralsh/console/go/client"
	clienterrors "github.com/pluralsh/deployment-operator/internal/errors"
	"k8s.io/klog/v2"

	console "github.com/pluralsh/deployment-operator/pkg/client"
	"github.com/pluralsh/deployment-operator/pkg/harness/environment"
	"github.com/pluralsh/deployment-operator/pkg/harness/errors"
	"github.com/pluralsh/deployment-operator/pkg/log"
)

type consoleSignal struct {
	client console.Client
	id     string
}

func (in *consoleSignal) Listen(cancelFunc context.CancelCauseFunc) {
	klog.V(log.LogLevelDebug).InfoS("starting console signal listener")

	ctx, cancel := context.WithCancel(context.Background())

	const (
		baseInterval = 5 * time.Second
		maxInterval  = 30 * time.Second
		factor       = 2.0
	)

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
		}()

		for {
			select {
			case <-ctx.Done():
				return
			case <-timer.C:
			}

			stackRun, err := in.client.GetStackRunBase(in.id)
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
			if stackRun != nil && stackRun.Status == gqlclient.StackStatusCancelled && !environment.IsDev() {
				cancelFunc(errors.ErrRemoteCancel)
				cancel()
				return
			}

			// Timer already fired (drained via case <-timer.C above); safe to Reset.
			timer.Reset(interval)
		}
	}()
}

func NewConsoleSignal(client console.Client, id string) Signal {
	return &consoleSignal{
		client,
		id,
	}
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
