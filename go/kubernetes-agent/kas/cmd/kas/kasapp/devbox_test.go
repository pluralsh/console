package kasapp

import (
	"bufio"
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/ash2k/stager"
	"github.com/coder/websocket"
	"github.com/getsentry/sentry-go"
	"github.com/golang-jwt/jwt/v5"
	"github.com/gqlgo/gqlgenc/clientv2"
	grpc_auth "github.com/grpc-ecosystem/go-grpc-middleware/v2/interceptors/auth"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/redis/rueidis"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	metricnoop "go.opentelemetry.io/otel/metric/noop"
	"go.opentelemetry.io/otel/propagation"
	tracenoop "go.opentelemetry.io/otel/trace/noop"
	"go.uber.org/zap"
	"go.uber.org/zap/zaptest"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/durationpb"

	"github.com/pluralsh/console/go/kubernetes-agent/pkg/api"
	devboxv1 "github.com/pluralsh/console/go/kubernetes-agent/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/kascfg"
	devbox_server "github.com/pluralsh/console/go/kubernetes-agent/pkg/module/devbox/server"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/module/modagent"
	modserver2 "github.com/pluralsh/console/go/kubernetes-agent/pkg/module/modserver"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/module/modshared"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/module/observability"
	reverse_tunnel_agent "github.com/pluralsh/console/go/kubernetes-agent/pkg/module/reverse_tunnel/agent"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/module/reverse_tunnel/rpc"
	grpctool2 "github.com/pluralsh/console/go/kubernetes-agent/pkg/tool/grpctool"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/tool/retry"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/tool/uuid"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/tool/wstunnel"
)

const (
	// Tunnels are keyed by the first 8 bytes of the cluster UUID (uuid.ToInt64), so these differ there.
	devboxClusterA       = "aaaaaaaa-0000-4000-8000-000000000001"
	devboxClusterB       = "bbbbbbbb-0000-4000-8000-000000000002"
	devboxClusterOffline = "ffffffff-0000-4000-8000-000000000003"

	devboxTokenA api.AgentToken = "deploy-token-a"
	devboxTokenB api.AgentToken = "deploy-token-b"

	devboxStreamKey = "devbox-stream-key"
)

func TestDevbox_ControlRoutesToClusterGatewayAcrossReplicas(t *testing.T) {
	h := newDevboxHarness(t)
	kas1 := h.startReplica("kas-1")
	kas2 := h.startReplica("kas-2")
	gwA := h.startGateway(kas1, devboxTokenA, "gateway-a", nil)
	gwB := h.startGateway(kas2, devboxTokenB, "gateway-b", nil)
	h.waitForTunnel(kas1, devboxClusterA)
	h.waitForTunnel(kas2, devboxClusterB)

	for _, kas := range []*devboxReplica{kas1, kas2} {
		for cluster, want := range map[string]string{devboxClusterA: "gateway-a", devboxClusterB: "gateway-b"} {
			t.Run(fmt.Sprintf("%s to %s", kas.name, want), func(t *testing.T) {
				ctx := controlCtx(t, cluster)
				resp, err := devboxv1.NewControlClient(kas.controlConn).CreateInstance(ctx, &devboxv1.CreateInstanceRequest{InstanceId: "inst-1"})
				require.NoError(t, err)
				assert.Equal(t, want, resp.ActorId)
				assert.Equal(t, "inst-1", resp.InstanceId)
			})
		}
	}

	md := gwA.lastMetadata()
	assert.Equal(t, []string{devboxClusterA}, md.Get(devboxv1.ClusterIDMetadataKey))
	assert.Equal(t, []string{"value"}, md.Get("x-custom"))
	assert.Empty(t, md.Get("authorization"), "console's JWT must not reach the gateway")
	assert.Empty(t, md.Get(modserver2.RoutingAgentIdMetadataKey))
	assert.Equal(t, []string{devboxClusterB}, gwB.lastMetadata().Get(devboxv1.ClusterIDMetadataKey))

	t.Run("gateway error with details passes through", func(t *testing.T) {
		_, err := devboxv1.NewControlClient(kas2.controlConn).SuspendInstance(controlCtx(t, devboxClusterA), &devboxv1.InstanceActionRequest{InstanceId: "inst-1"})
		st := status.Convert(err)
		assert.Equal(t, codes.FailedPrecondition, st.Code())
		require.Len(t, st.Details(), 1)
		assert.Equal(t, devboxv1.ErrorReason_ERROR_REASON_UNSUPPORTED, st.Details()[0].(*devboxv1.ErrorDetail).Reason)
	})
}

