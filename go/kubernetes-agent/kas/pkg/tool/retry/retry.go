package retry

import (
	"context"
	"fmt"
	"time"

	"k8s.io/apimachinery/pkg/util/wait"
	"k8s.io/utils/clock"
)

type AttemptResult int

const (
	// Continue means there was no error and polling can continue normally.
	Continue AttemptResult = iota
	// ContinueImmediately means there was no error and polling can continue normally.
	ContinueImmediately
	// Backoff means there was a retriable error, so the caller should try later.
	Backoff
	// Done means the polling should stop. There may or may not have been an error.
	Done
)

type BackoffManager = wait.BackoffManager
type BackoffManagerFactory func() BackoffManager

// PollWithBackoffFunc is a function that is called to perform polling.
// Signature is unusual because AttemptResult must be checked, not the error.
type PollWithBackoffFunc func() (error, AttemptResult)

// PollWithBackoffCtxFunc is a function that is called to perform polling.
// Signature is unusual because AttemptResult must be checked, not the error.
type PollWithBackoffCtxFunc func(ctx context.Context) (error, AttemptResult)

type PollConfig struct {
	Backoff  BackoffManager
	Interval time.Duration
	Sliding  bool
	pokeC    chan struct{}
}

func (c *PollConfig) Poke() {
	select {
	case c.pokeC <- struct{}{}:
	default:
	}
}

type PollConfigFactory func() PollConfig

// PollWithBackoff runs f every duration given by BackoffManager.
//
// If sliding is true, the period is computed after f runs. If it is false then
// period includes the runtime for f.
// It returns when:
// - context signals done. Context error is returned in this case.
// - f returns Done
func PollWithBackoff(ctx context.Context, cfg PollConfig, f PollWithBackoffCtxFunc) error {
	var t clock.Timer
	defer func() {
		if t != nil && !t.Stop() {
			<-t.C()
		}
	}()

	done := ctx.Done()
	for {
		if !cfg.Sliding {
			t = cfg.Backoff.Backoff()
		}

	attempt:
		for {
			select {
			case <-done:
				return ctx.Err()
			default:
			}
			err, result := f(ctx)
			switch result {
			case Continue: // sleep and continue
				timer := time.NewTimer(cfg.Interval)
				select {
				case <-done:
					timer.Stop()
					return ctx.Err()
				case <-cfg.pokeC:
					timer.Stop()
				case <-timer.C:
				}
			case ContinueImmediately: // immediately call f again
				continue
			case Backoff: // do an outer loop to backoff
				break attempt
			case Done: // f is done. A success or a terminal failure.
				return err
			default:
				panic(fmt.Errorf("unexpected poll attempt result: %v", result))
			}
		}

		if cfg.Sliding {
			t = cfg.Backoff.Backoff()
		}

		// NOTE: b/c there is no priority selection in golang
		// it is possible for this to race, meaning we could
		// trigger t.C and stopCh, and t.C select falls through.
		// In order to mitigate we re-check stopCh at the beginning
		// of every loop to prevent extra executions of f().
		select {
		case <-done:
			return ctx.Err()
		case <-cfg.pokeC:
			if !t.Stop() {
				<-t.C()
			}
			t = nil
		case <-t.C():
			t = nil
		}
	}
}

func NewExponentialBackoffFactory(initBackoff, maxBackoff, resetDuration time.Duration, backoffFactor, jitter float64) BackoffManagerFactory {
	return func() BackoffManager {
		return wait.NewExponentialBackoffManager(initBackoff, maxBackoff, resetDuration, backoffFactor, jitter, clock.RealClock{}) // nolint:staticcheck
	}
}

func NewPollConfigFactory(interval time.Duration, backoff BackoffManagerFactory) PollConfigFactory {
	return func() PollConfig {
		return PollConfig{
			Backoff:  backoff(),
			Interval: interval,
			Sliding:  true,
			// Size 1 to ensure we preserve the fact that there was a poke.
			// We don't care how many notifications there have been, just care that there was at least one.
			pokeC: make(chan struct{}, 1),
		}
	}
}
