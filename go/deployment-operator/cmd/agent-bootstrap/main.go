package main

import (
	"context"

	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/deployment-operator/cmd/agent-bootstrap/args"
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
	fragment, err := consoleClient.GetAgentRun(context.Background(), args.AgentRunID())
	if err != nil {
		klog.Fatalf("could not fetch agent run (%s): %v", args.AgentRunID(), err)
	}

	run := (&agentrunv1.AgentRun{}).FromAgentRunFragment(fragment)
	if err := agentrunenv.New(
		agentrunenv.WithAgentRun(run),
		agentrunenv.WithWorkingDir(args.WorkingDir()),
	).Setup(); err != nil {
		klog.Fatalf("could not prepare repository workspace: %v", err)
	}
}
