package kasapp

import (
	"context"
	"fmt"
	"net"
	"time"

	"github.com/ash2k/stager"
	grpc_validator "github.com/grpc-ecosystem/go-grpc-middleware/v2/interceptors/validator"

	"github.com/pluralsh/kubernetes-agent/pkg/kascfg"
	"github.com/pluralsh/kubernetes-agent/pkg/module/modserver"
	"github.com/pluralsh/kubernetes-agent/pkg/module/observability"
	grpctool2 "github.com/pluralsh/kubernetes-agent/pkg/tool/grpctool"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/ioz"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/logz"

	"go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
	otelmetric "go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/trace"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/keepalive"
	"google.golang.org/grpc/stats"
)

type apiServer struct {
	log       *zap.Logger
	listenCfg *kascfg.ListenApiCF
	server    *grpc.Server
	auxCancel context.CancelFunc
	ready     func()
}

func newApiServer(log *zap.Logger, cfg *kascfg.ConfigurationFile, tp trace.TracerProvider, mp otelmetric.MeterProvider,
	p propagation.TextMapPropagator, ssh stats.Handler, factory modserver.RpcApiFactory,
	probeRegistry *observability.ProbeRegistry, streamProm grpc.StreamServerInterceptor, unaryProm grpc.UnaryServerInterceptor,
	grpcServerErrorReporter grpctool2.ServerErrorReporter) (*apiServer, error) {
	listenCfg := cfg.Api.Listen
	jwtSecret, err := ioz.LoadBase64Secret(listenCfg.AuthenticationSecretFile)
	if err != nil {
		return nil, fmt.Errorf("auth secret file: %w", err)
	}
	credsOpt, err := maybeTLSCreds(listenCfg.CertificateFile, listenCfg.KeyFile)
	if err != nil {
		return nil, err
	}

	jwtAuther := grpctool2.NewJWTAuther(jwtSecret, "", kasName, func(ctx context.Context) *zap.Logger {
		return modserver.RpcApiFromContext(ctx).Log()
	})

	auxCtx, auxCancel := context.WithCancel(context.Background())
	keepaliveOpt, sh := grpctool2.MaxConnectionAge2GrpcKeepalive(auxCtx, listenCfg.MaxConnectionAge.AsDuration())
	serverOpts := []grpc.ServerOption{
		grpc.StatsHandler(otelgrpc.NewServerHandler(
			otelgrpc.WithTracerProvider(tp),
			otelgrpc.WithMeterProvider(mp),
			otelgrpc.WithPropagators(p),
			otelgrpc.WithMessageEvents(otelgrpc.ReceivedEvents, otelgrpc.SentEvents),
		)),
		grpc.StatsHandler(ssh),
		grpc.StatsHandler(sh),
		grpc.SharedWriteBuffer(true),
		grpc.ChainStreamInterceptor(
			streamProm, // 1. measure all invocations
			modserver.StreamRpcApiInterceptor(factory), // 2. inject RPC API
			jwtAuther.StreamServerInterceptor,          // 3. auth and maybe log
			grpc_validator.StreamServerInterceptor(),   // x. wrap with validator
			grpctool2.StreamServerErrorReporterInterceptor(grpcServerErrorReporter),
		),
		grpc.ChainUnaryInterceptor(
			unaryProm, // 1. measure all invocations
			modserver.UnaryRpcApiInterceptor(factory), // 2. inject RPC API
			jwtAuther.UnaryServerInterceptor,          // 3. auth and maybe log
			grpc_validator.UnaryServerInterceptor(),   // x. wrap with validator
			grpctool2.UnaryServerErrorReporterInterceptor(grpcServerErrorReporter),
		),
		grpc.KeepaliveEnforcementPolicy(keepalive.EnforcementPolicy{
			MinTime:             20 * time.Second,
			PermitWithoutStream: true,
		}),
		keepaliveOpt,
	}

	serverOpts = append(serverOpts, credsOpt...)

	return &apiServer{
		log:       log,
		listenCfg: listenCfg,
		server:    grpc.NewServer(serverOpts...),
		auxCancel: auxCancel,
		ready:     probeRegistry.RegisterReadinessToggle("apiServer"),
	}, nil
}

func (s *apiServer) Start(stage stager.Stage) {
	grpctool2.StartServer(stage, s.server, func() (net.Listener, error) {
		lis, err := net.Listen(*s.listenCfg.Network, s.listenCfg.Address)
		if err != nil {
			return nil, err
		}
		addr := lis.Addr()
		s.log.Info("API endpoint is up",
			logz.NetNetworkFromAddr(addr),
			logz.NetAddressFromAddr(addr),
		)
		s.ready()
		return lis, nil
	}, func() {
		time.Sleep(s.listenCfg.ListenGracePeriod.AsDuration())
		s.auxCancel()
	})
}
