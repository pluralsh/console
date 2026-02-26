package redistool

import (
	"context"
	"errors"

	"github.com/redis/rueidis"
)

var (
	errAttemptsExceeded = errors.New("failed to execute Redis transaction too many times")
)

// Optimistic locking pattern.
// See https://redis.io/docs/interact/transactions/
// See https://github.com/redis/rueidis#cas-pattern
// Returns errAttemptsExceeded if maxAttempts attempts ware made but all failed.
func transaction(ctx context.Context, maxAttempts int, c rueidis.DedicatedClient, cb func(context.Context) ([]rueidis.Completed, error), keys ...string) (retErr error) {
	execCalled := false
	defer func() {
		if execCalled {
			return
		}
		// x. UNWATCH if there was an error or nothing to delete.
		err := c.Do(ctx, c.B().Unwatch().Build()).Error()
		if retErr == nil {
			retErr = err
		}
	}()
	for i := 0; i < maxAttempts; i++ {
		// 1. WATCH
		execCalled = false // Enable deferred cleanup (for retries)
		err := c.Do(ctx, c.B().Watch().Key(keys...).Build()).Error()
		if err != nil {
			return err
		}
		// 2. READ
		cmds, err := cb(ctx)
		if err != nil {
			return err
		}
		if len(cmds) == 0 {
			return nil
		}
		// 3. Mutation via MULTI+EXEC
		multiExec := make([]rueidis.Completed, 0, len(cmds)+2)
		multiExec = append(multiExec, c.B().Multi().Build())
		multiExec = append(multiExec, cmds...)
		multiExec = append(multiExec, c.B().Exec().Build())
		resp := c.DoMulti(ctx, multiExec...)
		execCalled = true                       // Disable deferred UNWATCH as Redis UNWATCHes all keys on EXEC.
		errs := MultiErrors(resp[:len(resp)-1]) // all but the last one, which is EXEC
		if len(errs) > 0 {                      // Something is wrong with commands or I/O, abort
			return errors.Join(errs...)
		}
		// EXEC error
		switch err := resp[len(resp)-1].Error(); { // nolint: errorlint
		case err == nil: // Success!
			return nil
		case errors.Is(err, rueidis.Nil): // EXEC detected a conflict, retry.
		default: // EXEC failed in a bad way, abort
			return err
		}
	}
	return errAttemptsExceeded
}
