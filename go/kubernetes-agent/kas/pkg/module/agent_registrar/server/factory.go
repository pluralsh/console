package server

import (
	"github.com/pluralsh/kubernetes-agent/pkg/module/agent_registrar"
	"github.com/pluralsh/kubernetes-agent/pkg/module/agent_registrar/rpc"
	"github.com/pluralsh/kubernetes-agent/pkg/module/agent_tracker"
	"github.com/pluralsh/kubernetes-agent/pkg/module/modserver"
	"github.com/pluralsh/kubernetes-agent/pkg/module/modshared"
)

type Factory struct {
	AgentRegisterer agent_tracker.Registerer
}

func (f *Factory) New(config *modserver.Config) (modserver.Module, error) {
	rpc.RegisterAgentRegistrarServer(config.AgentServer, &server{
		agentRegisterer: f.AgentRegisterer,
	})

	return &module{}, nil
}

func (f *Factory) Name() string {
	return agent_registrar.ModuleName
}

func (f *Factory) StartStopPhase() modshared.ModuleStartStopPhase {
	return modshared.ModuleStartBeforeServers
}
