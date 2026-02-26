package cmd

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/spf13/cobra"
)

func Run(command *cobra.Command) {
	command.Version = fmt.Sprintf("%s, commit: %s, built: %s", Version, Commit, BuildTime)
	err := run(command)
	if err != nil {
		_, _ = fmt.Fprintf(os.Stderr, "Program aborted: %v\n", err)
		os.Exit(1)
	}
}

func run(command *cobra.Command) error {
	ctx, cancelFunc := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancelFunc()

	return command.ExecuteContext(ctx)
}