func TestDevbox_ControlClusterOffline(t *testing.T) {
	h := newDevboxHarness(t)
	kas1 := h.startReplica("kas-1")
	client := devboxv1.NewControlClient(kas1.controlConn)

	t.Run("no tunnel registered", func(t *testing.T) {
		start := time.Now()
		_, err := client.CreateInstance(controlCtx(t, devboxClusterOffline), &devboxv1.CreateInstanceRequest{InstanceId: "i"})
		assertClusterOffline(t, err)
		assert.Less(t, time.Since(start), time.Second, "offline clusters should fail without waiting for the routing timeout")
	})

	t.Run("tunnel without the method times out as offline", func(t *testing.T) {
		h.startGateway(kas1, devboxTokenA, "gateway-a", &grpc.ServiceDesc{
			ServiceName: devboxv1.Gateway_ServiceDesc.ServiceName,
			HandlerType: (*any)(nil),
			Streams: []grpc.StreamDesc{{
				StreamName:    "ProxyStream",
				Handler:       func(any, grpc.ServerStream) error { return nil },
				ServerStreams: true,
				ClientStreams: true,
			}},
		})
		h.waitForTunnel(kas1, devboxClusterA)
		_, err := client.CreateInstance(controlCtx(t, devboxClusterA), &devboxv1.CreateInstanceRequest{InstanceId: "i"})
		assertClusterOffline(t, err)
	})

	t.Run("missing cluster id", func(t *testing.T) {
		_, err := client.CreateInstance(context.Background(), &devboxv1.CreateInstanceRequest{InstanceId: "i"})
		assert.Equal(t, codes.InvalidArgument, status.Code(err))
	})

	t.Run("invalid cluster id", func(t *testing.T) {
		_, err := client.CreateInstance(controlCtx(t, "not-a-uuid"), &devboxv1.CreateInstanceRequest{InstanceId: "i"})
		assert.Equal(t, codes.InvalidArgument, status.Code(err))
	})

	t.Run("console must authenticate", func(t *testing.T) {
		conn, err := grpc.NewClient("passthrough:pipe",
			grpc.WithContextDialer(kas1.apiListener.DialContext),
			grpc.WithTransportCredentials(insecure.NewCredentials()),
		)
		require.NoError(t, err)
		defer conn.Close() // nolint: errcheck
		_, err = devboxv1.NewControlClient(conn).CreateInstance(controlCtx(t, devboxClusterA), &devboxv1.CreateInstanceRequest{InstanceId: "i"})
		assert.Equal(t, codes.Unauthenticated, status.Code(err))
	})
}

func TestDevbox_GatewayAuthFailure(t *testing.T) {
	h := newDevboxHarness(t)
	kas1 := h.startReplica("kas-1")
	conn := h.gatewayConn(kas1, "not-a-deploy-token")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	tunnel, err := devboxv1.NewTunnelClient(conn).Connect(ctx)
	require.NoError(t, err)
	_, err = tunnel.Recv()
	assert.Equal(t, codes.Unauthenticated, status.Code(err))

	_, err = devboxv1.NewIngestClient(conn).Heartbeat(ctx, &devboxv1.HeartbeatRequest{GatewayId: "g"})
	assert.Equal(t, codes.Unauthenticated, status.Code(err))
	assert.Empty(t, h.console.calls(), "unauthenticated calls must not reach console")
}

func TestDevbox_IngestOverwritesClusterId(t *testing.T) {
	h := newDevboxHarness(t)
	kas1 := h.startReplica("kas-1")
	conn := h.gatewayConn(kas1, devboxTokenA)

	ctx := metadata.AppendToOutgoingContext(context.Background(),
		devboxv1.ClusterIDMetadataKey, devboxClusterB, // a gateway trying to speak for another cluster
		"x-custom", "value",
	)
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	resp, err := devboxv1.NewIngestClient(conn).Heartbeat(ctx, &devboxv1.HeartbeatRequest{
		GatewayId: "gateway-a",
		Instances: []*devboxv1.InstanceHeartbeat{{InstanceId: "inst-1"}},
	})
	require.NoError(t, err)
	assert.Equal(t, []string{"inst-1"}, resp.UnknownInstanceIds)

	calls := h.console.calls()
	require.Len(t, calls, 1)
	call := calls[0]
	assert.Equal(t, "gateway-a", call.gatewayId)
	assert.Equal(t, []string{devboxClusterA}, call.md.Get(devboxv1.ClusterIDMetadataKey))
	assert.Equal(t, []string{"value"}, call.md.Get("x-custom"))
	assert.NoError(t, call.authErr, "console must accept KAS's JWT")
	assert.NotContains(t, call.authorization, string(devboxTokenA), "the deploy token must not reach console")
}

