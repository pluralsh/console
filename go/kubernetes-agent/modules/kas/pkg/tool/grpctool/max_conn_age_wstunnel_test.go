package grpctool

import (
	"context"
	"crypto/tls"
	"io"
	"net"
	"net/http"
	"testing"
	"time"

	"github.com/coder/websocket"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/keepalive"
	"google.golang.org/grpc/stats"
	"k8s.io/apimachinery/pkg/util/rand"
	"k8s.io/apimachinery/pkg/util/wait"

	test2 "github.com/pluralsh/kubernetes-agent/pkg/tool/grpctool/test"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/httpz"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/testhelpers"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/tlstool"
	wstunnel2 "github.com/pluralsh/kubernetes-agent/pkg/tool/wstunnel"
)

var (
	_ stats.Handler = serverMaxConnAgeStatsHandler{}
)

// These tests verify our understanding of how MaxConnectionAge and MaxConnectionAgeGrace work in gRPC
// and that our WebSocket tunneling works fine with it.

// TestMaxConnectionAgeValues just prints the values for debugging purposes.
func TestMaxConnectionAgeValues(t *testing.T) {
	grpcKeepalive, _ := maxConnectionAge2GrpcKeepalive(context.Background(), 30*time.Minute)
	t.Logf("30 minute MaxConnectionAge: %v, MaxConnectionAgeGrace: %v", grpcKeepalive.MaxConnectionAge, grpcKeepalive.MaxConnectionAgeGrace)
	grpcKeepalive, _ = maxConnectionAge2GrpcKeepalive(context.Background(), 2*time.Hour)
	t.Logf("2 hour MaxConnectionAge: %v, MaxConnectionAgeGrace: %v", grpcKeepalive.MaxConnectionAge, grpcKeepalive.MaxConnectionAgeGrace)
}

func TestMaxConnectionAge(t *testing.T) {
	t.Parallel()
	const maxAge = 3 * time.Second
	srv := &test2.GrpcTestingServer{
		StreamingFunc: func(server test2.Testing_StreamingRequestResponseServer) error {
			//start := time.Now()
			//ctx := server.Context()
			//<-ctx.Done()
			//t.Logf("ctx.Err() = %v after %s", ctx.Err(), time.Since(start))
			//return ctx.Err()
			time.Sleep(maxAge + maxAge*2/10) // +20%
			return nil
		},
	}
	testClient := func(t *testing.T, client test2.TestingClient) {
		start := time.Now()
		resp, err := client.StreamingRequestResponse(context.Background())
		require.NoError(t, err)
		_, err = resp.Recv()
		require.Equal(t, io.EOF, err, "%s. Elapsed: %s", err, time.Since(start))
	}
	kp := keepalive.ServerParameters{
		MaxConnectionAge:      maxAge,
		MaxConnectionAgeGrace: maxAge,
	}
	t.Run("gRPC", func(t *testing.T) {
		testKeepalive(t, false, false, kp, nil, srv, testClient)
	})
	t.Run("WebSocket", func(t *testing.T) {
		testKeepalive(t, true, true, kp, nil, srv, testClient)
	})
	t.Run("gRPC->WebSocket+gRPC", func(t *testing.T) {
		testKeepalive(t, false, true, kp, nil, srv, testClient)
	})
}

func TestMaxConnectionAgeAndMaxPollDuration(t *testing.T) {
	t.Parallel()
	const maxAge = 3 * time.Second
	srv := &test2.GrpcTestingServer{
		StreamingFunc: func(server test2.Testing_StreamingRequestResponseServer) error {
			<-MaxConnectionAgeContextFromStreamContext(server.Context()).Done()
			return nil
		},
	}
	testClient := func(t *testing.T, client test2.TestingClient) {
		start := time.Now()
		for i := 0; i < 3; i++ {
			reqStart := time.Now()
			resp, err := client.StreamingRequestResponse(context.Background())
			require.NoError(t, err)
			_, err = resp.Recv()
			assert.Equal(t, io.EOF, err, "%s. Request time: %s, overall time: %s", err, time.Since(reqStart), time.Since(start))
		}
	}

	kp, sh := maxConnectionAge2GrpcKeepalive(context.Background(), maxAge)
	t.Run("gRPC", func(t *testing.T) {
		testKeepalive(t, false, false, kp, sh, srv, testClient)
	})
	t.Run("WebSocket", func(t *testing.T) {
		testKeepalive(t, true, true, kp, sh, srv, testClient)
	})
	t.Run("gRPC->WebSocket+gRPC", func(t *testing.T) {
		testKeepalive(t, false, true, kp, sh, srv, testClient)
	})
}

