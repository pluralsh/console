package test

import (
	"context"
	"net"
	"testing"
	"time"

	"github.com/ash2k/stager"
	grpc_validator "github.com/grpc-ecosystem/go-grpc-middleware/v2/interceptors/validator"

	"github.com/pluralsh/kubernetes-agent/pkg/api"
	"github.com/pluralsh/kubernetes-agent/pkg/kascfg"
	modserver2 "github.com/pluralsh/kubernetes-agent/pkg/module/modserver"
	"github.com/pluralsh/kubernetes-agent/pkg/module/modshared"
	reverse_tunnel_server "github.com/pluralsh/kubernetes-agent/pkg/module/reverse_tunnel/server"
	"github.com/pluralsh/kubernetes-agent/pkg/module/reverse_tunnel/tunnel"
	grpctool2 "github.com/pluralsh/kubernetes-agent/pkg/tool/grpctool"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/logz"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/retry"
	mock_modserver2 "github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_modserver"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_reverse_tunnel_tunnel"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/testhelpers"

	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/otel/trace"
	"go.uber.org/mock/gomock"
	"go.uber.org/zap"
	"go.uber.org/zap/zaptest"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/protobuf/types/known/durationpb"
)

func serverConstructComponents(ctx context.Context, t *testing.T) (func(context.Context) error, *grpc.ClientConn, *grpc.ClientConn, *mock_modserver2.MockAgentRpcApi, *mock_reverse_tunnel_tunnel.MockTracker) {
	log := zaptest.NewLogger(t)
	ctrl := gomock.NewController(t)
	mockApi := mock_modserver2.NewMockApi(ctrl)
	serverRpcApi := mock_modserver2.NewMockAgentRpcApi(ctrl)
	serverRpcApi.EXPECT().
		Log().
		Return(log).
		AnyTimes()
	serverRpcApi.EXPECT().
		PollWithBackoff(gomock.Any(), gomock.Any()).
		DoAndReturn(func(cfg retry.PollConfig, f retry.PollWithBackoffFunc) error {
			for {
				err, result := f()
				if result == retry.Done {
					return err
				}
			}
		}).
		MinTimes(1)
	tunnelTracker := mock_reverse_tunnel_tunnel.NewMockTracker(ctrl)
	agentServer := serverConstructAgentServer(ctx, serverRpcApi)
	agentServerListener := grpctool2.NewDialListener()

	internalListener := grpctool2.NewDialListener()
	tr := trace.NewNoopTracerProvider().Tracer("test")
	tunnelRegistry, err := tunnel.NewRegistry(log, mockApi, tr, time.Minute, time.Minute, tunnelTracker)
	require.NoError(t, err)

	internalServer := serverConstructInternalServer(ctx, log)
	internalServerConn, err := serverConstructInternalServerConn(internalListener.DialContext) // nolint: contextcheck
	require.NoError(t, err)

	serverFactory := reverse_tunnel_server.Factory{
		TunnelHandler: tunnelRegistry,
	}
	serverConfig := &modserver2.Config{
		Log: log,
		Config: &kascfg.ConfigurationFile{
			Agent: &kascfg.AgentCF{
				Listen: &kascfg.ListenAgentCF{
					MaxConnectionAge: durationpb.New(time.Minute),
				},
			},
		},
		AgentServer: agentServer,
		AgentConn:   internalServerConn,
	}
	serverModule, err := serverFactory.New(serverConfig)
	require.NoError(t, err)

	kasConn, err := serverConstructKasConnection(testhelpers.AgentkToken, agentServerListener.DialContext) // nolint: contextcheck
	require.NoError(t, err)

	registerTestingServer(internalServer, &serverTestingServer{
		tunnelFinder: tunnelRegistry,
	})

	return func(ctx context.Context) error {
		return stager.RunStages(ctx,
			// Start modules.
			func(stage stager.Stage) {
				stage.Go(serverModule.Run)
			},
			// Start gRPC servers.
			func(stage stager.Stage) {
				serverStartAgentServer(stage, agentServer, agentServerListener)
				serverStartInternalServer(stage, internalServer, internalListener)
			},
		)
	}, kasConn, internalServerConn, serverRpcApi, tunnelTracker
}

