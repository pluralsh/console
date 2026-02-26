package agentkapp

import (
	"context"
	"net"

	"github.com/ash2k/stager"
	grpc_validator "github.com/grpc-ecosystem/go-grpc-middleware/v2/interceptors/validator"
	"go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
	otelmetric "go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/trace"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	modagent2 "github.com/pluralsh/kubernetes-agent/pkg/module/modagent"
	"github.com/pluralsh/kubernetes-agent/pkg/module/modshared"
	grpctool2 "github.com/pluralsh/kubernetes-agent/pkg/tool/grpctool"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/logz"
)

type internalServer struct {
	server   *grpc.Server
	conn     *grpc.ClientConn
	listener net.Listener
}

func newInternalServer(log *zap.Logger, tp trace.TracerProvider, mp otelmetric.MeterProvider, p propagation.TextMapPropagator,
	streamProm grpc.StreamServerInterceptor, unaryProm grpc.UnaryServerInterceptor) (*internalServer, error) {
	// Internal gRPC client->listener pipe
	listener := grpctool2.NewDialListener()

	// Construct connection to internal gRPC server
	conn, err := grpc.NewClient("passthrough:pipe", // nolint: contextcheck
		grpc.WithSharedWriteBuffer(true),
		grpc.WithContextDialer(listener.DialContext),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithDefaultCallOptions(grpc.ForceCodec(grpctool2.RawCodec{})),
	)
	if err != nil {
		return nil, err
	}
	factory := func(ctx context.Context, method string) modagent2.RpcApi {
		return &agentRpcApi{
			RpcApiStub: modshared.RpcApiStub{
				Logger:    log.With(logz.TraceIdFromContext(ctx)),
				StreamCtx: ctx,
			},
		}
	}
	return &internalServer{
		server: grpc.NewServer(
			grpc.StatsHandler(otelgrpc.NewServerHandler(
				otelgrpc.WithTracerProvider(tp),
				otelgrpc.WithMeterProvider(mp),
				otelgrpc.WithPropagators(p),
				otelgrpc.WithMessageEvents(otelgrpc.ReceivedEvents, otelgrpc.SentEvents),
			)),
			grpc.StatsHandler(grpctool2.ServerNoopMaxConnAgeStatsHandler{}),
			grpc.SharedWriteBuffer(true),
			grpc.ChainStreamInterceptor(
				streamProm, // 1. measure all invocations
				modagent2.StreamRpcApiInterceptor(factory), // 2. inject RPC API
				grpc_validator.StreamServerInterceptor(),   // x. wrap with validator
			),
			grpc.ChainUnaryInterceptor(
				unaryProm, // 1. measure all invocations
				modagent2.UnaryRpcApiInterceptor(factory), // 2. inject RPC API
				grpc_validator.UnaryServerInterceptor(),   // x. wrap with validator
			),
		),
		conn:     conn,
		listener: listener,
	}, nil
}

func (s *internalServer) Start(stage stager.Stage) {
	grpctool2.StartServer(stage, s.server, func() (net.Listener, error) {
		return s.listener, nil
	}, func() {})
}
