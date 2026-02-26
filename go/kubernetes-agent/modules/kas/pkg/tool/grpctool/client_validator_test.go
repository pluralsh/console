package grpctool

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	test2 "github.com/pluralsh/kubernetes-agent/pkg/tool/grpctool/test"
)

func TestValidator(t *testing.T) {
	lis := NewDialListener()
	defer lis.Close()
	server := grpc.NewServer()
	defer server.GracefulStop()
	test2.RegisterTestingServer(server, &test2.GrpcTestingServer{
		UnaryFunc: func(ctx context.Context, request *test2.Request) (*test2.Response, error) {
			return &test2.Response{
				// invalid response because Message is not set
			}, nil
		},
		StreamingFunc: func(server test2.Testing_StreamingRequestResponseServer) error {
			return server.Send(&test2.Response{
				// invalid response because Message is not set
			})
		},
	})
	go func() {
		assert.NoError(t, server.Serve(lis))
	}()

	conn, err := grpc.DialContext(context.Background(), "passthrough:pipe",
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithChainStreamInterceptor(StreamClientValidatingInterceptor),
		grpc.WithChainUnaryInterceptor(UnaryClientValidatingInterceptor),
		grpc.WithContextDialer(lis.DialContext),
	)
	require.NoError(t, err)
	defer conn.Close()
	client := test2.NewTestingClient(conn)
	t.Run("invalid unary response", func(t *testing.T) {
		_, err = client.RequestResponse(context.Background(), &test2.Request{})
		assert.EqualError(t, err, "rpc error: code = InvalidArgument desc = invalid server response: invalid Response.Message: value is required")
	})
	t.Run("invalid streaming response", func(t *testing.T) {
		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()
		stream, err := client.StreamingRequestResponse(ctx)
		require.NoError(t, err)
		_, err = stream.Recv()
		assert.EqualError(t, err, "rpc error: code = InvalidArgument desc = invalid server response: invalid Response.Message: value is required")
	})
}
