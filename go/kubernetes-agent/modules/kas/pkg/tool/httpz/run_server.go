package httpz

import (
	"context"
	"net"
	"net/http"
	"sync"
	"time"
)

func RunServer(ctx context.Context, srv *http.Server, listener net.Listener, listenerGracePeriod, shutdownTimeout time.Duration) error {
	var wg sync.WaitGroup
	defer wg.Wait() // wait for goroutine to shutdown active connections
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()
	wg.Add(1)
	go func() {
		defer wg.Done()
		<-ctx.Done()
		time.Sleep(listenerGracePeriod)
		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), shutdownTimeout)
		defer shutdownCancel()
		if srv.Shutdown(shutdownCtx) != nil { // nolint: contextcheck
			srv.Close() // nolint: errcheck,gas,gosec
			// unhandled error above, but we are terminating anyway
		}
	}()

	err := srv.Serve(listener)

	if err != http.ErrServerClosed { // nolint:errorlint
		// Failed to start or dirty shutdown
		return err
	}
	// Clean shutdown
	return nil
}
