package server

import (
	"context"
	"errors"
	"io"
	"net"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/go-cmp/cmp"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/testing/protocmp"

	devboxv1 "github.com/pluralsh/console/go/kubernetes-agent/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/module/devbox"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/module/modserver"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/module/reverse_tunnel/info"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/module/reverse_tunnel/rpc"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/tool/grpctool"
	test2 "github.com/pluralsh/console/go/kubernetes-agent/pkg/tool/grpctool/test"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/tool/prototool"
)

// KAS serves devbox.v1.Tunnel and calls devbox.v1.Gateway/ProxyStream with the agentk reverse tunnel and
// grpctool types; this only works while the devbox.v1 copies stay wire-compatible.
func TestWireCompatibility(t *testing.T) {
	tests := []struct {
		name string
		from proto.Message
		to   proto.Message
		want proto.Message
	}{
		{
			name: "descriptor",
			from: &rpc.ConnectRequest{Msg: &rpc.ConnectRequest_Descriptor_{Descriptor_: &rpc.Descriptor{
				AgentDescriptor: &info.AgentDescriptor{Services: []*info.Service{{
					Name:    "devbox.v1.Gateway",
					Methods: []*info.Method{{Name: "CreateInstance"}, {Name: "ProxyStream"}},
				}}},
			}}},
			to: &devboxv1.TunnelConnectRequest{},
			want: &devboxv1.TunnelConnectRequest{Msg: &devboxv1.TunnelConnectRequest_Descriptor_{Descriptor_: &devboxv1.TunnelDescriptor{
				AgentDescriptor: &devboxv1.TunnelAgentDescriptor{Services: []*devboxv1.TunnelService{{
					Name:    "devbox.v1.Gateway",
					Methods: []*devboxv1.TunnelMethod{{Name: "CreateInstance"}, {Name: "ProxyStream"}},
				}}},
			}}},
		},
		{
			name: "request info",
			from: &rpc.ConnectResponse{Msg: &rpc.ConnectResponse_RequestInfo{RequestInfo: &rpc.RequestInfo{
				MethodName: "/devbox.v1.Gateway/CreateInstance",
				Meta:       map[string]*prototool.Values{devboxv1.ClusterIDMetadataKey: {Value: []string{"c"}}},
			}}},
			to: &devboxv1.TunnelConnectResponse{},
			want: &devboxv1.TunnelConnectResponse{Msg: &devboxv1.TunnelConnectResponse_RequestInfo{RequestInfo: &devboxv1.TunnelRequestInfo{
				MethodName: "/devbox.v1.Gateway/CreateInstance",
				Meta:       map[string]*devboxv1.MetadataValues{devboxv1.ClusterIDMetadataKey: {Value: []string{"c"}}},
			}}},
		},
		{
			name: "error",
			from: &rpc.ConnectRequest{Msg: &rpc.ConnectRequest_Error{Error: &rpc.Error{
				Status: status.New(codes.NotFound, "nope").Proto(),
			}}},
			to: &devboxv1.TunnelConnectRequest{},
			want: &devboxv1.TunnelConnectRequest{Msg: &devboxv1.TunnelConnectRequest_Error{Error: &devboxv1.TunnelError{
				Status: &devboxv1.TunnelStatus{Code: int32(codes.NotFound), Message: "nope"},
			}}},
		},
		{
			name: "http request header",
			from: &grpctool.HttpRequest{Message: &grpctool.HttpRequest_Header_{Header: &grpctool.HttpRequest_Header{
				Request: &prototool.HttpRequest{
					Method:  "GET",
					Header:  map[string]*prototool.Values{"Upgrade": {Value: []string{"websocket"}}},
					UrlPath: "/preview",
					Query:   map[string]*prototool.Values{"a": {Value: []string{"1"}}},
				},
			}}},
			to: &devboxv1.HttpRequest{},
			want: &devboxv1.HttpRequest{Message: &devboxv1.HttpRequest_Header_{Header: &devboxv1.HttpRequest_Header{
				Request: &devboxv1.HttpRequestLine{
					Method:  "GET",
					Header:  map[string]*devboxv1.MetadataValues{"Upgrade": {Value: []string{"websocket"}}},
					UrlPath: "/preview",
					Query:   map[string]*devboxv1.MetadataValues{"a": {Value: []string{"1"}}},
				},
			}}},
		},
		{
			name: "http response upgrade data",
			from: &devboxv1.HttpResponse{Message: &devboxv1.HttpResponse_UpgradeData_{UpgradeData: &devboxv1.HttpResponse_UpgradeData{Data: []byte("hi")}}},
			to:   &grpctool.HttpResponse{},
			want: &grpctool.HttpResponse{Message: &grpctool.HttpResponse_UpgradeData_{UpgradeData: &grpctool.HttpResponse_UpgradeData{Data: []byte("hi")}}},
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			b, err := proto.Marshal(tc.from)
			require.NoError(t, err)
			require.NoError(t, proto.Unmarshal(b, tc.to))
			assert.Empty(t, cmp.Diff(tc.want, tc.to, protocmp.Transform()))
		})
	}
}

