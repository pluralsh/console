package kasapp

import (
	"context"
	"errors"
	"time"

	otelcodes "go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"

	"github.com/pluralsh/kubernetes-agent/pkg/module/modserver"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/grpctool"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/logz"
)

// RouteToKasStreamHandler is a gRPC handler that routes the request to another kas instance.
// Must return a gRPC status-compatible error.
func (r *router) RouteToKasStreamHandler(srv interface{}, stream grpc.ServerStream) error {
	// 0. boilerplate
	ctx := stream.Context()
	md, _ := metadata.FromIncomingContext(ctx)
	agentId, err := agentIdFromMeta(md)
	if err != nil {
		return err
	}
	rpcApi := modserver.RpcApiFromContext(ctx)

	// 1. find a ready, suitable tunnel
	rt, err := r.findReadyTunnel(ctx, rpcApi, md, agentId)
	if err != nil {
		return err
	}
	defer rt.Done()

	// 2. start streaming via the found tunnel
	f := kasStreamForwarder{
		log:               rpcApi.Log().With(logz.AgentId(agentId), logz.KasUrl(rt.kasUrl)),
		rpcApi:            rpcApi,
		gatewayKasVisitor: r.gatewayKasVisitor,
	}
	return f.ForwardStream(rt.kasStream, stream)
}

func (r *router) findReadyTunnel(ctx context.Context, rpcApi modserver.RpcApi, md metadata.MD, agentId int64) (readyTunnel, error) {
	startRouting := time.Now()
	findCtx, span := r.tracer.Start(ctx, "router.findReadyTunnel", trace.WithSpanKind(trace.SpanKindInternal))
	defer span.End()
	log := rpcApi.Log().With(logz.AgentId(agentId))
	tf := newTunnelFinder(
		log,
		r.kasPool,
		r.tunnelQuerier,
		rpcApi,
		grpc.ServerTransportStreamFromContext(ctx).Method(),
		r.ownPrivateApiUrl,
		agentId,
		metadata.NewOutgoingContext(ctx, md),
		r.pollConfig,
		r.gatewayKasVisitor,
		r.tryNewKasInterval,
	)
	findCtx, findCancel := context.WithTimeout(findCtx, r.tunnelFindTimeout)
	defer findCancel()

	rt, err := tf.Find(findCtx)
	if err != nil {
		switch { // Order is important here.
		case ctx.Err() != nil: // Incoming stream cancelled.
			r.kasRoutingDurationAborted.Observe(time.Since(startRouting).Seconds())
			span.SetStatus(otelcodes.Error, "Aborted")
			span.RecordError(ctx.Err())
			return readyTunnel{}, grpctool.StatusErrorFromContext(ctx, "RouteToKasStreamHandler request aborted")
		case findCtx.Err() != nil: // Find tunnel timed out.
			r.kasRoutingDurationTimeout.Inc()
			findCtxErr := findCtx.Err()
			span.SetStatus(otelcodes.Error, "Timed out")
			span.RecordError(findCtxErr)
			rpcApi.HandleProcessingError(log, agentId, "Agent connection not found", errors.New(findCtxErr.Error()))
			return readyTunnel{}, status.Error(codes.DeadlineExceeded, "Agent connection not found. Is agent up to date and connected?")
		default: // This should never happen, but let's handle a non-ctx error for completeness and future-proofing.
			span.SetStatus(otelcodes.Error, "Failed")
			span.RecordError(err)
			return readyTunnel{}, status.Errorf(codes.Unavailable, "Find tunnel failed: %v", err)
		}
	}
	r.kasRoutingDurationSuccess.Observe(time.Since(startRouting).Seconds())
	span.SetStatus(otelcodes.Ok, "")
	return rt, nil
}
