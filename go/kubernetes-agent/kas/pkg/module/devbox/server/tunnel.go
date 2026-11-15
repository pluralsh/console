package server

import (
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	devboxv1 "github.com/pluralsh/console/go/kubernetes-agent/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/module/modserver"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/module/reverse_tunnel/rpc"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/module/reverse_tunnel/tunnel"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/plural"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/tool/grpctool"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/tool/logz"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/tool/retry"
)

// tunnelServiceDesc serves devbox.v1.Tunnel/Connect with the agentk reverse tunnel types: devbox.v1's
// TunnelConnectRequest/TunnelConnectResponse are wire-compatible with plural.agent.reverse_tunnel.rpc's
// ConnectRequest/ConnectResponse, so the existing tunnel registry handles gateway tunnels unchanged.
func tunnelServiceDesc(s *tunnelServer) *grpc.ServiceDesc {
	return &grpc.ServiceDesc{
		ServiceName: devboxv1.Tunnel_ServiceDesc.ServiceName,
		HandlerType: (*any)(nil),
		Streams: []grpc.StreamDesc{
			{
				StreamName:    "Connect",
				Handler:       s.connect,
				ServerStreams: true,
				ClientStreams: true,
			},
		},
		Metadata: devboxv1.Tunnel_ServiceDesc.Metadata,
	}
}

type tunnelServer struct {
	tunnelHandler          tunnel.Handler
	getAgentInfoPollConfig retry.PollConfigFactory
	metrics                *metrics
}

func (s *tunnelServer) connect(_ any, stream grpc.ServerStream) error {
	ctx := stream.Context()
	ageCtx := grpctool.MaxConnectionAgeContextFromStreamContext(ctx)
	rpcApi := modserver.AgentRpcApiFromContext(ctx)
	log := rpcApi.Log()
	return rpcApi.PollWithBackoff(s.getAgentInfoPollConfig(), func() (error, retry.AttemptResult) { // nolint:staticcheck
		agentInfo, err := rpcApi.AgentInfo(ctx, log)
		if err != nil {
			err = plural.VerifyClusterError(err)
			if status.Code(err) == codes.Unavailable {
				return nil, retry.Backoff
			}
			log.Debug("Devbox gateway tunnel rejected", logz.Error(err))
			return err, retry.Done // no wrap
		}
		s.metrics.tunnels.Inc()
		defer s.metrics.tunnels.Dec()
		server := &grpc.GenericServerStream[rpc.ConnectRequest, rpc.ConnectResponse]{ServerStream: stream}
		return s.tunnelHandler.HandleTunnel(ageCtx, agentInfo, server), retry.Done
	})
}