func TestDevbox_StreamProxy(t *testing.T) {
	h := newDevboxHarness(t)
	kas1 := h.startReplica("kas-1")
	kas2 := h.startReplica("kas-2")
	gw := h.startGateway(kas1, devboxTokenA, "gateway-a", nil)
	h.waitForTunnel(kas1, devboxClusterA)

	t.Run("plain request on another replica", func(t *testing.T) {
		token := mintDevboxStreamToken(t, nil)
		u := fmt.Sprintf("http://%s/ext/devbox/streams/stream-1/preview/app.js?token=%s&q=1", kas2.devboxAddr, url.QueryEscape(token))
		resp, err := http.Get(u) // nolint: noctx
		require.NoError(t, err)
		defer resp.Body.Close() // nolint: errcheck
		body, err := io.ReadAll(resp.Body)
		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, resp.StatusCode, string(body))
		assert.Equal(t, "gateway-a /preview/app.js", string(body))
		assert.Equal(t, "yes", resp.Header.Get("X-Gateway"))

		req := gw.lastStreamRequest()
		require.NotNil(t, req)
		assert.Equal(t, "/preview/app.js", req.line.UrlPath)
		assert.Contains(t, req.line.Query, "q")
		assert.NotContains(t, req.line.Query, "token", "the stream token must not reach the gateway")
		assert.Equal(t, []string{"inst-1"}, req.md.Get(devboxv1.InstanceIDMetadataKey))
		assert.Equal(t, []string{"stream-1"}, req.md.Get(devboxv1.StreamIDMetadataKey))
		assert.Equal(t, []string{devboxClusterA}, req.md.Get(devboxv1.ClusterIDMetadataKey))
		assert.Empty(t, req.md.Get("authorization"))
	})

	t.Run("upgraded bidi stream", func(t *testing.T) {
		token := mintDevboxStreamToken(t, nil)
		conn, err := net.Dial("tcp", kas2.devboxAddr)
		require.NoError(t, err)
		defer conn.Close() // nolint: errcheck
		require.NoError(t, conn.SetDeadline(time.Now().Add(10*time.Second)))
		_, err = fmt.Fprintf(conn, "GET /ext/devbox/streams/stream-1?instance=inst-1 HTTP/1.1\r\nHost: kas\r\n"+
			"Authorization: Bearer %s\r\nConnection: Upgrade\r\nUpgrade: echo\r\n\r\n", token)
		require.NoError(t, err)
		br := bufio.NewReader(conn)
		resp, err := http.ReadResponse(br, nil)
		require.NoError(t, err)
		require.Equal(t, http.StatusSwitchingProtocols, resp.StatusCode)
		for _, msg := range []string{"ping", "pong-pong"} {
			_, err = conn.Write([]byte(msg))
			require.NoError(t, err)
			buf := make([]byte, len(msg))
			_, err = io.ReadFull(br, buf)
			require.NoError(t, err)
			assert.Equal(t, msg, string(buf))
		}
	})

	t.Run("binary websocket subprotocol", func(t *testing.T) {
		token := mintDevboxStreamToken(t, nil)
		conn, err := net.Dial("tcp", kas2.devboxAddr)
		require.NoError(t, err)
		defer conn.Close() // nolint: errcheck
		require.NoError(t, conn.SetDeadline(time.Now().Add(10*time.Second)))
		_, err = fmt.Fprintf(conn, "GET /ext/devbox/streams/stream-1?instance=inst-1 HTTP/1.1\r\nHost: kas\r\n"+
			"Authorization: Bearer %s\r\nConnection: Upgrade\r\nUpgrade: websocket\r\nSec-WebSocket-Protocol: binary\r\n\r\n", token)
		require.NoError(t, err)
		br := bufio.NewReader(conn)
		resp, err := http.ReadResponse(br, nil)
		require.NoError(t, err)
		require.Equal(t, http.StatusSwitchingProtocols, resp.StatusCode)
		assert.Equal(t, "binary", resp.Header.Get("Sec-WebSocket-Protocol"))
		frame := []byte{0x00, 0xff, 0x01, 0x10}
		_, err = conn.Write(frame)
		require.NoError(t, err)
		buf := make([]byte, len(frame))
		_, err = io.ReadFull(br, buf)
		require.NoError(t, err)
		assert.Equal(t, frame, buf)
	})
}

func TestDevbox_StreamTokenRejected(t *testing.T) {
	h := newDevboxHarness(t)
	kas1 := h.startReplica("kas-1")
	h.startGateway(kas1, devboxTokenA, "gateway-a", nil)
	h.waitForTunnel(kas1, devboxClusterA)

	tests := []struct {
		name  string
		path  string
		token string
		want  int
	}{
		{name: "missing token", path: "/ext/devbox/streams/stream-1", want: http.StatusUnauthorized},
		{name: "expired", path: "/ext/devbox/streams/stream-1", want: http.StatusUnauthorized, token: mintDevboxStreamToken(t, func(c jwt.MapClaims) {
			c["exp"] = time.Now().Add(-time.Minute).Unix()
		})},
		{name: "wrong key", path: "/ext/devbox/streams/stream-1", want: http.StatusUnauthorized, token: signDevboxStreamToken(t, "other-key", nil)},
		{name: "wrong stream", path: "/ext/devbox/streams/stream-2", want: http.StatusForbidden, token: mintDevboxStreamToken(t, nil)},
		{name: "wrong instance", path: "/ext/devbox/streams/stream-1?instance=inst-2", want: http.StatusForbidden, token: mintDevboxStreamToken(t, nil)},
		{name: "cluster offline", path: "/ext/devbox/streams/stream-1", want: http.StatusServiceUnavailable, token: mintDevboxStreamToken(t, func(c jwt.MapClaims) {
			c["cluster_id"] = devboxClusterOffline
		})},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req, err := http.NewRequest(http.MethodGet, "http://"+kas1.devboxAddr+tc.path, nil) // nolint: noctx
			require.NoError(t, err)
			if tc.token != "" {
				req.Header.Set("Authorization", "Bearer "+tc.token)
			}
			resp, err := http.DefaultClient.Do(req)
			require.NoError(t, err)
			_ = resp.Body.Close()
			assert.Equal(t, tc.want, resp.StatusCode)
		})
	}
}

