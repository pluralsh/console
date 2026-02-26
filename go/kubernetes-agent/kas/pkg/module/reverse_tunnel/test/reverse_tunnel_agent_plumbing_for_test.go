package test

import (
	"context"
	"net"
	"testing"

	"github.com/ash2k/stager"
	grpc_validator "github.com/grpc-ecosystem/go-grpc-middleware/v2/interceptors/validator"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap/zaptest"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	"github.com/pluralsh/kubernetes-agent/pkg/module/modagent"
	reverse_tunnel_agent "github.com/pluralsh/kubernetes-agent/pkg/module/reverse_tunnel/agent"
	grpctool2 "github.com/pluralsh/kubernetes-agent/pkg/tool/grpctool"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_modagent"
)

func agentConstructComponents(ctx context.Context, t *testing.T, kasConn grpc.ClientConnInterface, agentApi *mock_modagent.MockApi) (func(context.Context) error, *grpc.Server) {
	log := zaptest.NewLogger(t)
	internalListener := grpctool2.NewDialListener()
	internalServer := agentConstructInternalServer(ctx)
	internalServerConn, err := agentConstructInternalServerConn(internalListener.DialContext) // nolint: contextcheck
	require.NoError(t, err)
	t.Cleanup(func() {
		assert.NoError(t, internalServerConn.Close())
	})

	f := reverse_tunnel_agent.Factory{
		InternalServerConn: internalServerConn,
	}
	config := &modagent.Config{
		Log:     log,
		Api:     agentApi,
		KasConn: kasConn,
		Server:  internalServer,
	}
	m, err := f.New(config)
	require.NoError(t, err)
	return func(ctx context.Context) error {
		return stager.RunStages(ctx,
			// Start modules.
			func(stage stager.Stage) {
				stage.Go(func(ctx context.Context) error {
					return m.Run(ctx, nil)
				})
			},
			func(stage stager.Stage) {
				// Start internal gRPC server.
				agentStartInternalServer(stage, internalServer, internalListener)
			},
		)
	}, internalServer
}

func agentConstructInternalServer(ctx context.Context) *grpc.Server {
	return grpc.NewServer(
		grpc.StatsHandler(grpctool2.NewServerMaxConnAgeStatsHandler(ctx, 0)),
		grpc.ChainStreamInterceptor(
			grpc_validator.StreamServerInterceptor(),
		),
		grpc.ChainUnaryInterceptor(
			grpc_validator.UnaryServerInterceptor(),
		),
	)
}

func agentStartInternalServer(stage stager.Stage, internalServer *grpc.Server, internalListener net.Listener) {
	grpctool2.StartServer(stage, internalServer, func() (net.Listener, error) {
		return internalListener, nil
	}, func() {})
}

func agentConstructInternalServerConn(dialContext func(ctx context.Context, addr string) (net.Conn, error)) (*grpc.ClientConn, error) {
	return grpc.DialContext(context.Background(), "passthrough:pipe",
		grpc.WithContextDialer(dialContext),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithDefaultCallOptions(grpc.ForceCodec(grpctool2.RawCodec{})),
	)
}
