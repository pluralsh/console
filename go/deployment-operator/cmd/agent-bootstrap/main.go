package main

import (
	"context"
	"fmt"
	"os"

	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/deployment-operator/cmd/agent-bootstrap/args"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun"
	agentrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun/v1"
	agentrunenv "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/environment"
	"github.com/pluralsh/console/go/deployment-operator/pkg/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
)

func main() {
	klog.V(log.LogLevelDefault).InfoS("starting agent bootstrap",
		"console-url", args.ConsoleURL(),
		"agent-run-id", args.AgentRunID(),
		"working-dir", args.WorkingDir(),
	)

	consoleClient := client.New(args.ConsoleApiURL(), args.DeployToken())
	if err := run(context.Background(), consoleClient, args.AgentRunID(), args.WorkingDir()); err != nil {
		failAndExit(consoleClient, args.AgentRunID(), err.Error())
	}
}

func run(ctx context.Context, consoleClient client.Client, agentRunID, workingDir string) error {
	fragment, err := consoleClient.GetAgentRun(ctx, agentRunID)
	if err != nil {
		return fmt.Errorf("could not fetch agent run (%s): %w", agentRunID, err)
	}

	agentRun := (&agentrunv1.AgentRun{}).FromAgentRunFragment(fragment)
	if err := agentrunenv.New(
		agentrunenv.WithAgentRun(agentRun),
		agentrunenv.WithWorkingDir(workingDir),
		agentrunenv.WithFastPrebakeCopy(),
	).Setup(); err != nil {
		return fmt.Errorf("could not prepare repository workspace: %w", err)
	}
	return nil
}

// markAgentRunFailed posts Failed+Error to Console so the UI and workbench
// see a descriptive message instead of only an exit code.
func markAgentRunFailed(consoleClient client.Client, agentRunID, msg string) {
	if err := agentrun.FailAgentRun(consoleClient, agentRunID, msg, nil); err != nil {
		klog.ErrorS(err, "could not mark agent run as failed", "agent-run-id", agentRunID)
	}
}

func failAndExit(consoleClient client.Client, agentRunID, msg string) {
	klog.ErrorS(nil, msg)
	markAgentRunFailed(consoleClient, agentRunID, msg)
	os.Exit(1)
}
