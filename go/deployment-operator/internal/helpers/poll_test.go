package helpers_test

import (
	"context"
	"errors"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"

	"github.com/pluralsh/deployment-operator/internal/helpers"
)

func TestBackgroundPollUntilContextCancel_DynamicInterval(t *testing.T) {
	var mu sync.Mutex
	interval := 50 * time.Millisecond // initial interval

	getInterval := func() time.Duration {
		mu.Lock()
		defer mu.Unlock()
		return interval
	}

	setInterval := func(newInterval time.Duration) {
		mu.Lock()
		defer mu.Unlock()
		interval = newInterval
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	callCount := 0
	condition := func(ctx context.Context) (bool, error) {
		mu.Lock()
		callCount++
		mu.Unlock()
		return false, nil
	}

	err := helpers.DynamicBackgroundPollUntilContextCancel(ctx, getInterval, false, condition)
	if err != nil {
		t.Fatalf("syncFirstRun failed: %v", err)
	}

	// Dynamically change the interval
	setInterval(time.Second)

	// Wait for context cancel
	time.Sleep(1 * time.Second)

	mu.Lock()
	finalCallCount := callCount
	mu.Unlock()

	assert.True(t, finalCallCount < 4, "expected multiple calls to condition, got %d", finalCallCount)
}

func TestPollUntilContextCancel_TimerInactiveWhenIntervalZero(t *testing.T) {
	var callCount int32

	// Condition should never be called if interval == 0
	condition := func(ctx context.Context) (bool, error) {
		atomic.AddInt32(&callCount, 1)
		return false, nil
	}

	// Interval function returns 0, meaning the timer should never tick
	getInterval := func() time.Duration {
		return 0
	}

	// Use a short-lived context to avoid waiting forever
	ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
	defer cancel()

	err := helpers.DynamicPollUntilContextCancel(ctx, getInterval, condition)
	if err != nil && !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("unexpected error: %v", err)
	}

	// Wait a bit more to ensure no background ticking
	time.Sleep(100 * time.Millisecond)

	if count := atomic.LoadInt32(&callCount); count != 0 {
		t.Errorf("expected condition not to be called, but was called %d times", count)
	}
}

func TestResumeFromInactiveToActive(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	var called int32
	interval := int64(0) // start inactive

	intervalFunc := func() time.Duration {
		return time.Duration(atomic.LoadInt64(&interval))
	}
	callback := func(ctx context.Context) (bool, error) {
		atomic.AddInt32(&called, 1)
		if atomic.LoadInt32(&called) >= 2 {
			return true, nil // stop after 2 active calls
		}
		return false, nil
	}

	// flip interval to active after a short delay
	go func() {
		time.Sleep(150 * time.Millisecond)
		atomic.StoreInt64(&interval, int64(50*time.Millisecond))
	}()

	err := helpers.DynamicPollUntilContextCancel(ctx, intervalFunc, callback)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	got := atomic.LoadInt32(&called)
	if got < 2 {
		t.Errorf("expected callback to resume and be called at least twice, got %d", got)
	}
}

func TestContextCancelInactivePoller(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	interval := int64(0) // start inactive

	intervalFunc := func() time.Duration {
		return time.Duration(atomic.LoadInt64(&interval))
	}
	callback := func(ctx context.Context) (bool, error) {
		return false, nil
	}

	err := helpers.DynamicPollUntilContextCancel(ctx, intervalFunc, callback)
	assert.NotNil(t, err)
}

func TestDynamicPollUntilContextCancel_PanicRecovery(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	intervalFunc := func() time.Duration { return 50 * time.Millisecond }

	calls := 0
	err := helpers.DynamicPollUntilContextCancel(ctx, intervalFunc, func(ctx context.Context) (bool, error) {
		calls++
		if calls == 1 {
			panic("simulated panic")
		}
		// after panic, poller should keep running and eventually return done
		return true, nil
	})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if calls < 2 {
		t.Errorf("expected at least 2 calls (one panic, one recovery), got %d", calls)
	}
}
