package server

import (
	"context"
	"time"

	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"

	devboxv1 "github.com/pluralsh/console/go/kubernetes-agent/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/module/modserver"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/plural"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/tool/logz"
)

// ingestServer serves devbox.v1.Ingest for gateways and forwards each call, as raw frames, to console. The
// cluster is always the one the caller's deploy token belongs to: any devbox-cluster-id the gateway sent is
// replaced, so a gateway can't report on another cluster's instances.
type ingestServer struct {
	consoleConn grpc.ClientConnInterface
	timeout     time.Duration
}

func (s *ingestServer) handle(_ any, stream grpc.ServerStream) error {
	ctx := stream.Context()
	rpcApi := modserver.AgentRpcApiFromContext(ctx)
	fullMethod, _ := grpc.Method(ctx)
	log := rpcApi.Log().With(logz.GrpcMethod(fullMethod))

	agentInfo, err := rpcApi.AgentInfo(ctx, log)
	if err != nil {
		return plural.VerifyClusterError(err)
	}
	log = log.With(zap.String("cluster_id", agentInfo.ClusterId), logz.AgentId(agentInfo.Id))

	md := outgoingMetadata(ctx)
	md.Set(devboxv1.ClusterIDMetadataKey, agentInfo.ClusterId)
	outCtx := metadata.NewOutgoingContext(ctx, md)
	if _, ok := ctx.Deadline(); !ok && s.timeout > 0 {
		var cancel context.CancelFunc
		outCtx, cancel = context.WithTimeout(outCtx, s.timeout)
		defer cancel()
	}
	err = forwardStream(outCtx, stream, s.consoleConn, fullMethod)
	if err != nil {
		log.Debug("Forwarded devbox Ingest call failed", logz.Error(err))
	}
	return err
}
