package grpctool

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	"go.uber.org/zap/zaptest"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/credentials/insecure"
	"k8s.io/apimachinery/pkg/util/wait"

	test2 "github.com/pluralsh/kubernetes-agent/pkg/tool/grpctool/test"
)

var (
	_ credentials.PerRPCCredentials = &JwtCredentials{}
)

const (
	secret   = "dfjnfkadskfadsnfkjadsgkasdbg"
	audience = "fasfadsf"
	issuer   = "cbcxvbvxbxb"
)

func TestJwtCredentialsProducesValidToken(t *testing.T) {
	c := &JwtCredentials{
		Secret:   []byte(secret),
		Audience: audience,
		Issuer:   issuer,
		Insecure: true,
	}
	auther := NewJWTAuther([]byte(secret), issuer, audience, func(ctx context.Context) *zap.Logger {
		return zaptest.NewLogger(t)
	})
	listener := NewDialListener()

	srv := grpc.NewServer(
		grpc.ChainStreamInterceptor(
			auther.StreamServerInterceptor,
		),
		grpc.ChainUnaryInterceptor(
			auther.UnaryServerInterceptor,
		),
	)
	test2.RegisterTestingServer(srv, &test2.GrpcTestingServer{
		UnaryFunc: func(ctx context.Context, request *test2.Request) (*test2.Response, error) {
			return &test2.Response{
				Message: &test2.Response_Scalar{Scalar: 123},
			}, nil
		},
		StreamingFunc: func(server test2.Testing_StreamingRequestResponseServer) error {
			return server.Send(&test2.Response{
				Message: &test2.Response_Scalar{Scalar: 123},
			})
		},
	})
	var wg wait.Group
	defer wg.Wait()
	defer srv.GracefulStop()
	wg.Start(func() {
		assert.NoError(t, srv.Serve(listener))
	})
	conn, err := grpc.DialContext(context.Background(), "passthrough:pipe",
		grpc.WithContextDialer(listener.DialContext),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithPerRPCCredentials(c),
	)
	require.NoError(t, err)
	defer conn.Close()
	client := test2.NewTestingClient(conn)
	_, err = client.RequestResponse(context.Background(), &test2.Request{})
	require.NoError(t, err)
	stream, err := client.StreamingRequestResponse(context.Background())
	require.NoError(t, err)
	_, err = stream.Recv()
	require.NoError(t, err)
}
