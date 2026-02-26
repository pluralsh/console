package kasapp

import (
	"net"

	"github.com/ash2k/stager"
	"go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
	otelmetric "go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/trace"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	"github.com/pluralsh/kubernetes-agent/pkg/module/modserver"
	"github.com/pluralsh/kubernetes-agent/pkg/module/observability"
	grpctool2 "github.com/pluralsh/kubernetes-agent/pkg/tool/grpctool"
)

type internalServer struct {
	server        *grpc.Server
	inMemConn     *grpc.ClientConn
	inMemListener net.Listener
	ready         func()
}

func newInternalServer(tp trace.TracerProvider, mp otelmetric.MeterProvider, p propagation.TextMapPropagator,
	factory modserver.RpcApiFactory, probeRegistry *observability.ProbeRegistry,
	grpcServerErrorReporter grpctool2.ServerErrorReporter) (*internalServer, error) {
	// In-memory gRPC client->listener pipe
	listener := grpctool2.NewDialListener()

	// Construct connection to internal gRPC server
	conn, err := grpc.NewClient("passthrough:pipe", // nolint: contextcheck
		grpc.WithStatsHandler(otelgrpc.NewServerHandler(
			otelgrpc.WithTracerProvider(tp),
			otelgrpc.WithMeterProvider(mp),
			otelgrpc.WithPropagators(p),
			otelgrpc.WithMessageEvents(otelgrpc.ReceivedEvents, otelgrpc.SentEvents),
		)),
		grpc.WithSharedWriteBuffer(true),
		grpc.WithContextDialer(listener.DialContext),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithChainStreamInterceptor(
			grpctool2.StreamClientValidatingInterceptor,
		),
		grpc.WithChainUnaryInterceptor(
			grpctool2.UnaryClientValidatingInterceptor,
		),
	)
	if err != nil {
		return nil, err
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
				modserver.StreamRpcApiInterceptor(factory), // 2. inject RPC API
				grpctool2.StreamServerErrorReporterInterceptor(grpcServerErrorReporter),
			),
			grpc.ChainUnaryInterceptor(
				modserver.UnaryRpcApiInterceptor(factory), // 2. inject RPC API
				grpctool2.UnaryServerErrorReporterInterceptor(grpcServerErrorReporter),
			),
			grpc.ForceServerCodec(grpctool2.RawCodec{}),
		),
		inMemConn:     conn,
		inMemListener: listener,
		ready:         probeRegistry.RegisterReadinessToggle("internalServer"),
	}, nil
}

func (s *internalServer) Start(stage stager.Stage) {
	grpctool2.StartServer(stage, s.server, func() (net.Listener, error) {
		s.ready()
		return s.inMemListener, nil
	}, func() {})
}