func TestDevbox_ConfigFromChart(t *testing.T) {
	dir := t.TempDir()
	file := filepath.Join(dir, "config.yaml")
	// Mirrors the devbox section charts/console/templates/kas/configmap.yaml renders.
	require.NoError(t, os.WriteFile(file, []byte(`
redis:
  server:
    address: "redis:6379"
api:
  listen:
    address: ":8153"
    authentication_secret_file: "/etc/kas/.api_secret"
private_api:
  listen:
    address: ":8155"
    authentication_secret_file: "/etc/kas/.privateapi_secret"
devbox:
  listen:
    address: ":8156"
    connections_per_token_per_minute: 100000
  url_path_prefix: "/ext/devbox/"
  console:
    address: "console.plrl-console:50051"
  streams:
    token_secret_file: "/etc/kas/devbox_stream_token"
`), 0o600))
	cfg, err := LoadConfigurationFile(file)
	require.NoError(t, err)
	ApplyDefaultsToKasConfigurationFile(cfg)
	require.NoError(t, cfg.ValidateAll())
	d := cfg.Devbox
	assert.Equal(t, "/ext/devbox", d.UrlPathPrefix)
	assert.Equal(t, "/etc/kas/.api_secret", d.Console.AuthenticationSecretFile)
	assert.Equal(t, devbox_server.DefaultStreamTokenAudience, d.Streams.TokenAudience)
	assert.Equal(t, 10*time.Second, d.RoutingTimeout.AsDuration())
	assert.EqualValues(t, 100000, d.Listen.ConnectionsPerTokenPerMinute)
}

func assertClusterOffline(t *testing.T, err error) {
	t.Helper()
	st := status.Convert(err)
	require.Equal(t, codes.Unavailable, st.Code(), st.Message())
	require.Len(t, st.Details(), 1)
	detail, ok := st.Details()[0].(*devboxv1.ErrorDetail)
	require.True(t, ok)
	assert.Equal(t, devboxv1.ErrorReason_ERROR_REASON_CLUSTER_OFFLINE, detail.Reason)
}

func controlCtx(t *testing.T, clusterId string) context.Context {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	t.Cleanup(cancel)
	return metadata.AppendToOutgoingContext(ctx, devboxv1.ClusterIDMetadataKey, clusterId, "x-custom", "value")
}

func mintDevboxStreamToken(t *testing.T, mutate func(jwt.MapClaims)) string {
	return signDevboxStreamToken(t, devboxStreamKey, mutate)
}

func signDevboxStreamToken(t *testing.T, key string, mutate func(jwt.MapClaims)) string {
	now := time.Now()
	claims := jwt.MapClaims{
		"sub":         "user-1",
		"aud":         devbox_server.DefaultStreamTokenAudience,
		"iss":         "https://console.example.com",
		"iat":         now.Unix(),
		"exp":         now.Add(5 * time.Minute).Unix(),
		"jti":         "jti-1",
		"cluster_id":  devboxClusterA,
		"cluster":     devboxClusterA,
		"instance_id": "inst-1",
		"instance":    "inst-1",
		"stream_id":   "stream-1",
		"kind":        "preview",
	}
	if mutate != nil {
		mutate(claims)
	}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(key))
	require.NoError(t, err)
	return token
}

// ---------------------------------------------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------------------------------------------

type devboxHarness struct {
	t                    *testing.T
	redis                *miniredis.Miniredis
	apiSecret            []byte
	apiSecretFile        string
	privateApiSecretFile string
	streamKeyFile        string
	console              *fakeDevboxConsole
	consoleAddr          string
	clusters             map[api.AgentToken]string
}

func newDevboxHarness(t *testing.T) *devboxHarness {
	dir := t.TempDir()
	apiSecret := []byte("0123456789abcdef0123456789abcdef")
	writeFile := func(name string, data []byte) string {
		p := filepath.Join(dir, name)
		require.NoError(t, os.WriteFile(p, data, 0o600))
		return p
	}
	h := &devboxHarness{
		t:                    t,
		redis:                miniredis.RunT(t),
		apiSecret:            apiSecret,
		apiSecretFile:        writeFile("api_secret", []byte(base64.StdEncoding.EncodeToString(apiSecret))),
		privateApiSecretFile: writeFile("private_api_secret", []byte(base64.StdEncoding.EncodeToString([]byte("private-api-secret-private-api-s")))),
		streamKeyFile:        writeFile("stream_key", []byte(devboxStreamKey+"\n")),
		clusters: map[api.AgentToken]string{
			devboxTokenA: devboxClusterA,
			devboxTokenB: devboxClusterB,
		},
	}
	h.console = &fakeDevboxConsole{secret: apiSecret}
	lis, err := net.Listen("tcp", "127.0.0.1:0")
	require.NoError(t, err)
	srv := grpc.NewServer()
	devboxv1.RegisterIngestServer(srv, h.console)
	go func() {
		_ = srv.Serve(lis)
	}()
	t.Cleanup(srv.Stop)
	h.consoleAddr = lis.Addr().String()
	return h
}