func TestMungedServicesMatchContract(t *testing.T) {
	for _, m := range devboxv1.Control_ServiceDesc.Methods {
		gatewayMethod, ok := devboxv1.GatewayMethodForControl("/devbox.v1.Control/" + m.MethodName)
		assert.True(t, ok, m.MethodName)
		assert.Equal(t, "/devbox.v1.Gateway/"+m.MethodName, gatewayMethod)
	}
	assert.Empty(t, devboxv1.Control_ServiceDesc.Streams, "Control streams would need a gateway counterpart")
	munged := mungeServiceDesc(&devboxv1.Ingest_ServiceDesc, nil)
	assert.Len(t, munged.Streams, len(devboxv1.Ingest_ServiceDesc.Methods))
}

func TestClusterOfflineError(t *testing.T) {
	st := status.Convert(devbox.ClusterOfflineError())
	assert.Equal(t, codes.Unavailable, st.Code())
	require.Len(t, st.Details(), 1)
	detail, ok := st.Details()[0].(*devboxv1.ErrorDetail)
	require.True(t, ok)
	assert.Equal(t, devboxv1.ErrorReason_ERROR_REASON_CLUSTER_OFFLINE, detail.Reason)
	// Console matches on the Any type URL suffix.
	assert.Equal(t, "type.googleapis.com/devbox.v1.ErrorDetail", st.Proto().Details[0].TypeUrl)
}

type echoTestingServer struct {
	test2.UnimplementedTestingServer
	t *testing.T
}

func (s *echoTestingServer) RequestResponse(ctx context.Context, req *test2.Request) (*test2.Response, error) {
	if req.S1 == "fail" {
		st, err := status.New(codes.FailedPrecondition, "failed").WithDetails(&devboxv1.ErrorDetail{Message: "detail"})
		require.NoError(s.t, err)
		return nil, st.Err()
	}
	return &test2.Response{Message: &test2.Response_Scalar{Scalar: int64(len(req.S1))}}, nil
}

func (s *echoTestingServer) StreamingRequestResponse(stream grpc.BidiStreamingServer[test2.Request, test2.Response]) error {
	md, _ := metadata.FromIncomingContext(stream.Context())
	assert.Empty(s.t, md.Get("authorization"))
	assert.Empty(s.t, md.Get(modserver.RoutingAgentIdMetadataKey))
	assert.Equal(s.t, []string{"bar"}, md.Get("x-foo"))
	if err := stream.SendHeader(metadata.Pairs("x-header", "h")); err != nil {
		return err
	}
	for {
		req, err := stream.Recv()
		if errors.Is(err, io.EOF) {
			stream.SetTrailer(metadata.Pairs("x-trailer", "t"))
			return nil
		}
		if err != nil {
			return err
		}
		if err = stream.Send(&test2.Response{Message: &test2.Response_Scalar{Scalar: int64(len(req.S1))}}); err != nil {
			return err
		}
	}
}

