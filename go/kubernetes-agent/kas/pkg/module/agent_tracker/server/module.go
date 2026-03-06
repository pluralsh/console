package server

import (
	"context"

	"github.com/pluralsh/console/go/kubernetes-agent/pkg/module/agent_tracker"
)

type module struct{}

func (m *module) Run(ctx context.Context) error {
	return nil
}

func (m *module) Name() string {
	return agent_tracker.ModuleName
}
