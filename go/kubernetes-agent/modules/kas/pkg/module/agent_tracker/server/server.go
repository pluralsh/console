package server

import (
	"context"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/pluralsh/kubernetes-agent/pkg/module/agent_tracker"
	rpc2 "github.com/pluralsh/kubernetes-agent/pkg/module/agent_tracker/rpc"
	"github.com/pluralsh/kubernetes-agent/pkg/module/modserver"
	"github.com/pluralsh/kubernetes-agent/pkg/module/modshared"
)

type server struct {
	rpc2.UnimplementedAgentTrackerServer
	agentQuerier agent_tracker.Querier
}

func (s *server) GetConnectedAgents(ctx context.Context, req *rpc2.GetConnectedAgentsRequest) (*rpc2.GetConnectedAgentsResponse, error) {
	rpcApi := modserver.RpcApiFromContext(ctx)
	log := rpcApi.Log()
	switch v := req.Request.(type) {
	case *rpc2.GetConnectedAgentsRequest_AgentId:
		var infos agent_tracker.ConnectedAgentInfoCollector
		err := s.agentQuerier.GetConnectionsByAgentId(ctx, v.AgentId, infos.Collect)
		if err != nil {
			rpcApi.HandleProcessingError(log, modshared.NoAgentId, "GetConnectionsByAgentId() failed", err)
			return nil, status.Error(codes.Unavailable, "GetConnectionsByAgentId() failed")
		}
		return &rpc2.GetConnectedAgentsResponse{
			Agents: infos,
		}, nil
	default:
		// Should never happen
		return nil, status.Errorf(codes.InvalidArgument, "Unexpected field type: %T", req.Request)
	}
}
