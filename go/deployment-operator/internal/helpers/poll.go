package helpers

import (
	"context"
	"math/rand"
	"time"

	"k8s.io/klog/v2"

	"k8s.io/apimachinery/pkg/util/wait"
)

// DynamicBackgroundPollUntilContextCancel spawns a new goroutine that runs the condition function on interval.
// If syncFirstRun is set to true, it will execute the condition function synchronously first and then start
// polling. Since error is returned synchronously, the only way to check for it is to use syncFirstRun.
// Background poller does not sync errors. It can be stopped externally by cancelling the provided context.
func DynamicBackgroundPollUntilContextCancel(ctx context.Context, getInterval func() time.Duration, syncFirstRun bool, callback wait.ConditionWithContextFunc) (err error) {
	if syncFirstRun {
		_, err = callback(ctx)
	}

	go func() {
		_ = DynamicPollUntilContextCancel(ctx, getInterval, callback)
	}()

	return err
}

func DynamicPollUntilContextCancel(
	ctx context.Context,
	intervalFunc func() time.Duration,
	callback wait.ConditionWithContextFunc,
) error {
	immediate := true

	for {
		interval := intervalFunc()

		// Handle inactive state (interval == 0) and wait 1sec
		if interval <= 0 {
			_ = wait.PollUntilContextCancel(ctx, time.Second, false, func(ctx context.Context) (bool, error) {
				return true, nil
			})
			if ctx.Err() != nil {
				return ctx.Err()
			}
			continue
		}

		asInt := int64(interval)
		jitter := time.Duration(rand.Int63n(asInt) - asInt/2)

		var callbackErr error
		var callbackDone bool

		_ = wait.PollUntilContextCancel(ctx, interval+jitter, immediate, func(ctx context.Context) (bool, error) {
			defer func() {
				if r := recover(); r != nil {
					// recover panic, mark callback as not done, no error
					klog.Errorf("DynamicPollUntilContextCancel: recovered panic in callback: %v", r)
					callbackDone, callbackErr = false, nil
				}
			}()
			callbackDone, callbackErr = callback(ctx)
			return true, nil
		})
		immediate = false

		// check results of callback
		if ctx.Err() != nil {
			return ctx.Err()
		}
		if callbackErr != nil {
			return callbackErr
		}
		if callbackDone {
			return nil
		}
	}
}