type devboxReplica struct {
	name        string
	devbox      *devboxServer
	devboxAddr  string
	apiListener *grpctool2.DialListener
	controlConn *grpc.ClientConn
}

func (h *devboxHarness) startReplica(name string) *devboxReplica {
	t := h.t
	log := zaptest.NewLogger(t).Named(name)
	privateApiAddr := freeTCPAddr(t)
	devboxAddr := freeTCPAddr(t)
	cfg := &kascfg.ConfigurationFile{
		Redis: &kascfg.RedisCF{
			RedisConfig: &kascfg.RedisCF_Server{Server: &kascfg.RedisServerCF{Address: h.redis.Addr()}},
		},
		Api: &kascfg.ApiCF{Listen: &kascfg.ListenApiCF{AuthenticationSecretFile: h.apiSecretFile}},
		PrivateApi: &kascfg.PrivateApiCF{Listen: &kascfg.ListenPrivateApiCF{
			Address:                  privateApiAddr,
			AuthenticationSecretFile: h.privateApiSecretFile,
			ListenGracePeriod:        durationpb.New(time.Millisecond),
		}},
		Devbox: &kascfg.DevboxCF{
			Listen: &kascfg.ListenDevboxCF{
				Address:           devboxAddr,
				ListenGracePeriod: durationpb.New(time.Millisecond),
			},
			Console:        &kascfg.DevboxConsoleCF{Address: h.consoleAddr},
			Streams:        &kascfg.DevboxStreamsCF{TokenSecretFile: h.streamKeyFile},
			RoutingTimeout: durationpb.New(time.Second),
		},
	}
	ApplyDefaultsToKasConfigurationFile(cfg)

	redisClient, err := rueidis.NewClient(rueidis.ClientOption{InitAddress: []string{h.redis.Addr()}, DisableCache: true})
	require.NoError(t, err)
	t.Cleanup(redisClient.Close)

	tp := tracenoop.NewTracerProvider()
	mp := metricnoop.NewMeterProvider()
	p := propagation.TraceContext{}
	reg := prometheus.NewPedanticRegistry()
	ssh := grpctool2.NewServerRequestsInFlightStatsHandler()
	csh := grpctool2.NewClientRequestsInFlightStatsHandler()
	sentryHub := sentry.NewHub(nil, sentry.NewScope())
	srvApi := newServerApi(log, sentryHub, redisClient)
	errRep := modshared.ApiToErrReporter(srvApi)
	errReporter := &serverErrorReporter{log: log, errReporter: errRep}
	rpcApiFactory := (&serverRpcApiFactory{log: log, sentryHub: sentryHub}).New
	agentRpcApiFactory := func(ctx context.Context, fullMethodName string) (modserver2.AgentRpcApi, error) {
		token, err := grpc_auth.AuthFromMD(ctx, "bearer") // nolint: govet
		if err != nil {
			return nil, err
		}
		return &fakeDevboxAgentRpcApi{
			RpcApi:   rpcApiFactory(ctx, fullMethodName),
			token:    api.AgentToken(token),
			clusters: h.clusters,
		}, nil
	}
	probeRegistry := observability.NewProbeRegistry()

	t.Setenv(envVarOwnPrivateApiUrl, "grpc://"+privateApiAddr)
	privateApiSrv, err := newPrivateApiServer(log, errRep, cfg, tp, mp, p, csh, ssh, rpcApiFactory, probeRegistry,
		passStream, passUnary, passStreamClient, passUnaryClient, errReporter)
	require.NoError(t, err)
	internalSrv, err := newInternalServer(tp, mp, p, rpcApiFactory, probeRegistry, errReporter)
	require.NoError(t, err)
	t.Cleanup(func() { _ = internalSrv.inMemConn.Close() })
	apiSrv, err := newApiServer(log, cfg, tp, mp, p, ssh, rpcApiFactory, probeRegistry, passStream, passUnary, errReporter)
	require.NoError(t, err)

	pollConfig := retry.NewPollConfigFactory(routingAttemptInterval, retry.NewExponentialBackoffFactory(
		routingInitBackoff, routingMaxBackoff, routingResetDuration, routingBackoffFactor, routingJitter))
	devboxSrv, err := newDevboxServer(log, cfg, srvApi, tp.Tracer("t"), mp.Meter("m"), tp, mp, redisClient, ssh,
		agentRpcApiFactory, probeRegistry, reg, passStream, passUnary, errReporter,
		privateApiSrv.kasPool, privateApiSrv.ownUrl, internalSrv.server, privateApiSrv, pollConfig)
	require.NoError(t, err)

	module, err := (&devbox_server.Factory{
		GatewayServer:     devboxSrv.server,
		TunnelHandler:     devboxSrv.tunnelRegistry,
		TunnelQuerier:     devboxSrv.tunnelRegistry,
		GatewayConn:       internalSrv.inMemConn,
		SetStreamsHandler: devboxSrv.setStreamsHandler,
	}).New(&modserver2.Config{
		Log:             log,
		Api:             srvApi,
		Config:          cfg,
		Registerer:      reg,
		ApiServer:       apiSrv.server,
		TraceProvider:   tp,
		TracePropagator: p,
		MeterProvider:   mp,
		RedisClient:     redisClient,
		KasName:         kasName,
	})
	require.NoError(t, err)

	apiListener := grpctool2.NewDialListener()
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() {
		done <- stager.RunStages(ctx,
			func(stage stager.Stage) {
				stage.Go(module.Run)
			},
			func(stage stager.Stage) {
				internalSrv.Start(stage)
			},
			func(stage stager.Stage) {
				privateApiSrv.Start(stage)
				devboxSrv.Start(stage)
				grpctool2.StartServer(stage, apiSrv.server, func() (net.Listener, error) {
					return apiListener, nil
				}, func() {})
			},
		)
	}()
	t.Cleanup(func() {
		cancel()
		select {
		case err := <-done: // nolint: govet
			assert.NoError(t, err)
		case <-time.After(20 * time.Second):
			t.Errorf("%s did not stop", name)
		}
	})

	controlConn, err := grpc.NewClient("passthrough:pipe",
		grpc.WithContextDialer(apiListener.DialContext),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithPerRPCCredentials(&grpctool2.JwtCredentials{
			Secret:   h.apiSecret,
			Audience: kasName,
			Issuer:   "plural-console",
			Insecure: true,
		}),
	)
	require.NoError(t, err)
	t.Cleanup(func() { _ = controlConn.Close() })

	require.Eventually(t, func() bool {
		c, err := net.Dial("tcp", devboxAddr) // nolint: govet
		if err != nil {
			return false
		}
		_ = c.Close()
		return true
	}, 10*time.Second, 10*time.Millisecond)

	return &devboxReplica{
		name:        name,
		devbox:      devboxSrv,
		devboxAddr:  devboxAddr,
		apiListener: apiListener,
		controlConn: controlConn,
	}
}

