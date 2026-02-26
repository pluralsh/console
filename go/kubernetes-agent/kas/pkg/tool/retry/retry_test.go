package retry

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"k8s.io/utils/clock"
)

type fakeBackoff struct{}

func (b *fakeBackoff) Backoff() clock.Timer {
	return clock.RealClock{}.NewTimer(0)
}

func TestRetry_PollWithBackoff_Poke(t *testing.T) {
	// GIVEN
	cfg := NewPollConfigFactory(1*time.Hour, func() BackoffManager { return &fakeBackoff{} })()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	isInitCall := true

	// WHEN
	// immediately poke (the poke can happen before the actual polling has been started
	go func() {
		cfg.Poke()
	}()
	err := PollWithBackoff(ctx, cfg, func(ctx context.Context) (error, AttemptResult) {
		if isInitCall {
			// PollWithBackoff does an initial call, so to test if a poke interrupts
			// the interval correctly, we have to adhere for that initial call.
			isInitCall = false
			return ctx.Err(), Continue
		}
		return ctx.Err(), Done
	})

	// THEN
	require.NoError(t, err)
}
