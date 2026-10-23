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

func WithWorkingDir(dir string) Option {
	return func(s *agentRunController) {
		s.dir = dir
	}
}
