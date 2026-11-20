package controller

import (
	"context"
	"time"

	gqlclient "github.com/pluralsh/console/go/client"
)

const (
	// promptPollInterval is how often the harness polls for queued user prompts
	// during approval wait and babysit mode.
	promptPollInterval = 5 * time.Second

	// kickedPromptPollInterval replaces promptPollInterval while the sidecar is configured but its
	// websocket is down. While it's up, pushes replace polling, see events.Status.PollInterval.
	kickedPromptPollInterval = 30 * time.Second
)

func (in *agentRunController) promptPollInterval() time.Duration {
	if in.status == nil {
		return promptPollInterval
	}
	return in.status.PollInterval(promptPollInterval, kickedPromptPollInterval)
}

func (in *agentRunController) runStatus(ctx context.Context) (*gqlclient.AgentRunStatusFragment, error) {
	if in.status == nil {
		return in.consoleClient.GetAgentRunStatus(ctx, in.agentRunID)
	}
	return in.status.Get(ctx)
}
