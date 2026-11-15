package server

import (
	"strconv"

	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"

	devboxv1 "github.com/pluralsh/console/go/kubernetes-agent/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/module/devbox"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/module/modserver"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/module/reverse_tunnel/tunnel"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/tool/logz"
)

// controlServer serves devbox.v1.Control for console on the API server and forwards each call, as raw frames,
// to the matching devbox.v1.Gateway method of the cluster named by the devbox-cluster-id metadata.
type controlServer struct {
	// gatewayConn routes calls to a gateway tunnel by modserver.RoutingAgentIdMetadataKey, on this or another
	// KAS replica.
	gatewayConn grpc.ClientConnInterface
	// tunnelQuerier, when set, lets a call for a cluster without any registered tunnel fail immediately rather
	// than after the routing timeout.
	tunnelQuerier tunnel.Querier
}

func (s *controlServer) handle(_ any, stream grpc.ServerStream) error {
	ctx := stream.Context()
	rpcApi := modserver.RpcApiFromContext(ctx)
	fullMethod, _ := grpc.Method(ctx)
	log := rpcApi.Log().With(logz.GrpcMethod(fullMethod))

	gatewayMethod, ok := devboxv1.GatewayMethodForControl(fullMethod)
	if !ok {
		return status.Errorf(codes.Unimplemented, "%s is not forwarded to devbox gateways", fullMethod)
	}
	md, _ := metadata.FromIncomingContext(ctx)
	clusterId, err := singleValue(md, devboxv1.ClusterIDMetadataKey)
	if err != nil {
		return err
	}
	agentId, err := devbox.AgentIdForCluster(clusterId)
	if err != nil {
		return err
	}
	log = log.With(zap.String("cluster_id", clusterId), logz.AgentId(agentId))

	if s.tunnelQuerier != nil {
		urls, qErr := s.tunnelQuerier.KasUrlsByAgentId(ctx, agentId)
		switch {
		case qErr != nil:
			// Redis trouble: let the router decide, it has its own lookup and timeout.
			log.Debug("Devbox tunnel lookup failed", logz.Error(qErr))
		case len(urls) == 0:
			log.Debug("No devbox gateway tunnel registered for cluster")
			return devbox.ClusterOfflineError()
		}
	}

	outMD := outgoingMetadata(ctx)
	outMD.Set(modserver.RoutingAgentIdMetadataKey, strconv.FormatInt(agentId, 10))
	return forwardStream(metadata.NewOutgoingContext(ctx, outMD), stream, s.gatewayConn, gatewayMethod)
}

func singleValue(md metadata.MD, key string) (string, error) {
	vals := md.Get(key)
	switch len(vals) {
	case 0:
		return "", status.Errorf(codes.InvalidArgument, "missing %s metadata", key)
	case 1:
		return vals[0], nil
	default:
		return "", status.Errorf(codes.InvalidArgument, "expecting a single %s, got %d", key, len(vals))
	}
}
