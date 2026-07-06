package controller

import "time"

const (
	// promptPollInterval is how often the harness polls for queued user prompts
	// during approval wait and babysit mode.
	promptPollInterval = 5 * time.Second
)
