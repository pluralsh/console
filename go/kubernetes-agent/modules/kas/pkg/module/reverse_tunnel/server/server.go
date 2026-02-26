package server

import (
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/pluralsh/kubernetes-agent/pkg/module/modserver"
	"github.com/pluralsh/kubernetes-agent/pkg/module/reverse_tunnel/rpc"
	"github.com/pluralsh/kubernetes-agent/pkg/module/reverse_tunnel/tunnel"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/grpctool"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/retry"
)

type server struct {
	rpc.UnimplementedReverseTunnelServer
	tunnelHandler          tunnel.Handler
	getAgentInfoPollConfig retry.PollConfigFactory
}

func (s *server) Connect(server rpc.ReverseTunnel_ConnectServer) error {
	ctx := server.Context()
	ageCtx := grpctool.MaxConnectionAgeContextFromStreamContext(ctx)
	rpcApi := modserver.AgentRpcApiFromContext(ctx)
	log := rpcApi.Log()
	return rpcApi.PollWithBackoff(s.getAgentInfoPollConfig(), func() (error, retry.AttemptResult) { // nolint:staticcheck
		agentInfo, err := rpcApi.AgentInfo(ctx, log)
		if err != nil {
			if status.Code(err) == codes.Unavailable {
				return nil, retry.Backoff
			}
			return err, retry.Done // no wrap
		}
		return s.tunnelHandler.HandleTunnel(ageCtx, agentInfo, server), retry.Done
	})
}
