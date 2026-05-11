package environment

import (
	v1 "github.com/pluralsh/deployment-operator/pkg/agentrun-harness/agentrun/v1"
	console "github.com/pluralsh/deployment-operator/pkg/client"
)

// WithWorkingDir allows changing the default working directory of the Environment.
func WithWorkingDir(dir string) Option {
	return func(e *environment) {
		e.dir = dir
	}
}

// WithAgentRun provides information about agent run used to initialize
// the Environment.
func WithAgentRun(agentRun *v1.AgentRun) Option {
	return func(e *environment) {
		e.agentRun = agentRun
	}
}

func WithConsoleTokenClient(client console.Client) Option {
	return func(e *environment) {
		e.consoleTokenClient = client
	}
}
