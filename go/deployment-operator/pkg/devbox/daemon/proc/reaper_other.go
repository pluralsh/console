//go:build !linux

package proc

import (
	"context"
	"log/slog"
)

// Reap is a no-op off Linux; the daemon only runs as PID 1 inside the Linux sandbox.
func Reap(ctx context.Context, _ *slog.Logger) {
	<-ctx.Done()
}