func TestMaxConnectionAgeAndMaxPollDurationRandomizedSequential(t *testing.T) {
	t.Parallel()
	const maxAge = 3 * time.Second
	srv := &test2.GrpcTestingServer{
		StreamingFunc: func(server test2.Testing_StreamingRequestResponseServer) error {
			select {
			case <-MaxConnectionAgeContextFromStreamContext(server.Context()).Done():
			case <-time.After(time.Duration(rand.Int63nRange(0, int64(maxAge)))):
			}
			return nil
		},
	}
	testClient := func(t *testing.T, client test2.TestingClient) {
		for i := 0; i < 3; i++ {
			start := time.Now()
			resp, err := client.StreamingRequestResponse(context.Background())
			require.NoError(t, err)
			_, err = resp.Recv()
			require.Equal(t, io.EOF, err, "%s. Elapsed: %s", err, time.Since(start))
		}
	}

	kp, sh := maxConnectionAge2GrpcKeepalive(context.Background(), maxAge)
	t.Run("gRPC", func(t *testing.T) {
		testKeepalive(t, false, false, kp, sh, srv, testClient)
	})
	t.Run("WebSocket", func(t *testing.T) {
		testKeepalive(t, true, true, kp, sh, srv, testClient)
	})
	t.Run("gRPC->WebSocket+gRPC", func(t *testing.T) {
		testKeepalive(t, false, true, kp, sh, srv, testClient)
	})
}

func TestMaxConnectionAgeAndMaxPollDurationRandomizedParallel(t *testing.T) {
	t.Parallel()
	const maxAge = 3 * time.Second
	srv := &test2.GrpcTestingServer{
		StreamingFunc: func(server test2.Testing_StreamingRequestResponseServer) error {
			select {
			case <-MaxConnectionAgeContextFromStreamContext(server.Context()).Done():
			case <-time.After(time.Duration(rand.Int63nRange(0, int64(maxAge)))):
			}
			return nil
		},
	}
	testClient := func(t *testing.T, client test2.TestingClient) {
		var wg wait.Group
		defer wg.Wait()
		for i := 0; i < 10; i++ {
			wg.Start(func() {
				for j := 0; j < 3; j++ {
					time.Sleep(time.Duration(rand.Int63nRange(0, int64(maxAge)/10)))
					start := time.Now()
					resp, err := client.StreamingRequestResponse(context.Background())
					if !assert.NoError(t, err) {
						return
					}
					_, err = resp.Recv()
					assert.Equal(t, io.EOF, err, "%s. Elapsed: %s", err, time.Since(start))
				}
			})
		}
	}

	kp, sh := maxConnectionAge2GrpcKeepalive(context.Background(), maxAge)
	t.Run("gRPC", func(t *testing.T) {
		testKeepalive(t, false, false, kp, sh, srv, testClient)
	})
	t.Run("WebSocket", func(t *testing.T) {
		testKeepalive(t, true, true, kp, sh, srv, testClient)
	})
	t.Run("gRPC->WebSocket+gRPC", func(t *testing.T) {
		testKeepalive(t, false, true, kp, sh, srv, testClient)
	})
}

func TestMaxConnectionAgeUsesRPCContext(t *testing.T) {
	const maxAge = time.Minute
	var ageCtx context.Context
	srv := &test2.GrpcTestingServer{
		StreamingFunc: func(server test2.Testing_StreamingRequestResponseServer) error {
			ageCtx = MaxConnectionAgeContextFromStreamContext(server.Context())
			return nil
		},
	}
	kp, sh := maxConnectionAge2GrpcKeepalive(context.Background(), maxAge)
	testKeepalive(t, false, false, kp, sh, srv, func(t *testing.T, client test2.TestingClient) {
		resp, err := client.StreamingRequestResponse(context.Background()) // nolint: contextcheck
		require.NoError(t, err)
		_, err = resp.Recv()
		require.Equal(t, io.EOF, err)
		select {
		case <-ageCtx.Done():
		case <-time.After(1 * time.Second):
			t.Fail()
		}
	})
}

func TestWSTunnel_TLS(t *testing.T) {
	caCertFile, _, caCert, caKey := testhelpers.GenerateCACert(t)
	certFile, keyFile := testhelpers.GenerateCert(t, "srv", caCert, caKey)
	tlsConfig, err := tlstool.DefaultServerTLSConfig(certFile, keyFile)
	require.NoError(t, err)
	tlsConfig.NextProtos = []string{httpz.TLSNextProtoH2, httpz.TLSNextProtoH1}

	clientTLSConfig, err := tlstool.DefaultClientTLSConfigWithCACert(caCertFile)
	require.NoError(t, err)

	l, err := tls.Listen("tcp", "127.0.0.1:0", tlsConfig)
	require.NoError(t, err)

	lisWrapper := wstunnel2.ListenerWrapper{}
	l = lisWrapper.Wrap(l, true)

	s := grpc.NewServer()
	test2.RegisterTestingServer(s, &test2.GrpcTestingServer{
		UnaryFunc: func(ctx context.Context, r *test2.Request) (*test2.Response, error) {
			return &test2.Response{Message: &test2.Response_Scalar{Scalar: 42}}, nil
		},
	})
	defer s.GracefulStop()

	go func() {
		assert.NoError(t, s.Serve(l))
	}()

	t.Run("gRPC", func(t *testing.T) {
		conn, err := grpc.DialContext(
			context.Background(),
			"dns:"+l.Addr().String(),
			grpc.WithTransportCredentials(credentials.NewTLS(clientTLSConfig)),
		)
		require.NoError(t, err)
		defer func() {
			assert.NoError(t, conn.Close())
		}()
		c := test2.NewTestingClient(conn)
		resp, err := c.RequestResponse(context.Background(), &test2.Request{})
		require.NoError(t, err)
		assert.EqualValues(t, 42, resp.GetScalar())
	})
	t.Run("gRPC via WebSocket", func(t *testing.T) {
		conn, err := grpc.DialContext(
			context.Background(),
			"passthrough:wss://"+l.Addr().String(),
			grpc.WithContextDialer(wstunnel2.DialerForGRPC(0, &websocket.DialOptions{
				HTTPClient: &http.Client{
					Transport: &http.Transport{
						TLSClientConfig: clientTLSConfig,
					},
				},
			})),
			grpc.WithTransportCredentials(insecure.NewCredentials()),
		)
		require.NoError(t, err)
		defer func() {
			assert.NoError(t, conn.Close())
		}()
		c := test2.NewTestingClient(conn)
		resp, err := c.RequestResponse(context.Background(), &test2.Request{})
		require.NoError(t, err)
		assert.EqualValues(t, 42, resp.GetScalar())
	})
}

