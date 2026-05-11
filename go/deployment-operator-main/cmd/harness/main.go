package main

import (
	"errors"
	"os"

	"k8s.io/klog/v2"

	"github.com/pluralsh/deployment-operator/cmd/harness/args"
	"github.com/pluralsh/deployment-operator/internal/helpers"
	"github.com/pluralsh/deployment-operator/pkg/client"
	"github.com/pluralsh/deployment-operator/pkg/harness/controller"
	"github.com/pluralsh/deployment-operator/pkg/harness/environment"
	internalerrors "github.com/pluralsh/deployment-operator/pkg/harness/errors"
	"github.com/pluralsh/deployment-operator/pkg/harness/exec"
	"github.com/pluralsh/deployment-operator/pkg/harness/signals"
	"github.com/pluralsh/deployment-operator/pkg/harness/sink"
	"github.com/pluralsh/deployment-operator/pkg/log"
)

func main() {
	klog.V(log.LogLevelDefault).InfoS("starting harness", "version", environment.Version)

	consoleClient := client.New(args.ConsoleUrl(), args.ConsoleToken())
	fetchClient := helpers.Fetch(
		helpers.FetchWithToken(args.ConsoleToken()),
		helpers.FetchToDir(args.WorkingDir()),
	)
	ctx := signals.NewCancelableContext(
		signals.SetupSignalHandler(signals.ExitCodeTerminated),
		signals.NewConsoleSignal(consoleClient, args.StackRunID()),
	)

	opts := []controller.Option{
		controller.WithStackRun(args.StackRunID()),
		controller.WithConsoleClient(consoleClient),
		controller.WithConsoleToken(args.ConsoleToken()),
		controller.WithConsoleURL(args.ConsoleUrl()),
		controller.WithFetchClient(fetchClient),
		controller.WithWorkingDir(args.WorkingDir()),
		controller.WithSinkOptions(
			sink.WithThrottle(args.LogFlushFrequency()),
			sink.WithBufferSizeLimit(args.LogFlushBufferSize()),
		),
		controller.WithExecOptions(
			exec.WithTimeout(args.Timeout()),
		),
	}

	ctrl, err := controller.NewStackRunController(opts...)
	if err != nil {
		handleFatalError(err)
	}

	if err = ctrl.Start(ctx); err != nil {
		handleFatalError(err)
	}
}

func handleFatalError(err error) {
	switch {
	case errors.Is(err, internalerrors.ErrTimeout):
		klog.ErrorS(err, "timed out waiting for stack run step to complete", "timeout", args.Timeout())
		os.Exit(signals.ExitCodeTimeout.Int())
	case errors.Is(err, internalerrors.ErrRemoteCancel):
		klog.ErrorS(err, "stack run has been cancelled")
		os.Exit(signals.ExitCodeCancel.Int())
	case errors.Is(err, internalerrors.ErrTerminated):
		klog.ErrorS(err, "stack run has been terminated")
		os.Exit(signals.ExitCodeTerminated.Int())
	case errors.Is(err, internalerrors.ErrUnauthenticated):
		klog.ErrorS(err, "console authentication failed, rotate or replace the console token and restart the harness job")
		os.Exit(signals.ExitCodeOther.Int())
	}

	klog.ErrorS(err, "stack run failed")
	os.Exit(signals.ExitCodeOther.Int())
}
