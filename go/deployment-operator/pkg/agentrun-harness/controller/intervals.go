package controller

import "time"

const (
	// promptPollInterval is how often the harness polls for queued user prompts
	// during approval wait and babysit mode.
	promptPollInterval = 5 * time.Second

	// kickedPromptPollInterval replaces promptPollInterval when the sidecar pushes
	// Console notifications, so polling only covers missed pushes.
	kickedPromptPollInterval = 30 * time.Second
)

func (in *agentRunController) promptPollInterval() time.Duration {
	if in.kicks != nil {
		return kickedPromptPollInterval
	}
	return promptPollInterval
}
