package controller

import (
	console "github.com/pluralsh/deployment-operator/pkg/client"
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

func WithDeployToken(token string) Option {
	return func(s *agentRunController) {
		s.deployToken = token
	}
}

func WithConsoleUrl(url string) Option {
	return func(s *agentRunController) {
		s.consoleUrl = url
	}
}
