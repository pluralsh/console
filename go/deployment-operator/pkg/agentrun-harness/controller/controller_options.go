package controller

import (
	console "github.com/pluralsh/console/go/deployment-operator/pkg/client"
)

func WithAgentRun(id string) Option {
	return func(s *agentRunController) {
		s.agentRunID = id
	}
}

func WithConsoleClient(client console.Client) Option {
	return func(s *agentRunController) {
		s.consoleClient = client
	}
}

// WithKicks wakes the approval and babysit loops early when Console notifies about this run.
func WithKicks(kicks <-chan struct{}) Option {
	return func(s *agentRunController) {
		s.kicks = kicks
	}
}

func WithWorkingDir(dir string) Option {
	return func(s *agentRunController) {
		s.dir = dir
	}
}