func (h *devboxHarness) gatewayConn(kas *devboxReplica, token api.AgentToken) *grpc.ClientConn {
	conn, err := grpc.NewClient("passthrough:///ws://"+kas.devboxAddr+"/ext/devbox",
		grpc.WithContextDialer(wstunnel.DialerForGRPC(0, &websocket.DialOptions{})),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithPerRPCCredentials(grpctool2.NewTokenCredentials(token, true)),
	)
	require.NoError(h.t, err)
	h.t.Cleanup(func() { _ = conn.Close() })
	return conn
}

// startGateway runs a devbox-gateway stand-in: a gRPC server with Gateway (or desc, if set) reachable through
// reverse tunnels registered with kas, using agentk's tunnel client against devbox.v1.Tunnel/Connect.
func (h *devboxHarness) startGateway(kas *devboxReplica, token api.AgentToken, name string, desc *grpc.ServiceDesc) *fakeDevboxGateway {
	t := h.t
	gw := &fakeDevboxGateway{t: t, name: name}
	server := grpc.NewServer()
	if desc != nil {
		server.RegisterService(desc, nil)
	} else {
		devboxv1.RegisterGatewayServer(server, gw)
	}
	lis := grpctool2.NewDialListener()
	go func() {
		_ = server.Serve(lis)
	}()
	t.Cleanup(server.Stop)
	internalConn, err := grpc.NewClient("passthrough:pipe",
		grpc.WithContextDialer(lis.DialContext),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithDefaultCallOptions(grpc.ForceCodec(grpctool2.RawCodec{})),
	)
	require.NoError(t, err)
	t.Cleanup(func() { _ = internalConn.Close() })

	m, err := (&reverse_tunnel_agent.Factory{InternalServerConn: internalConn}).New(&modagent.Config{
		Log:     zaptest.NewLogger(t).Named(name),
		KasConn: devboxTunnelConn{h.gatewayConn(kas, token)},
		Server:  server,
	})
	require.NoError(t, err)
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() {
		defer close(done)
		_ = m.Run(ctx, nil)
	}()
	t.Cleanup(func() {
		cancel()
		<-done
	})
	return gw
}

func (h *devboxHarness) waitForTunnel(kas *devboxReplica, clusterId string) {
	agentId, err := uuid.ToInt64(clusterId)
	require.NoError(h.t, err)
	require.Eventually(h.t, func() bool {
		urls, err := kas.devbox.tunnelRegistry.KasUrlsByAgentId(context.Background(), agentId) // nolint: govet
		return err == nil && len(urls) > 0
	}, 15*time.Second, 20*time.Millisecond)
}