func startServer(t *testing.T, s *grpc.Server) *grpc.ClientConn {
	lis := grpctool.NewDialListener()
	go func() {
		_ = s.Serve(lis)
	}()
	t.Cleanup(s.Stop)
	conn, err := grpc.NewClient("passthrough:pipe",
		grpc.WithContextDialer(func(ctx context.Context, addr string) (net.Conn, error) {
			return lis.DialContext(ctx, addr)
		}),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	require.NoError(t, err)
	t.Cleanup(func() { _ = conn.Close() })
	return conn
}

func TestForwardStream(t *testing.T) {
	backend := grpc.NewServer()
	test2.RegisterTestingServer(backend, &echoTestingServer{t: t})
	backendConn := startServer(t, backend)

	frontend := grpc.NewServer(grpc.ForceServerCodec(grpctool.RawCodecWithProtoFallback{}))
	frontend.RegisterService(mungeServiceDesc(&test2.Testing_ServiceDesc, func(_ any, stream grpc.ServerStream) error {
		ctx := stream.Context()
		method, _ := grpc.Method(ctx)
		return forwardStream(metadata.NewOutgoingContext(ctx, outgoingMetadata(ctx)), stream, backendConn, method)
	}), nil)
	client := test2.NewTestingClient(startServer(t, frontend))

	ctx := metadata.AppendToOutgoingContext(context.Background(),
		"authorization", "Bearer secret",
		modserver.RoutingAgentIdMetadataKey, "1",
		"x-foo", "bar",
	)

	t.Run("bidi stream", func(t *testing.T) {
		stream, err := client.StreamingRequestResponse(ctx)
		require.NoError(t, err)
		for _, s := range []string{"a", "bb", "ccc"} {
			require.NoError(t, stream.Send(&test2.Request{S1: s}))
			resp, err := stream.Recv() // nolint: govet
			require.NoError(t, err)
			assert.EqualValues(t, len(s), resp.GetScalar())
		}
		require.NoError(t, stream.CloseSend())
		_, err = stream.Recv()
		assert.ErrorIs(t, err, io.EOF)
		header, err := stream.Header()
		require.NoError(t, err)
		assert.Equal(t, []string{"h"}, header.Get("x-header"))
		assert.Equal(t, []string{"t"}, stream.Trailer().Get("x-trailer"))
	})

	t.Run("unary", func(t *testing.T) {
		resp, err := client.RequestResponse(ctx, &test2.Request{S1: "four"})
		require.NoError(t, err)
		assert.EqualValues(t, 4, resp.GetScalar())
	})

	t.Run("error status with details", func(t *testing.T) {
		_, err := client.RequestResponse(ctx, &test2.Request{S1: "fail"})
		st := status.Convert(err)
		assert.Equal(t, codes.FailedPrecondition, st.Code())
		require.Len(t, st.Details(), 1)
		assert.Equal(t, "detail", st.Details()[0].(*devboxv1.ErrorDetail).Message)
	})
}

const testStreamKey = "stream-token-key"

func mintStreamToken(t *testing.T, key string, mutate func(c jwt.MapClaims)) string {
	now := time.Now()
	claims := jwt.MapClaims{
		"sub":         "user-1",
		"aud":         DefaultStreamTokenAudience,
		"iss":         "https://console.example.com",
		"iat":         now.Unix(),
		"exp":         now.Add(5 * time.Minute).Unix(),
		"jti":         "jti-1",
		"cluster_id":  "4c1d8a7e-0000-4000-8000-000000000001",
		"cluster":     "4c1d8a7e-0000-4000-8000-000000000001",
		"instance_id": "inst-1",
		"instance":    "inst-1",
		"stream_id":   "stream-1",
		"kind":        "terminal",
	}
	if mutate != nil {
		mutate(claims)
	}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(key))
	require.NoError(t, err)
	return token
}

