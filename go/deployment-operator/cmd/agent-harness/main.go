// Command agent-harness runs a single agent run inside its pod and reports progress back to the console.
package main

import (
	"errors"
	"os"

	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/deployment-operator/cmd/agent-harness/args"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/controller"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/environment"
	agentsignals "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/signals"
	"github.com/pluralsh/console/go/deployment-operator/pkg/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
	internalerrors "github.com/pluralsh/console/go/deployment-operator/pkg/harness/errors"
	"github.com/pluralsh/console/go/deployment-operator/pkg/harness/signals"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
)

func main() {
	klog.V(log.LogLevelDefault).InfoS("starting agent harness", "version", environment.Version)

	consoleClient := client.New(common.AgentConsoleExtGQLURL, "")
	ctx := signals.NewCancelableContext(
		signals.SetupSignalHandler(signals.ExitCodeTerminated),
		agentsignals.NewConsoleSignal(consoleClient, args.AgentRunID()),
	)

	opts := []controller.Option{
		controller.WithAgentRun(args.AgentRunID()),
		controller.WithConsoleClient(consoleClient),
		controller.WithWorkingDir(args.WorkingDir()),
	}

	ctrl, err := controller.NewAgentRunController(opts...)
	if err != nil {
		handleFatalError(consoleClient, err)
	}

	if err = ctrl.Start(ctx); err != nil {
		handleFatalError(consoleClient, err)
	}
}

func handleFatalError(consoleClient client.Client, err error) {
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
	if failErr := agentrun.FailAgentRun(consoleClient, args.AgentRunID(), err.Error(), nil); failErr != nil {
		klog.ErrorS(failErr, "could not mark agent run as failed", "agent-run-id", args.AgentRunID())
	}
	os.Exit(signals.ExitCodeOther.Int())
}
