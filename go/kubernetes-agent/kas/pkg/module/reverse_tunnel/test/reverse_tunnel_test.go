package test

import (
	"context"
	"strconv"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
	"golang.org/x/sync/errgroup"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/reflect/protoreflect"
	"google.golang.org/protobuf/testing/protocmp"

	"github.com/pluralsh/kubernetes-agent/pkg/module/modserver"
	"github.com/pluralsh/kubernetes-agent/pkg/module/reverse_tunnel/rpc"
	tunnel2 "github.com/pluralsh/kubernetes-agent/pkg/module/reverse_tunnel/tunnel"
	grpctool2 "github.com/pluralsh/kubernetes-agent/pkg/tool/grpctool"
	test2 "github.com/pluralsh/kubernetes-agent/pkg/tool/grpctool/test"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/prototool"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_modagent"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/testhelpers"
)

const (
	scalarNumber protoreflect.FieldNumber = 1
	x1Number     protoreflect.FieldNumber = 2
	dataNumber   protoreflect.FieldNumber = 3
	lastNumber   protoreflect.FieldNumber = 4

	metaKey    = "Cba"
	trailerKey = "Abc"
)

func TestStreamHappyPath(t *testing.T) {
	trailer := metadata.MD{}
	trailer.Set(trailerKey, "1", "2")
	ats := &test2.GrpcTestingServer{
		StreamingFunc: func(server test2.Testing_StreamingRequestResponseServer) error {
			recv, err := server.Recv()
			if err != nil {
				return status.Error(codes.Unavailable, "unavailable")
			}
			val, err := strconv.ParseInt(recv.S1, 10, 64)
			if err != nil {
				return status.Error(codes.Unavailable, "unavailable")
			}
			incomingContext, ok := metadata.FromIncomingContext(server.Context())
			if !ok {
				return status.Error(codes.Unavailable, "unavailable")
			}

			header := metadata.MD{}
			header.Set(metaKey, incomingContext.Get(metaKey)...)

			err = server.SetHeader(header)
			if err != nil {
				return status.Error(codes.Unavailable, "unavailable")
			}
			resps := []*test2.Response{
				{
					Message: &test2.Response_Scalar{
						Scalar: val,
					},
				},
				{
					Message: &test2.Response_X1{
						X1: test2.Enum1_v1,
					},
				},
				{
					Message: &test2.Response_Data_{
						Data: &test2.Response_Data{},
					},
				},
				{
					Message: &test2.Response_Data_{
						Data: &test2.Response_Data{},
					},
				},
				{
					Message: &test2.Response_Last_{
						Last: &test2.Response_Last{},
					},
				},
			}
			for _, resp := range resps {
				err = server.Send(resp)
				if err != nil {
					return status.Error(codes.Unavailable, "unavailable")
				}
			}
			server.SetTrailer(trailer)
			return nil
		},
	}
	runTest(t, ats, func(ctx context.Context, t *testing.T, client test2.TestingClient) {
		for i := 0; i < 2; i++ { // test several sequential requests
			testStreamHappyPath(ctx, t, client, trailer)
		}
	})
}

func testStreamHappyPath(ctx context.Context, t *testing.T, client test2.TestingClient, trailer metadata.MD) {
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()
	meta := metadata.MD{}
	meta.Set(metaKey, "3", "4")
	ctx = metadata.NewOutgoingContext(ctx, meta)
	stream, err := client.StreamingRequestResponse(ctx)
	require.NoError(t, err)
	err = stream.Send(&test2.Request{
		S1: "123",
	})
	require.NoError(t, err)
	err = stream.CloseSend()
	require.NoError(t, err)
	var (
		scalarCalled int
		x1Called     int
		dataCalled   int
		lastCalled   int
		eofCalled    int
	)
	v, err := grpctool2.NewStreamVisitor(&test2.Response{})
	require.NoError(t, err)
	err = v.Visit(stream,
		grpctool2.WithEOFCallback(func() error {
			eofCalled++
			return nil
		}),
		grpctool2.WithCallback(scalarNumber, func(scalar int64) error {
			assert.EqualValues(t, 123, scalar)
			scalarCalled++
			return nil
		}),
		grpctool2.WithCallback(x1Number, func(x1 test2.Enum1) error {
			x1Called++
			return nil
		}),
		grpctool2.WithCallback(dataNumber, func(data *test2.Response_Data) error {
			dataCalled++
			return nil
		}),
		grpctool2.WithCallback(lastNumber, func(last *test2.Response_Last) error {
			lastCalled++
			return nil
		}),
	)
	require.NoError(t, err)
	assert.Equal(t, 1, scalarCalled)
	assert.Equal(t, 1, x1Called)
	assert.Equal(t, 2, dataCalled)
	assert.Equal(t, 1, lastCalled)
	assert.Equal(t, 1, eofCalled)
	assert.Equal(t, trailer, stream.Trailer())
	header, err := stream.Header()
	require.NoError(t, err)
	assert.Equal(t, meta.Get(metaKey), header.Get(metaKey))
}