// devboxTunnelConn points agentk's reverse tunnel client at devbox.v1.Tunnel/Connect, which uses the same frames.
type devboxTunnelConn struct {
	grpc.ClientConnInterface
}

func (c devboxTunnelConn) NewStream(ctx context.Context, desc *grpc.StreamDesc, method string, opts ...grpc.CallOption) (grpc.ClientStream, error) {
	if method == rpc.ReverseTunnel_Connect_FullMethodName {
		method = devboxv1.Tunnel_Connect_FullMethodName
	}
	return c.ClientConnInterface.NewStream(ctx, desc, method, opts...)
}

type fakeDevboxAgentRpcApi struct {
	modserver2.RpcApi
	token    api.AgentToken
	clusters map[api.AgentToken]string
}

func (a *fakeDevboxAgentRpcApi) AgentToken() api.AgentToken {
	return a.token
}

func (a *fakeDevboxAgentRpcApi) AgentInfo(ctx context.Context, log *zap.Logger) (*api.AgentInfo, error) {
	clusterId, ok := a.clusters[a.token]
	if !ok {
		// What gqlgenc returns when console rejects the deploy token.
		return nil, &clientv2.ErrorResponse{NetworkError: &clientv2.HTTPError{Code: http.StatusUnauthorized, Message: "unauthorized"}}
	}
	id, err := uuid.ToInt64(clusterId)
	if err != nil {
		return nil, err
	}
	return &api.AgentInfo{Id: id, ClusterId: clusterId, Name: "cluster"}, nil
}

type fakeStreamRequest struct {
	md   metadata.MD
	line *devboxv1.HttpRequestLine
}

type fakeDevboxGateway struct {
	devboxv1.UnimplementedGatewayServer
	t    *testing.T
	name string

	mu         sync.Mutex
	md         metadata.MD
	streamReqs []fakeStreamRequest
}

func (g *fakeDevboxGateway) lastMetadata() metadata.MD {
	g.mu.Lock()
	defer g.mu.Unlock()
	return g.md
}

func (g *fakeDevboxGateway) lastStreamRequest() *fakeStreamRequest {
	g.mu.Lock()
	defer g.mu.Unlock()
	if len(g.streamReqs) == 0 {
		return nil
	}
	return &g.streamReqs[len(g.streamReqs)-1]
}

func (g *fakeDevboxGateway) CreateInstance(ctx context.Context, req *devboxv1.CreateInstanceRequest) (*devboxv1.CreateInstanceResponse, error) {
	md, _ := metadata.FromIncomingContext(ctx)
	g.mu.Lock()
	g.md = md
	g.mu.Unlock()
	return &devboxv1.CreateInstanceResponse{InstanceId: req.InstanceId, ActorId: g.name}, nil
}

func (g *fakeDevboxGateway) SuspendInstance(ctx context.Context, req *devboxv1.InstanceActionRequest) (*devboxv1.InstanceActionResponse, error) {
	st, err := status.New(codes.FailedPrecondition, "cannot suspend").WithDetails(&devboxv1.ErrorDetail{
		Reason: devboxv1.ErrorReason_ERROR_REASON_UNSUPPORTED,
	})
	if err != nil {
		return nil, err
	}
	return nil, st.Err()
}

// ProxyStream answers plain requests with "<name> <path>" and echoes upgraded connections.
func (g *fakeDevboxGateway) ProxyStream(stream grpc.BidiStreamingServer[devboxv1.HttpRequest, devboxv1.HttpResponse]) error {
	md, _ := metadata.FromIncomingContext(stream.Context())
	first, err := stream.Recv()
	if err != nil {
		return err
	}
	line := first.GetHeader().GetRequest()
	if line == nil {
		return status.Error(codes.InvalidArgument, "expected a header first")
	}
	g.mu.Lock()
	g.streamReqs = append(g.streamReqs, fakeStreamRequest{md: md, line: line})
	g.mu.Unlock()
	for {
		msg, err := stream.Recv() // nolint: govet
		if err != nil {
			return err
		}
		if msg.GetTrailer() != nil {
			break
		}
	}
	upgrade := headerValues(line.Header, "Upgrade") != nil
	if !upgrade {
		return sendAll(stream,
			&devboxv1.HttpResponse{Message: &devboxv1.HttpResponse_Header_{Header: &devboxv1.HttpResponse_Header{
				Response: &devboxv1.HttpResponseLine{StatusCode: http.StatusOK, Status: "200 OK", Header: map[string]*devboxv1.MetadataValues{
					"X-Gateway": {Value: []string{"yes"}},
				}},
			}}},
			&devboxv1.HttpResponse{Message: &devboxv1.HttpResponse_Data_{Data: &devboxv1.HttpResponse_Data{
				Data: []byte(g.name + " " + line.UrlPath),
			}}},
			&devboxv1.HttpResponse{Message: &devboxv1.HttpResponse_Trailer_{Trailer: &devboxv1.HttpResponse_Trailer{}}},
		)
	}
	switched := map[string]*devboxv1.MetadataValues{
		"Upgrade":    {Value: []string{"websocket"}},
		"Connection": {Value: []string{"Upgrade"}},
	}
	if proto := headerValues(line.Header, "Sec-WebSocket-Protocol"); len(proto) > 0 {
		switched["Sec-WebSocket-Protocol"] = &devboxv1.MetadataValues{Value: proto}
	}
	err = sendAll(stream,
		&devboxv1.HttpResponse{Message: &devboxv1.HttpResponse_Header_{Header: &devboxv1.HttpResponse_Header{
			Response: &devboxv1.HttpResponseLine{StatusCode: http.StatusSwitchingProtocols, Status: "101 Switching Protocols", Header: switched},
		}}},
		&devboxv1.HttpResponse{Message: &devboxv1.HttpResponse_Trailer_{Trailer: &devboxv1.HttpResponse_Trailer{}}},
	)
	if err != nil {
		return err
	}
	for {
		msg, err := stream.Recv() // nolint: govet
		if errors.Is(err, io.EOF) {
			return nil
		}
		if err != nil {
			return err
		}
		data := msg.GetUpgradeData().GetData()
		if err = stream.Send(&devboxv1.HttpResponse{Message: &devboxv1.HttpResponse_UpgradeData_{UpgradeData: &devboxv1.HttpResponse_UpgradeData{Data: data}}}); err != nil {
			return err
		}
	}
}