func serverConstructInternalServer(ctx context.Context, log *zap.Logger) *grpc.Server {
	_, sh := grpctool2.MaxConnectionAge2GrpcKeepalive(ctx, time.Minute)
	factory := func(ctx context.Context, fullMethodName string) modserver2.RpcApi {
		return &serverRpcApiForTest{
			RpcApiStub: modshared.RpcApiStub{
				StreamCtx: ctx,
				Logger:    log,
			},
		}
	}
	return grpc.NewServer(
		grpc.StatsHandler(sh),
		grpc.ForceServerCodec(grpctool2.RawCodec{}),
		grpc.ChainStreamInterceptor(
			modserver2.StreamRpcApiInterceptor(factory),
		),
		grpc.ChainUnaryInterceptor(
			modserver2.UnaryRpcApiInterceptor(factory),
		),
	)
}

func serverConstructInternalServerConn(dialContext func(ctx context.Context, addr string) (net.Conn, error)) (*grpc.ClientConn, error) {
	return grpc.DialContext(context.Background(), "passthrough:pipe",
		grpc.WithContextDialer(dialContext),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithChainStreamInterceptor(
			grpctool2.StreamClientValidatingInterceptor,
		),
		grpc.WithChainUnaryInterceptor(
			grpctool2.UnaryClientValidatingInterceptor,
		),
	)
}

func serverConstructKasConnection(agentToken api.AgentToken, dialContext func(ctx context.Context, addr string) (net.Conn, error)) (*grpc.ClientConn, error) {
	return grpc.DialContext(context.Background(), "passthrough:pipe",
		grpc.WithContextDialer(dialContext),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithPerRPCCredentials(grpctool2.NewTokenCredentials(agentToken, true)),
		grpc.WithChainStreamInterceptor(
			grpctool2.StreamClientValidatingInterceptor,
		),
		grpc.WithChainUnaryInterceptor(
			grpctool2.UnaryClientValidatingInterceptor,
		),
	)
}

func serverStartInternalServer(stage stager.Stage, internalServer *grpc.Server, internalListener net.Listener) {
	grpctool2.StartServer(stage, internalServer, func() (net.Listener, error) {
		return internalListener, nil
	}, func() {})
}

func serverConstructAgentServer(ctx context.Context, rpcApi modserver2.AgentRpcApi) *grpc.Server {
	kp, sh := grpctool2.MaxConnectionAge2GrpcKeepalive(ctx, time.Minute)
	factory := func(ctx context.Context, fullMethodName string) (modserver2.AgentRpcApi, error) {
		return rpcApi, nil
	}
	return grpc.NewServer(
		grpc.StatsHandler(sh),
		kp,
		grpc.ChainStreamInterceptor(
			grpc_validator.StreamServerInterceptor(),
			modserver2.StreamAgentRpcApiInterceptor(factory),
		),
		grpc.ChainUnaryInterceptor(
			grpc_validator.UnaryServerInterceptor(),
			modserver2.UnaryAgentRpcApiInterceptor(factory),
		),
	)
}

func serverStartAgentServer(stage stager.Stage, agentServer *grpc.Server, agentServerListener net.Listener) {
	grpctool2.StartServer(stage, agentServer, func() (net.Listener, error) {
		return agentServerListener, nil
	}, func() {})
}

type serverRpcApiForTest struct {
	modshared.RpcApiStub
}

func (a *serverRpcApiForTest) HandleProcessingError(log *zap.Logger, agentId int64, msg string, err error) {
	log.Error(msg, logz.Error(err))
}

func (a *serverRpcApiForTest) HandleIoError(log *zap.Logger, msg string, err error) error {
	log.Debug(msg, logz.Error(err))
	return grpctool2.HandleIoError(msg, err)
}
