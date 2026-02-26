package server

import (
	"context"

	"go.uber.org/zap"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"

	rpc2 "github.com/pluralsh/kubernetes-agent/pkg/module/agent_registrar/rpc"
	agent_tracker2 "github.com/pluralsh/kubernetes-agent/pkg/module/agent_tracker"
	"github.com/pluralsh/kubernetes-agent/pkg/module/modserver"
)

type server struct {
	rpc2.UnimplementedAgentRegistrarServer
	agentRegisterer agent_tracker2.Registerer
}

func (s *server) Register(ctx context.Context, req *rpc2.RegisterRequest) (*rpc2.RegisterResponse, error) {
	rpcApi := modserver.AgentRpcApiFromContext(ctx)
	log := rpcApi.Log()

	// Get agent info
	agentInfo, err := rpcApi.AgentInfo(ctx, log)
	if err != nil {
		return nil, err
	}

	connectedAgentInfo := &agent_tracker2.ConnectedAgentInfo{
		AgentMeta:    req.AgentMeta,
		ConnectedAt:  timestamppb.Now(),
		ConnectionId: req.PodId,
		AgentId:      agentInfo.Id,
		ClusterId:    agentInfo.ClusterId,
	}

	// Register agent
	err = s.agentRegisterer.RegisterConnection(ctx, connectedAgentInfo)
	if err != nil {
		rpcApi.HandleProcessingError(log, agentInfo.Id, "Failed to register agent", err)
		return nil, status.Error(codes.Unavailable, "Failed to register agent")
	}

	log.Info("Successfully registered agent", zap.String("name", agentInfo.Name), zap.Int64("id", agentInfo.Id))
	return &rpc2.RegisterResponse{}, nil
}