func TestUnaryHappyPath(t *testing.T) {
	ats := &test2.GrpcTestingServer{
		UnaryFunc: func(ctx context.Context, request *test2.Request) (*test2.Response, error) {
			val, err := strconv.ParseInt(request.S1, 10, 64)
			if err != nil {
				return nil, status.Error(codes.Unavailable, "unavailable")
			}
			incomingContext, _ := metadata.FromIncomingContext(ctx)
			meta := metadata.MD{}
			meta.Set(metaKey, incomingContext.Get(metaKey)...)
			err = grpc.SetHeader(ctx, meta)
			if err != nil {
				return nil, err
			}
			trailer := metadata.MD{}
			trailer.Set(trailerKey, "1", "2")
			err = grpc.SetTrailer(ctx, trailer)
			if err != nil {
				return nil, err
			}
			return &test2.Response{
				Message: &test2.Response_Scalar{
					Scalar: val,
				},
			}, nil
		},
	}
	runTest(t, ats, func(ctx context.Context, t *testing.T, client test2.TestingClient) {
		for i := 0; i < 2; i++ { // test several sequential requests
			testUnaryHappyPath(ctx, t, client)
		}
	})
}

func testUnaryHappyPath(ctx context.Context, t *testing.T, client test2.TestingClient) {
	meta := metadata.MD{}
	meta.Set(metaKey, "3", "4")
	ctx = metadata.NewOutgoingContext(ctx, meta)
	var (
		headerResp  metadata.MD
		trailerResp metadata.MD
	)
	// grpc.Header() and grpc.Trailer are ok here because its a unary RPC.
	resp, err := client.RequestResponse(ctx, &test2.Request{
		S1: "123",
	}, grpc.Header(&headerResp), grpc.Trailer(&trailerResp)) // nolint: forbidigo
	require.NoError(t, err)
	assert.EqualValues(t, 123, resp.Message.(*test2.Response_Scalar).Scalar)
	assert.Equal(t, meta.Get(metaKey), headerResp.Get(metaKey))
	trailer := metadata.MD{}
	trailer.Set(trailerKey, "1", "2")
	assert.Equal(t, trailer, trailerResp)
}

func TestStreamError(t *testing.T) {
	statusWithDetails, err := status.New(codes.InvalidArgument, "Some expected error").
		WithDetails(&test2.Request{S1: "some details of the error"})
	require.NoError(t, err)
	ats := &test2.GrpcTestingServer{
		StreamingFunc: func(server test2.Testing_StreamingRequestResponseServer) error {
			return statusWithDetails.Err()
		},
	}
	runTest(t, ats, func(ctx context.Context, t *testing.T, client test2.TestingClient) {
		ctx, cancel := context.WithCancel(ctx)
		defer cancel()
		stream, err := client.StreamingRequestResponse(ctx)
		require.NoError(t, err)
		_, err = stream.Recv()
		require.Error(t, err)
		receivedStatus := status.Convert(err).Proto()
		assert.Empty(t, cmp.Diff(receivedStatus, statusWithDetails.Proto(), protocmp.Transform()))
	})
}

func TestUnaryError(t *testing.T) {
	statusWithDetails, err := status.New(codes.InvalidArgument, "Some expected error").
		WithDetails(&test2.Request{S1: "some details of the error"})
	require.NoError(t, err)
	ats := &test2.GrpcTestingServer{
		UnaryFunc: func(ctx context.Context, request *test2.Request) (*test2.Response, error) {
			return nil, statusWithDetails.Err()
		},
	}
	runTest(t, ats, func(ctx context.Context, t *testing.T, client test2.TestingClient) {
		ctx, cancel := context.WithCancel(ctx)
		defer cancel()
		_, err := client.RequestResponse(ctx, &test2.Request{
			S1: "123",
		})
		require.Error(t, err)
		receivedStatus := status.Convert(err).Proto()
		assert.Empty(t, cmp.Diff(receivedStatus, statusWithDetails.Proto(), protocmp.Transform()))
	})
}

