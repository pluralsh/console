package controller

import (
	"context"
	"sync"
	"time"

	agentrunv1 "github.com/pluralsh/deployment-operator/pkg/agentrun-harness/agentrun/v1"
	v1 "github.com/pluralsh/deployment-operator/pkg/agentrun-harness/tool/v1"
	console "github.com/pluralsh/deployment-operator/pkg/client"
)

type Controller interface {
	Start(ctx context.Context) error
}

type agentRunController struct {
	sync.Mutex

	// agentRun is the agent run that is being processed
	agentRun *agentrunv1.AgentRun

	// agentRunID is the ID of the agent run that is being processed
	agentRunID string

	// consoleClient is the client for Console API
	consoleClient console.Client

	// deployToken is the token used to access the Console External API
	deployToken string

	// consoleURl is needed for MCP Server
	consoleUrl string

	// tool is the agent run tool that is being executed
	tool v1.Tool

	// dir is the working directory where the repository will be cloned.
	dir string

	// errChan signals that an error occurred during command execution
	errChan chan error

	// done signals that all commands execution is finished
	done chan struct{}

	// runDone signals that the initial AI tool Run() has completed.
	// The babysit loop waits on this before its first tick so that
	// BabysitRun is never called concurrently with the initial Run.
	runDone chan struct{}

	// lastPRSHA is the dedup hash of the last-seen PR state (comments + CI checks).
	// The babysit loop skips reprompting when this matches the current state.
	lastPRSHA string

	// lastPRCheckAt is the time the agent was last reprompted about PR status.
	// Passed to the AI so it knows which comments are new since the last check.
	lastPRCheckAt time.Time
}

type Option func(*agentRunController)
