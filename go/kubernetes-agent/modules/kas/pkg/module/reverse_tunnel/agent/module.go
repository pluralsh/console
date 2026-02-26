package agent

import (
	"context"
	"time"

	"google.golang.org/grpc"

	"github.com/pluralsh/kubernetes-agent/pkg/agentcfg"
	"github.com/pluralsh/kubernetes-agent/pkg/module/reverse_tunnel"
	"github.com/pluralsh/kubernetes-agent/pkg/module/reverse_tunnel/info"
)

// connectionFactory helps to inject fake connections for testing.
type connectionFactory func(agentDescriptor *info.AgentDescriptor, onActive, onIdle func(connectionInterface)) connectionInterface

type module struct {
	server *grpc.Server
	// minIdleConnections is the minimum number of connections that are not streaming a request.
	minIdleConnections int32
	// maxConnections is the maximum number of connections (idle and active).
	maxConnections int32
	scaleUpStep    int32
	// maxIdleTime is the maximum duration of time a connection can stay in an idle state.
	maxIdleTime       time.Duration
	connectionFactory connectionFactory
}

func (m *module) Run(ctx context.Context, cfg <-chan *agentcfg.AgentConfiguration) error {
	cm := connectionManager{
		connections:        make(map[connectionInterface]connectionInfo),
		minIdleConnections: m.minIdleConnections,
		maxConnections:     m.maxConnections,
		scaleUpStep:        m.scaleUpStep,
		maxIdleTime:        m.maxIdleTime,
		connectionFactory:  m.connectionFactory,
		agentDescriptor:    m.agentDescriptor(),
	}
	cm.Run(ctx)
	return nil
}

func (m *module) DefaultAndValidateConfiguration(config *agentcfg.AgentConfiguration) error {
	return nil
}

func (m *module) Name() string {
	return reverse_tunnel.ModuleName
}

func (m *module) agentDescriptor() *info.AgentDescriptor {
	serverInfo := m.server.GetServiceInfo()
	services := make([]*info.Service, 0, len(serverInfo))
	for svcName, svcInfo := range serverInfo {
		methods := make([]*info.Method, 0, len(svcInfo.Methods))
		for _, mInfo := range svcInfo.Methods {
			methods = append(methods, &info.Method{
				Name: mInfo.Name,
			})
		}
		services = append(services, &info.Service{
			Name:    svcName,
			Methods: methods,
		})
	}
	return &info.AgentDescriptor{
		Services: services,
	}
}
