package main

import (
	"errors"
	"os"

	"k8s.io/klog/v2"

	"github.com/pluralsh/deployment-operator/cmd/agent-harness/args"
	"github.com/pluralsh/deployment-operator/pkg/agentrun-harness/controller"
	"github.com/pluralsh/deployment-operator/pkg/agentrun-harness/environment"
	agentsignals "github.com/pluralsh/deployment-operator/pkg/agentrun-harness/signals"
	"github.com/pluralsh/deployment-operator/pkg/client"
	internalerrors "github.com/pluralsh/deployment-operator/pkg/harness/errors"
	"github.com/pluralsh/deployment-operator/pkg/harness/signals"
	"github.com/pluralsh/deployment-operator/pkg/log"
)

func main() {
	klog.V(log.LogLevelDefault).InfoS("starting agent harness", "version", environment.Version)

	consoleClient := client.New(args.ConsoleAPIUrl(), args.DeployToken())
	ctx := signals.NewCancelableContext(
		signals.SetupSignalHandler(signals.ExitCodeTerminated),
		agentsignals.NewConsoleSignal(consoleClient, args.AgentRunID()),
	)

	opts := []controller.Option{
		controller.WithAgentRun(args.AgentRunID()),
		controller.WithConsoleClient(consoleClient),
		controller.WithConsoleUrl(args.ConsoleUrl()),
		controller.WithDeployToken(args.DeployToken()),
		controller.WithWorkingDir(args.WorkingDir()),
	}

	ctrl, err := controller.NewAgentRunController(opts...)
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
		klog.ErrorS(err, "timed out waiting for agent run to complete", "timeout", args.Timeout())
		os.Exit(signals.ExitCodeTimeout.Int())
	case errors.Is(err, internalerrors.ErrRemoteCancel):
		klog.ErrorS(err, "agent run has been cancelled")
		os.Exit(signals.ExitCodeCancel.Int())
	case errors.Is(err, internalerrors.ErrTerminated):
		klog.ErrorS(err, "agent run has been terminated")
		os.Exit(signals.ExitCodeTerminated.Int())
	}

	klog.ErrorS(err, "agent run failed")
	os.Exit(signals.ExitCodeOther.Int())
}
