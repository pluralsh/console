package kasapp

import (
	"context"
	"io"
	"net"
	"strconv"
	"testing"
	"time"

	"github.com/getsentry/sentry-go"
	"github.com/google/go-cmp/cmp"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/otel/trace"
	"go.uber.org/mock/gomock"
	"go.uber.org/zap"
	"go.uber.org/zap/zaptest"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/testing/protocmp"
	"k8s.io/apimachinery/pkg/util/wait"

	modserver2 "github.com/pluralsh/kubernetes-agent/pkg/module/modserver"
	"github.com/pluralsh/kubernetes-agent/pkg/module/modshared"
	"github.com/pluralsh/kubernetes-agent/pkg/module/reverse_tunnel/rpc"
	tunnel2 "github.com/pluralsh/kubernetes-agent/pkg/module/reverse_tunnel/tunnel"
	grpctool2 "github.com/pluralsh/kubernetes-agent/pkg/tool/grpctool"
	test2 "github.com/pluralsh/kubernetes-agent/pkg/tool/grpctool/test"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_reverse_tunnel_tunnel"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_tool"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/testhelpers"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/tlstool"
)

var (
	_ kasRouter            = (*router)(nil)
	_ grpc.StreamHandler   = (*router)(nil).RouteToKasStreamHandler
	_ grpc.StreamHandler   = (*router)(nil).RouteToAgentStreamHandler
	_ tunnel2.DataCallback = (*wrappingCallback)(nil)
)