func runTest(t *testing.T, ats test2.TestingServer, f func(context.Context, *testing.T, test2.TestingClient)) {
	// Start/stop
	g, ctx := errgroup.WithContext(context.Background())
	ctx, cancel := context.WithCancel(ctx)

	// Construct server and agent components
	runServer, kasConn, serverInternalServerConn, serverRpcApi, tunnelRegisterer := serverConstructComponents(ctx, t)
	defer func() {
		assert.NoError(t, kasConn.Close())
		assert.NoError(t, serverInternalServerConn.Close())
	}()
	defer func() {
		assert.NoError(t, g.Wait())
	}()
	defer cancel()

	agentApi := mock_modagent.NewMockApi(gomock.NewController(t))
	runAgent, agentInternalServer := agentConstructComponents(ctx, t, kasConn, agentApi)
	agentInfo := testhelpers.AgentInfoObj()

	serverRpcApi.EXPECT().
		AgentInfo(gomock.Any(), gomock.Any()).
		Return(agentInfo, nil).
		MinTimes(1)

	tunnelRegisterer.EXPECT().
		RegisterTunnel(gomock.Any(), gomock.Any(), gomock.Any()).
		AnyTimes() // may be 0 if incoming connections arrive before tunnel connections
	tunnelRegisterer.EXPECT().
		UnregisterTunnel(gomock.Any(), gomock.Any()).
		AnyTimes()

	test2.RegisterTestingServer(agentInternalServer, ats)

	// Run all
	g.Go(func() error {
		return runServer(ctx)
	})
	g.Go(func() error {
		return runAgent(ctx)
	})

	// Test
	client := test2.NewTestingClient(serverInternalServerConn)
	f(ctx, t, client)
}

type serverTestingServer struct {
	tunnelFinder tunnel2.Finder
}

func (s *serverTestingServer) ForwardStream(srv interface{}, server grpc.ServerStream) error {
	ctx := server.Context()
	rpcApi := modserver.RpcApiFromContext(ctx)
	sts := grpc.ServerTransportStreamFromContext(ctx)
	service, method := grpctool2.SplitGrpcMethod(sts.Method())
	_, th := s.tunnelFinder.FindTunnel(ctx, testhelpers.AgentId, service, method)
	defer th.Done(ctx)
	tun, err := th.Get(ctx)
	if err != nil {
		return status.FromContextError(err).Err()
	}
	defer tun.Done(ctx)
	return tun.ForwardStream(rpcApi.Log(), rpcApi, server, streamingCallback{incomingStream: server})
}

// registerTestingServer is a test.RegisterTestingServer clone that's been modified to be compatible with
// reverse_tunnel.Finder.FindTunnel().
func registerTestingServer(s *grpc.Server, h *serverTestingServer) {
	// ServiceDesc must match test.Testing_ServiceDesc
	s.RegisterService(&grpc.ServiceDesc{
		ServiceName: test2.Testing_ServiceDesc.ServiceName,
		Streams: []grpc.StreamDesc{
			{
				StreamName:    "RequestResponse",
				Handler:       h.ForwardStream,
				ServerStreams: true,
				ClientStreams: true,
			},
			{
				StreamName:    "StreamingRequestResponse",
				Handler:       h.ForwardStream,
				ServerStreams: true,
				ClientStreams: true,
			},
		},
		Metadata: test2.Testing_ServiceDesc.Metadata,
	}, nil)
}

var (
	_ tunnel2.DataCallback = streamingCallback{}
)

type streamingCallback struct {
	incomingStream grpc.ServerStream
}

func (c streamingCallback) Header(md map[string]*prototool.Values) error {
	return c.incomingStream.SetHeader(grpctool2.ValuesMapToMeta(md))
}

func (c streamingCallback) Message(data []byte) error {
	return c.incomingStream.SendMsg(&grpctool2.RawFrame{Data: data})
}

func (c streamingCallback) Trailer(md map[string]*prototool.Values) error {
	c.incomingStream.SetTrailer(grpctool2.ValuesMapToMeta(md))
	return nil
}

func (c streamingCallback) Error(err *rpc.Error) error {
	// rpc.Error wraps a google.rpc.Status; forward as a gRPC status error
	if err == nil || err.Status == nil {
		return nil
	}
	return status.ErrorProto(err.Status)
}
