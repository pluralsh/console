package server

import (
	"context"

	"github.com/pluralsh/kubernetes-agent/pkg/module/agent_registrar"
)

type module struct{}

func (m *module) Run(ctx context.Context) error {
	return nil
}

func (m *module) Name() string {
	return agent_registrar.ModuleName
}