func TestRouter_UnaryHappyPath(t *testing.T) {
	ctrl := gomock.NewController(t)
	unaryResponse := &test2.Response{Message: &test2.Response_Scalar{Scalar: 123}}
	routingMeta := routingMetadata()
	payloadMD, responseMD, trailersMD := meta()
	payloadReq := &test2.Request{S1: "123"}
	var (
		headerResp  metadata.MD
		trailerResp metadata.MD
	)
	tun := mock_reverse_tunnel_tunnel.NewMockTunnel(ctrl)
	tun.EXPECT().
		ForwardStream(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		Do(forwardStream(t, routingMeta, payloadMD, payloadReq, unaryResponse, responseMD, trailersMD))
	runRouterTest(t, tun, func(client test2.TestingClient) {
		ctx := metadata.NewOutgoingContext(context.Background(), metadata.Join(routingMeta, payloadMD))
		// grpc.Header() and grpc.Trailer are ok here because it's a unary RPC.
		response, err := client.RequestResponse(ctx, payloadReq, grpc.Header(&headerResp), grpc.Trailer(&trailerResp)) // nolint: forbidigo
		require.NoError(t, err)
		assert.Empty(t, cmp.Diff(response, unaryResponse, protocmp.Transform()))
		mdContains(t, responseMD, headerResp)
		mdContains(t, trailersMD, trailerResp)
	})
}

func TestRouter_UnaryImmediateError(t *testing.T) {
	ctrl := gomock.NewController(t)
	routingMeta := routingMetadata()
	statusWithDetails, err := status.New(codes.InvalidArgument, "Some expected error").
		WithDetails(&test2.Request{S1: "some details of the error"})
	require.NoError(t, err)
	tun := mock_reverse_tunnel_tunnel.NewMockTunnel(ctrl)
	tun.EXPECT().
		ForwardStream(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		Return(statusWithDetails.Err())
	runRouterTest(t, tun, func(client test2.TestingClient) {
		ctx := metadata.NewOutgoingContext(context.Background(), routingMeta)
		_, err = client.RequestResponse(ctx, &test2.Request{S1: "123"})
		require.Error(t, err)
		receivedStatus := status.Convert(err).Proto()
		assert.Empty(t, cmp.Diff(receivedStatus, statusWithDetails.Proto(), protocmp.Transform()))
	})
}

func TestRouter_UnaryErrorAfterHeader(t *testing.T) {
	ctrl := gomock.NewController(t)
	routingMeta := routingMetadata()
	payloadMD, responseMD, trailersMD := meta()
	statusWithDetails, err := status.New(codes.InvalidArgument, "Some expected error").
		WithDetails(&test2.Request{S1: "some details of the error"})
	require.NoError(t, err)
	var (
		headerResp  metadata.MD
		trailerResp metadata.MD
	)
	tun := mock_reverse_tunnel_tunnel.NewMockTunnel(ctrl)
	tun.EXPECT().
		ForwardStream(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		DoAndReturn(func(log *zap.Logger, rpcApi tunnel2.RpcApi, incomingStream grpc.ServerStream, cb tunnel2.DataCallback) error {
			verifyMeta(t, incomingStream, routingMeta, payloadMD)
			assert.NoError(t, cb.Header(grpctool2.MetaToValuesMap(responseMD)))
			assert.NoError(t, cb.Trailer(grpctool2.MetaToValuesMap(trailersMD)))
			return statusWithDetails.Err()
		})
	runRouterTest(t, tun, func(client test2.TestingClient) {
		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()
		ctx = metadata.NewOutgoingContext(ctx, metadata.Join(routingMeta, payloadMD))
		// grpc.Header() and grpc.Trailer are ok here because it's a unary RPC.
		_, err := client.RequestResponse(ctx, &test2.Request{S1: "123"}, grpc.Header(&headerResp), grpc.Trailer(&trailerResp)) // nolint: forbidigo
		require.Error(t, err)
		receivedStatus := status.Convert(err).Proto()
		assert.Empty(t, cmp.Diff(receivedStatus, statusWithDetails.Proto(), protocmp.Transform()))
		mdContains(t, responseMD, headerResp)
		mdContains(t, trailersMD, trailerResp)
	})
}

func TestRouter_StreamHappyPath(t *testing.T) {
	ctrl := gomock.NewController(t)
	streamResponse := &test2.Response{Message: &test2.Response_Scalar{Scalar: 123}}
	routingMeta := routingMetadata()
	payloadMD, responseMD, trailersMD := meta()
	payloadReq := &test2.Request{S1: "123"}
	tun := mock_reverse_tunnel_tunnel.NewMockTunnel(ctrl)
	tun.EXPECT().
		ForwardStream(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		Do(forwardStream(t, routingMeta, payloadMD, payloadReq, streamResponse, responseMD, trailersMD))
	runRouterTest(t, tun, func(client test2.TestingClient) {
		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()
		ctx = metadata.NewOutgoingContext(ctx, metadata.Join(routingMeta, payloadMD))
		stream, err := client.StreamingRequestResponse(ctx)
		require.NoError(t, err)
		err = stream.Send(payloadReq)
		require.NoError(t, err)
		err = stream.CloseSend()
		require.NoError(t, err)
		response, err := stream.Recv()
		require.NoError(t, err)
		assert.Empty(t, cmp.Diff(response, streamResponse, protocmp.Transform()))
		_, err = stream.Recv()
		assert.Equal(t, io.EOF, err)
		verifyHeaderAndTrailer(t, stream, responseMD, trailersMD)
	})
}

func TestRouter_StreamImmediateError(t *testing.T) {
	ctrl := gomock.NewController(t)
	routingMeta := routingMetadata()
	statusWithDetails, err := status.New(codes.InvalidArgument, "Some expected error").
		WithDetails(&test2.Request{S1: "some details of the error"})
	require.NoError(t, err)
	tun := mock_reverse_tunnel_tunnel.NewMockTunnel(ctrl)
	tun.EXPECT().
		ForwardStream(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		Return(statusWithDetails.Err())
	runRouterTest(t, tun, func(client test2.TestingClient) {
		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()
		ctx = metadata.NewOutgoingContext(ctx, routingMeta)
		stream, err := client.StreamingRequestResponse(ctx)
		require.NoError(t, err)
		_, err = stream.Recv()
		require.Error(t, err)
		receivedStatus := status.Convert(err).Proto()
		assert.Empty(t, cmp.Diff(receivedStatus, statusWithDetails.Proto(), protocmp.Transform()))
	})
}

func TestRouter_StreamErrorAfterHeader(t *testing.T) {
	ctrl := gomock.NewController(t)
	routingMeta := routingMetadata()
	payloadMD, responseMD, trailersMD := meta()
	statusWithDetails, err := status.New(codes.InvalidArgument, "Some expected error").
		WithDetails(&test2.Request{S1: "some details of the error"})
	require.NoError(t, err)
	tun := mock_reverse_tunnel_tunnel.NewMockTunnel(ctrl)
	tun.EXPECT().
		ForwardStream(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		DoAndReturn(func(log *zap.Logger, rpcApi tunnel2.RpcApi, incomingStream grpc.ServerStream, cb tunnel2.DataCallback) error {
			verifyMeta(t, incomingStream, routingMeta, payloadMD)
			assert.NoError(t, cb.Header(grpctool2.MetaToValuesMap(responseMD)))
			assert.NoError(t, cb.Trailer(grpctool2.MetaToValuesMap(trailersMD)))
			return statusWithDetails.Err()
		})
	runRouterTest(t, tun, func(client test2.TestingClient) {
		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()
		ctx = metadata.NewOutgoingContext(ctx, metadata.Join(routingMeta, payloadMD))
		stream, err := client.StreamingRequestResponse(ctx)
		require.NoError(t, err)
		_, err = stream.Recv()
		require.Error(t, err)
		receivedStatus := status.Convert(err).Proto()
		assert.Empty(t, cmp.Diff(receivedStatus, statusWithDetails.Proto(), protocmp.Transform()))
		verifyHeaderAndTrailer(t, stream, responseMD, trailersMD)
	})
}

func TestRouter_StreamVisitorErrorAfterErrorMessage(t *testing.T) {
	ctrl := gomock.NewController(t)
	routingMeta := routingMetadata()
	payloadMD, responseMD, trailersMD := meta()
	statusWithDetails, err := status.New(codes.InvalidArgument, "Some expected error").
		WithDetails(&test2.Request{S1: "some details of the error"})
	require.NoError(t, err)
	tun := mock_reverse_tunnel_tunnel.NewMockTunnel(ctrl)
	tun.EXPECT().
		ForwardStream(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		DoAndReturn(func(log *zap.Logger, rpcApi tunnel2.RpcApi, incomingStream grpc.ServerStream, cb tunnel2.DataCallback) error {
			verifyMeta(t, incomingStream, routingMeta, payloadMD)
			assert.NoError(t, cb.Header(grpctool2.MetaToValuesMap(responseMD)))
			assert.NoError(t, cb.Trailer(grpctool2.MetaToValuesMap(trailersMD)))
			// adapt to tunnel.DataCallback which expects *rpc.Error, not *status.Status
			assert.NoError(t, cb.Error(&rpc.Error{Status: statusWithDetails.Proto()}))
			return status.Error(codes.Unavailable, "expected return error")
		})
	runRouterTest(t, tun, func(client test2.TestingClient) {
		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()
		ctx = metadata.NewOutgoingContext(ctx, metadata.Join(routingMeta, payloadMD))
		stream, err := client.StreamingRequestResponse(ctx)
		require.NoError(t, err)
		_, err = stream.Recv()
		require.EqualError(t, err, "rpc error: code = Unavailable desc = expected return error")
		verifyHeaderAndTrailer(t, stream, responseMD, trailersMD)
	})
}

func TestRouter_FindTunnelTimeout(t *testing.T) {
	ctrl := gomock.NewController(t)
	rep := mock_tool.NewMockErrReporter(ctrl)
	log := zaptest.NewLogger(t)
	querier := mock_reverse_tunnel_tunnel.NewMockPollingQuerier(ctrl)
	finder := mock_reverse_tunnel_tunnel.NewMockFinder(ctrl)
	internalServerListener := grpctool2.NewDialListener()
	defer internalServerListener.Close()
	privateApiServerListener, err := net.Listen("tcp", "localhost:0")
	require.NoError(t, err)
	defer privateApiServerListener.Close()

	gomock.InOrder(
		querier.EXPECT().
			CachedKasUrlsByAgentId(testhelpers.AgentId),
		querier.EXPECT().
			PollKasUrlsByAgentId(gomock.Any(), testhelpers.AgentId, gomock.Any()).
			Do(func(ctx context.Context, agentId int64, cb tunnel2.PollKasUrlsByAgentIdCallback) {
				<-ctx.Done()
			}),
	)
	factory := func(ctx context.Context, fullMethodName string) modserver2.RpcApi {
		return &serverRpcApi{
			RpcApiStub: modshared.RpcApiStub{
				StreamCtx: ctx,
				Logger:    log,
			},
			sentryHubRoot: sentry.NewHub(nil, sentry.NewScope()),
		}
	}

	internalServer := grpc.NewServer(
		grpc.StatsHandler(grpctool2.NewServerMaxConnAgeStatsHandler(context.Background(), 0)),
		grpc.ChainStreamInterceptor(
			modserver2.StreamRpcApiInterceptor(factory),
		),
		grpc.ChainUnaryInterceptor(
			modserver2.UnaryRpcApiInterceptor(factory),
		),
		grpc.ForceServerCodec(grpctool2.RawCodec{}),
	)
	privateApiServer := grpc.NewServer(
		grpc.StatsHandler(grpctool2.NewServerMaxConnAgeStatsHandler(context.Background(), 0)),
		grpc.ChainStreamInterceptor(
			modserver2.StreamRpcApiInterceptor(factory),
		),
		grpc.ChainUnaryInterceptor(
			modserver2.UnaryRpcApiInterceptor(factory),
		),
		grpc.ForceServerCodec(grpctool2.RawCodecWithProtoFallback{}),
	)
	gatewayKasVisitor, err := grpctool2.NewStreamVisitor(&GatewayKasResponse{})
	require.NoError(t, err)
	r := &router{
		kasPool: grpctool2.NewPool(log, rep,
			credentials.NewTLS(tlstool.DefaultClientTLSConfig()),
			grpc.WithContextDialer(func(ctx context.Context, addr string) (net.Conn, error) {
				<-ctx.Done()
				return nil, ctx.Err()
			}),
		),
		tunnelQuerier:             querier,
		tunnelFinder:              finder,
		ownPrivateApiUrl:          "grpc://" + privateApiServerListener.Addr().String(),
		pollConfig:                testhelpers.NewPollConfig(time.Minute),
		internalServer:            internalServer,
		privateApiServer:          privateApiServer,
		gatewayKasVisitor:         gatewayKasVisitor,
		tracer:                    trace.NewNoopTracerProvider().Tracer(routerTracerName),
		kasRoutingDurationSuccess: prometheus.ObserverFunc(func(f float64) {}),
		kasRoutingDurationTimeout: prometheus.NewCounter(prometheus.CounterOpts{}),
		kasRoutingDurationAborted: prometheus.ObserverFunc(func(f float64) {}),
		tunnelFindTimeout:         100 * time.Millisecond,
		tryNewKasInterval:         routingTryNewKasInterval,
	}
	r.RegisterAgentApi(&test2.Testing_ServiceDesc)
	var wg wait.Group
	defer wg.Wait()
	defer internalServer.GracefulStop()
	defer privateApiServer.GracefulStop()
	wg.Start(func() {
		assert.NoError(t, internalServer.Serve(internalServerListener))
	})
	wg.Start(func() {
		assert.NoError(t, privateApiServer.Serve(privateApiServerListener))
	})
	internalServerConn, err := grpc.DialContext(context.Background(), "passthrough:pipe",
		grpc.WithContextDialer(internalServerListener.DialContext),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithChainStreamInterceptor(
			grpctool2.StreamClientValidatingInterceptor,
		),
		grpc.WithChainUnaryInterceptor(
			grpctool2.UnaryClientValidatingInterceptor,
		),
	)
	require.NoError(t, err)
	defer internalServerConn.Close()
	client := test2.NewTestingClient(internalServerConn)
	routingMeta := routingMetadata()
	ctx := metadata.NewOutgoingContext(context.Background(), routingMeta)
	_, err = client.RequestResponse(ctx, &test2.Request{})
	assert.EqualError(t, err, "rpc error: code = DeadlineExceeded desc = Agent connection not found. Is agent up to date and connected?")
}

func meta() (metadata.MD, metadata.MD, metadata.MD) {
	payloadMD := metadata.Pairs("key1", "value1")
	responseMD := metadata.Pairs("key2", "value2")
	trailersMD := metadata.Pairs("key3", "value3")
	return payloadMD, responseMD, trailersMD
}

func verifyHeaderAndTrailer(t *testing.T, stream grpc.ClientStream, responseMD, trailersMD metadata.MD) {
	headerResp, err := stream.Header()
	require.NoError(t, err)
	mdContains(t, responseMD, headerResp)
	mdContains(t, trailersMD, stream.Trailer())
}

func forwardStream(t *testing.T, routingMetadata, payloadMD metadata.MD, payloadReq *test2.Request, response *test2.Response, responseMD, trailersMD metadata.MD) func(*zap.Logger, tunnel2.RpcApi, grpc.ServerStream, tunnel2.DataCallback) error {
	return func(log *zap.Logger, rpcApi tunnel2.RpcApi, incomingStream grpc.ServerStream, cb tunnel2.DataCallback) error {
		verifyMeta(t, incomingStream, routingMetadata, payloadMD)
		var req test2.Request
		err := incomingStream.RecvMsg(&req)
		assert.NoError(t, err)
		assert.Empty(t, cmp.Diff(payloadReq, &req, protocmp.Transform()))
		data, err := proto.Marshal(response)
		assert.NoError(t, err)
		assert.NoError(t, cb.Header(grpctool2.MetaToValuesMap(responseMD)))
		assert.NoError(t, cb.Message(data))
		assert.NoError(t, cb.Trailer(grpctool2.MetaToValuesMap(trailersMD)))
		return nil
	}
}

func verifyMeta(t *testing.T, incomingStream grpc.ServerStream, routingMetadata, payloadMD metadata.MD) {
	md, _ := metadata.FromIncomingContext(incomingStream.Context())
	for k := range routingMetadata { // no routing metadata is passed to the agent
		assert.NotContains(t, md, k)
	}
	mdContains(t, payloadMD, md)
}

func mdContains(t *testing.T, expectedMd metadata.MD, actualMd metadata.MD) {
	for k, v := range expectedMd {
		assert.Equalf(t, v, actualMd[k], "key: %s", k)
	}
}

// test:client(default codec) --> kas:internal server(raw codec) --> router_kas handler -->
// client from kas_pool(raw wih fallback codec) --> kas:private server(raw wih fallback codec) -->
// router_agent handler --> tunnel finder --> tunnel.ForwardStream()
func runRouterTest(t *testing.T, tunnel *mock_reverse_tunnel_tunnel.MockTunnel, runTest func(client test2.TestingClient)) {
	ctrl := gomock.NewController(t)
	rep := mock_tool.NewMockErrReporter(ctrl)
	log := zaptest.NewLogger(t)
	querier := mock_reverse_tunnel_tunnel.NewMockPollingQuerier(ctrl)
	finder := mock_reverse_tunnel_tunnel.NewMockFinder(ctrl)
	fh := mock_reverse_tunnel_tunnel.NewMockFindHandle(ctrl)
	internalServerListener := grpctool2.NewDialListener()
	defer internalServerListener.Close()
	privateApiServerListener, err := net.Listen("tcp", "localhost:0")
	require.NoError(t, err)
	defer privateApiServerListener.Close()

	gomock.InOrder(
		querier.EXPECT().
			CachedKasUrlsByAgentId(testhelpers.AgentId),
		finder.EXPECT().
			FindTunnel(gomock.Any(), testhelpers.AgentId, gomock.Any(), gomock.Any()).
			Return(true, fh),
		fh.EXPECT().
			Get(gomock.Any()).
			Return(tunnel, nil),
		tunnel.EXPECT().Done(gomock.Any()),
		fh.EXPECT().Done(gomock.Any()),
	)
	factory := func(ctx context.Context, fullMethodName string) modserver2.RpcApi {
		return &serverRpcApi{
			RpcApiStub: modshared.RpcApiStub{
				StreamCtx: ctx,
				Logger:    log,
			},
			sentryHubRoot: sentry.NewHub(nil, sentry.NewScope()),
		}
	}

	internalServer := grpc.NewServer(
		grpc.StatsHandler(grpctool2.NewServerMaxConnAgeStatsHandler(context.Background(), 0)),
		grpc.ChainStreamInterceptor(
			modserver2.StreamRpcApiInterceptor(factory),
		),
		grpc.ChainUnaryInterceptor(
			modserver2.UnaryRpcApiInterceptor(factory),
		),
		grpc.ForceServerCodec(grpctool2.RawCodec{}),
	)
	privateApiServer := grpc.NewServer(
		grpc.StatsHandler(grpctool2.NewServerMaxConnAgeStatsHandler(context.Background(), 0)),
		grpc.ChainStreamInterceptor(
			modserver2.StreamRpcApiInterceptor(factory),
		),
		grpc.ChainUnaryInterceptor(
			modserver2.UnaryRpcApiInterceptor(factory),
		),
		grpc.ForceServerCodec(grpctool2.RawCodecWithProtoFallback{}),
	)
	gatewayKasVisitor, err := grpctool2.NewStreamVisitor(&GatewayKasResponse{})
	require.NoError(t, err)
	r := &router{
		kasPool: grpctool2.NewPool(log, rep,
			credentials.NewTLS(tlstool.DefaultClientTLSConfig()),
		),
		tunnelQuerier:             querier,
		tunnelFinder:              finder,
		ownPrivateApiUrl:          "grpc://" + privateApiServerListener.Addr().String(),
		pollConfig:                testhelpers.NewPollConfig(time.Minute),
		internalServer:            internalServer,
		privateApiServer:          privateApiServer,
		gatewayKasVisitor:         gatewayKasVisitor,
		tracer:                    trace.NewNoopTracerProvider().Tracer(routerTracerName),
		kasRoutingDurationSuccess: prometheus.ObserverFunc(func(f float64) {}),
		kasRoutingDurationTimeout: prometheus.NewCounter(prometheus.CounterOpts{}),
		kasRoutingDurationAborted: prometheus.ObserverFunc(func(f float64) {}),
		tunnelFindTimeout:         routingTunnelFindTimeout,
		// We don't want any nondeterministic polls to other KAS
		tryNewKasInterval: 5 * time.Second,
	}
	r.RegisterAgentApi(&test2.Testing_ServiceDesc)
	var wg wait.Group
	defer wg.Wait()
	defer internalServer.GracefulStop()
	defer privateApiServer.GracefulStop()
	wg.Start(func() {
		assert.NoError(t, internalServer.Serve(internalServerListener))
	})
	wg.Start(func() {
		assert.NoError(t, privateApiServer.Serve(privateApiServerListener))
	})
	internalServerConn, err := grpc.DialContext(context.Background(), "passthrough:pipe",
		grpc.WithContextDialer(internalServerListener.DialContext),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithChainStreamInterceptor(
			grpctool2.StreamClientValidatingInterceptor,
		),
		grpc.WithChainUnaryInterceptor(
			grpctool2.UnaryClientValidatingInterceptor,
		),
	)
	require.NoError(t, err)
	defer internalServerConn.Close()
	client := test2.NewTestingClient(internalServerConn)
	runTest(client)
}

func routingMetadata() metadata.MD {
	return metadata.Pairs(modserver2.RoutingAgentIdMetadataKey, strconv.FormatInt(testhelpers.AgentId, 10))
}
