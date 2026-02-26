package server

import (
	"context"
	"math"
	"time"

	"github.com/prometheus/client_golang/prometheus"

	agent_tracker2 "github.com/pluralsh/kubernetes-agent/pkg/module/agent_tracker"
	"github.com/pluralsh/kubernetes-agent/pkg/module/agent_tracker/rpc"
	"github.com/pluralsh/kubernetes-agent/pkg/module/modserver"
	"github.com/pluralsh/kubernetes-agent/pkg/module/modshared"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/metric"
)

type Factory struct {
	AgentQuerier agent_tracker2.Querier
}

func (f *Factory) New(config *modserver.Config) (modserver.Module, error) {
	connectedAgentsCountGaugeFunc := f.constructConnectedAgentsCountGaugeFunc()
	err := metric.Register(config.Registerer, connectedAgentsCountGaugeFunc)
	if err != nil {
		return nil, err
	}

	rpc.RegisterAgentTrackerServer(config.ApiServer, &server{
		agentQuerier: f.AgentQuerier,
	})

	return &module{}, nil
}

func (f *Factory) Name() string {
	return agent_tracker2.ModuleName
}

func (f *Factory) StartStopPhase() modshared.ModuleStartStopPhase {
	return modshared.ModuleStartBeforeServers
}

func (f *Factory) constructConnectedAgentsCountGaugeFunc() prometheus.GaugeFunc {
	return prometheus.NewGaugeFunc(prometheus.GaugeOpts{
		Name: "connected_agents_count",
		Help: "The number of unique connected agents",
	}, func() float64 {
		ctx, cancel := context.WithTimeout(context.Background(), time.Second)
		defer cancel()
		size, err := f.AgentQuerier.GetConnectedAgentsCount(ctx)
		if err != nil {
			return math.NaN()
		}
		return float64(size)
	},
	)
}