func headerValues(h map[string]*devboxv1.MetadataValues, name string) []string {
	for k, v := range h {
		if strings.EqualFold(k, name) {
			return v.GetValue()
		}
	}
	return nil
}

func sendAll(stream grpc.BidiStreamingServer[devboxv1.HttpRequest, devboxv1.HttpResponse], msgs ...*devboxv1.HttpResponse) error {
	for _, m := range msgs {
		if err := stream.Send(m); err != nil {
			return err
		}
	}
	return nil
}

type fakeIngestCall struct {
	gatewayId     string
	md            metadata.MD
	authorization string
	authErr       error
}

type fakeDevboxConsole struct {
	devboxv1.UnimplementedIngestServer
	secret []byte

	mu  sync.Mutex
	log []fakeIngestCall
}

func (c *fakeDevboxConsole) calls() []fakeIngestCall {
	c.mu.Lock()
	defer c.mu.Unlock()
	return append([]fakeIngestCall(nil), c.log...)
}

// Heartbeat checks the JWT the way console's Console.GRPC.Devbox.Auth does.
func (c *fakeDevboxConsole) Heartbeat(ctx context.Context, req *devboxv1.HeartbeatRequest) (*devboxv1.HeartbeatResponse, error) {
	md, _ := metadata.FromIncomingContext(ctx)
	call := fakeIngestCall{gatewayId: req.GatewayId, md: md}
	if vals := md.Get("authorization"); len(vals) == 1 {
		call.authorization = vals[0]
		token, ok := cutBearer(vals[0])
		if !ok {
			call.authErr = errors.New("not a bearer token")
		} else {
			_, call.authErr = jwt.Parse(token, func(*jwt.Token) (any, error) { return c.secret, nil },
				jwt.WithValidMethods([]string{"HS256"}),
				jwt.WithAudience("plural-console"),
				jwt.WithExpirationRequired(),
			)
		}
	} else {
		call.authErr = fmt.Errorf("expected one authorization value, got %d", len(vals))
	}
	c.mu.Lock()
	c.log = append(c.log, call)
	c.mu.Unlock()
	ids := make([]string, 0, len(req.Instances))
	for _, i := range req.Instances {
		ids = append(ids, i.InstanceId)
	}
	return &devboxv1.HeartbeatResponse{UnknownInstanceIds: ids}, nil
}

func cutBearer(v string) (string, bool) {
	const prefix = "Bearer "
	if len(v) <= len(prefix) || v[:len(prefix)] != prefix {
		return "", false
	}
	return v[len(prefix):], true
}

func freeTCPAddr(t *testing.T) string {
	lis, err := net.Listen("tcp", "127.0.0.1:0")
	require.NoError(t, err)
	addr := lis.Addr().String()
	require.NoError(t, lis.Close())
	return addr
}

func passStream(srv any, ss grpc.ServerStream, _ *grpc.StreamServerInfo, handler grpc.StreamHandler) error {
	return handler(srv, ss)
}

func passUnary(ctx context.Context, req any, _ *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (any, error) {
	return handler(ctx, req)
}

func passStreamClient(ctx context.Context, desc *grpc.StreamDesc, cc *grpc.ClientConn, method string, streamer grpc.Streamer, opts ...grpc.CallOption) (grpc.ClientStream, error) {
	return streamer(ctx, desc, cc, method, opts...)
}

func passUnaryClient(ctx context.Context, method string, req, reply any, cc *grpc.ClientConn, invoker grpc.UnaryInvoker, opts ...grpc.CallOption) error {
	return invoker(ctx, method, req, reply, cc, opts...)
}
