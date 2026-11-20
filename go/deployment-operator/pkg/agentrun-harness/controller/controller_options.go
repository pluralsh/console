package controller

import (
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/events"
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

// WithStatus has the approval and babysit loops read the run's status from Console's pushes and
// wake on each one.
func WithStatus(status *events.Status) Option {
	return func(s *agentRunController) {
		s.status = status
		s.kicks = status.Subscribe()
	}
}

func WithWorkingDir(dir string) Option {
	return func(s *agentRunController) {
		s.dir = dir
	}
}
