package main

import (
	"context"
	"errors"
	"os"

	"github.com/pluralsh/deployment-operator/pkg/harness/signals"
	"k8s.io/klog/v2"

	"github.com/pluralsh/deployment-operator/cmd/sentinel-harness/args"
	"github.com/pluralsh/deployment-operator/pkg/client"
	internalerrors "github.com/pluralsh/deployment-operator/pkg/harness/errors"
	"github.com/pluralsh/deployment-operator/pkg/log"
	"github.com/pluralsh/deployment-operator/pkg/sentinel-harness/controller"
	"github.com/pluralsh/deployment-operator/pkg/sentinel-harness/environment"
)

func main() {
	klog.V(log.LogLevelDefault).InfoS("starting sentinel harness", "version", environment.Version)

	consoleClient := client.New(args.ConsoleUrl(), args.ConsoleToken())

	signalCtx := signals.SetupSignalHandler(signals.ExitCodeTerminated)
	ctx := signals.NewCancelableContext(signalCtx)
	ctx, cancel := context.WithTimeoutCause(ctx, args.Timeout(), internalerrors.ErrTimeout)
	defer cancel()

	opts := []controller.Option{
		controller.WithSentinelRun(args.SentinelRunID()),
		controller.WithConsoleClient(consoleClient),
		controller.WithConsoleToken(args.ConsoleToken()),
		controller.WithTestDir(args.TestDir()),
		controller.WithOutputDir(args.OutputDir()),
		controller.WithOutputFormat(args.OutputFormat()),
		controller.WithTimeout(args.TimeoutDuration()),
		controller.WithConsoleURL(args.ConsoleUrl()),
	}

	ctrl, err := controller.NewSentinelRunController(opts...)
	if err != nil {
		handleFatalError(err)
	}

	if err = ctrl.Start(ctx); err != nil {
		handleFatalError(err)
	}
}

func handleFatalError(err error) {
	if err == nil {
		return
	}

	switch {
	case errors.Is(err, internalerrors.ErrTimeout):
		klog.ErrorS(err, "Timed out waiting for sentinel run to complete")
		os.Exit(signals.ExitCodeTimeout.Int())

	case errors.Is(err, internalerrors.ErrTerminated):
		klog.ErrorS(err, "Sentinel run terminated via signal")
		os.Exit(signals.ExitCodeTerminated.Int())

	default:
		klog.ErrorS(err, "Sentinel run failed unexpectedly")
		os.Exit(signals.ExitCodeOther.Int())
	}
}