func TestWSTunnel_Cleartext(t *testing.T) {
	l, err := net.Listen("tcp", "127.0.0.1:0")
	require.NoError(t, err)

	lisWrapper := wstunnel2.ListenerWrapper{}
	l = lisWrapper.Wrap(l, false)

	s := grpc.NewServer()
	test2.RegisterTestingServer(s, &test2.GrpcTestingServer{
		UnaryFunc: func(ctx context.Context, r *test2.Request) (*test2.Response, error) {
			return &test2.Response{Message: &test2.Response_Scalar{Scalar: 42}}, nil
		},
	})
	defer s.GracefulStop()

	go func() {
		assert.NoError(t, s.Serve(l))
	}()

	t.Run("gRPC", func(t *testing.T) {
		conn, err := grpc.DialContext(
			context.Background(),
			"dns:"+l.Addr().String(),
			grpc.WithTransportCredentials(insecure.NewCredentials()),
		)
		require.NoError(t, err)
		defer func() {
			assert.NoError(t, conn.Close())
		}()
		c := test2.NewTestingClient(conn)
		resp, err := c.RequestResponse(context.Background(), &test2.Request{})
		require.NoError(t, err)
		assert.EqualValues(t, 42, resp.GetScalar())
	})
	t.Run("gRPC via WebSocket", func(t *testing.T) {
		conn, err := grpc.DialContext(
			context.Background(),
			"passthrough:ws://"+l.Addr().String(),
			grpc.WithContextDialer(wstunnel2.DialerForGRPC(0, &websocket.DialOptions{})),
			grpc.WithTransportCredentials(insecure.NewCredentials()),
		)
		require.NoError(t, err)
		defer func() {
			assert.NoError(t, conn.Close())
		}()
		c := test2.NewTestingClient(conn)
		resp, err := c.RequestResponse(context.Background(), &test2.Request{})
		require.NoError(t, err)
		assert.EqualValues(t, 42, resp.GetScalar())
	})
}

func testKeepalive(t *testing.T, webSocketClient, webSocketServer bool, kp keepalive.ServerParameters, sh stats.Handler, srv test2.TestingServer, f func(*testing.T, test2.TestingClient)) {
	t.Parallel()
	l, dial := listenerAndDialer(webSocketClient, webSocketServer)
	defer func() {
		assert.NoError(t, l.Close())
	}()
	opts := []grpc.ServerOption{grpc.KeepaliveParams(kp)}
	if sh != nil {
		opts = append(opts, grpc.StatsHandler(sh))
	}
	s := grpc.NewServer(opts...)
	defer s.GracefulStop()
	test2.RegisterTestingServer(s, srv)
	go func() {
		assert.NoError(t, s.Serve(l))
	}()
	conn, err := grpc.DialContext(
		context.Background(),
		"passthrough:ws://pipe",
		grpc.WithContextDialer(dial),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	require.NoError(t, err)
	defer func() {
		assert.NoError(t, conn.Close())
	}()
	f(t, test2.NewTestingClient(conn))
}

func listenerAndDialer(webSocketClient, webSocketServer bool) (net.Listener, func(context.Context, string) (net.Conn, error)) {
	dl := NewDialListener()
	var l net.Listener = dl
	d := dl.DialContext
	if webSocketServer {
		lisWrapper := wstunnel2.ListenerWrapper{}
		l = lisWrapper.Wrap(l, false)
	}
	if webSocketClient {
		d = wstunnel2.DialerForGRPC(0, &websocket.DialOptions{
			HTTPClient: &http.Client{
				Transport: &http.Transport{
					DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
						return dl.DialContext(ctx, addr)
					},
				},
			},
		})
	}
	return l, d
}