func TestStreamTokenValidator(t *testing.T) {
	v := &streamTokenValidator{
		key:      []byte(testStreamKey),
		audience: DefaultStreamTokenAudience,
		leeway:   time.Second,
	}
	tests := []struct {
		name     string
		token    string
		stream   string
		instance string
		wantErr  error
	}{
		{name: "valid", token: mintStreamToken(t, testStreamKey, nil), stream: "stream-1"},
		{name: "valid with instance", token: mintStreamToken(t, testStreamKey, nil), stream: "stream-1", instance: "inst-1"},
		{name: "short claim names", stream: "stream-1", token: mintStreamToken(t, testStreamKey, func(c jwt.MapClaims) {
			delete(c, "cluster_id")
			delete(c, "instance_id")
		})},
		{name: "expired", stream: "stream-1", wantErr: errStreamTokenInvalid, token: mintStreamToken(t, testStreamKey, func(c jwt.MapClaims) {
			c["exp"] = time.Now().Add(-time.Minute).Unix()
		})},
		{name: "no expiry", stream: "stream-1", wantErr: errStreamTokenInvalid, token: mintStreamToken(t, testStreamKey, func(c jwt.MapClaims) {
			delete(c, "exp")
		})},
		{name: "wrong audience", stream: "stream-1", wantErr: errStreamTokenInvalid, token: mintStreamToken(t, testStreamKey, func(c jwt.MapClaims) {
			c["aud"] = "gitlab-kas"
		})},
		{name: "wrong key", stream: "stream-1", wantErr: errStreamTokenInvalid, token: mintStreamToken(t, "other-key", nil)},
		{name: "wrong stream", stream: "stream-2", wantErr: errStreamTokenStream, token: mintStreamToken(t, testStreamKey, nil)},
		{name: "wrong instance", stream: "stream-1", instance: "inst-2", wantErr: errStreamTokenInstance, token: mintStreamToken(t, testStreamKey, nil)},
		{name: "missing cluster", stream: "stream-1", wantErr: errStreamTokenInvalid, token: mintStreamToken(t, testStreamKey, func(c jwt.MapClaims) {
			delete(c, "cluster_id")
			delete(c, "cluster")
		})},
		{name: "garbage", stream: "stream-1", wantErr: errStreamTokenInvalid, token: "not-a-jwt"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			claims, err := v.validate(tc.token, tc.stream, tc.instance)
			if tc.wantErr != nil {
				assert.ErrorIs(t, err, tc.wantErr)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, "4c1d8a7e-0000-4000-8000-000000000001", claims.ClusterId())
			assert.Equal(t, "inst-1", claims.InstanceId())
			assert.Equal(t, "terminal", claims.Kind)
		})
	}
}

func TestStreamToken_RejectsNoneAlg(t *testing.T) {
	v := &streamTokenValidator{key: []byte(testStreamKey), audience: DefaultStreamTokenAudience}
	token, err := jwt.NewWithClaims(jwt.SigningMethodNone, jwt.MapClaims{
		"aud": DefaultStreamTokenAudience, "exp": time.Now().Add(time.Minute).Unix(),
		"cluster_id": "c", "instance_id": "i", "stream_id": "s",
	}).SignedString(jwt.UnsafeAllowNoneSignatureType)
	require.NoError(t, err)
	_, err = v.validate(token, "s", "")
	assert.ErrorIs(t, err, errStreamTokenInvalid)
}

func TestStreamsParsePath(t *testing.T) {
	h := &streamsHandler{urlPathPrefix: DefaultUrlPathPrefix}
	tests := []struct {
		path, stream, suffix string
		ok                   bool
	}{
		{path: "/ext/devbox/streams/s1", stream: "s1", suffix: "/", ok: true},
		{path: "/ext/devbox/streams/s1/", stream: "s1", suffix: "/", ok: true},
		{path: "/ext/devbox/streams/s1/preview/a.js", stream: "s1", suffix: "/preview/a.js", ok: true},
		{path: "/streams/s1/x", stream: "s1", suffix: "/x", ok: true},
		{path: "/ext/devbox/streams/", ok: false},
		{path: "/ext/devbox", ok: false},
		{path: "/other/streams", ok: false},
	}
	for _, tc := range tests {
		stream, suffix, ok := h.parsePath(tc.path)
		assert.Equal(t, tc.ok, ok, tc.path)
		if tc.ok {
			assert.Equal(t, tc.stream, stream, tc.path)
			assert.Equal(t, tc.suffix, suffix, tc.path)
		}
	}
}
