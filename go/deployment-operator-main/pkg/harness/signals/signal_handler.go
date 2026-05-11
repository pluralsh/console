package signals

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	internalerrors "github.com/pluralsh/deployment-operator/pkg/harness/errors"
)

var (
	onlyOneSignalHandler = make(chan struct{})
	// POSIX only
	shutdownSignals = []os.Signal{os.Interrupt, syscall.SIGTERM}
)

// SetupSignalHandler registers for SIGTERM and SIGINT. A context is returned
// which is canceled on one of these signals. If a second signal is caught, the program
// is terminated with exit code 1.
func SetupSignalHandler(code ExitCode) context.Context {
	close(onlyOneSignalHandler) // panics when called twice

	ctx, cancel := context.WithCancelCause(context.Background())

	c := make(chan os.Signal, 2)
	signal.Notify(c, shutdownSignals...)
	go func() {
		<-c
		cancel(internalerrors.ErrTerminated)
		<-c
		os.Exit(code.Int()) // second signal. Exit directly.
	}()

	return ctx
}
