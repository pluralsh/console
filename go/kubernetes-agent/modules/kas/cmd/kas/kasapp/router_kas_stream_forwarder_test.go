package kasapp

import (
	"errors"
	"io"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
	"go.uber.org/zap/zaptest"
	statuspb "google.golang.org/genproto/googleapis/rpc/status"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/pluralsh/kubernetes-agent/pkg/tool/grpctool"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_modserver"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_rpc"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/testhelpers"
)

func TestStreamForwarder_ErrorFromRecvOnSendEof(t *testing.T) {
	f, kasStream, stream := setupForwarder(t)
	sendDone := make(chan struct{})

	// pipeFromKasToStream
	kasStream.EXPECT().
		RecvMsg(gomock.Any()).
		DoAndReturn(func(m interface{}) error {
			<-sendDone
			time.Sleep(20 * time.Millisecond)
			return status.Error(codes.InvalidArgument, "expected error from RecvMsg")
		})
	gomock.InOrder( // pipeFromStreamToKas
		stream.EXPECT().
			RecvMsg(gomock.Any()),
		kasStream.EXPECT().
			SendMsg(gomock.Any()).
			DoAndReturn(func(m interface{}) error {
				close(sendDone)
				return io.EOF // there is an error, call RecvMsg() to get it
			}),
	)
	err := f.ForwardStream(kasStream, stream)
	require.EqualError(t, err, "rpc error: code = InvalidArgument desc = expected error from RecvMsg")
}

func TestStreamForwarder_VisitorErrorPreferredToGatewayError(t *testing.T) {
	f, kasStream, stream := setupForwarder(t)
	stop := make(chan struct{})
	stopped := make(chan struct{})
	gomock.InOrder( // pipeFromKasToStream
		kasStream.EXPECT().
			RecvMsg(gomock.Any()).
			Do(testhelpers.RecvMsg(&GatewayKasResponse{
				Msg: &GatewayKasResponse_Header_{
					Header: &GatewayKasResponse_Header{},
				},
			})),
		stream.EXPECT().
			SetHeader(gomock.Any()),
		kasStream.EXPECT().
			RecvMsg(gomock.Any()).
			Do(testhelpers.RecvMsg(&GatewayKasResponse{
				Msg: &GatewayKasResponse_Trailer_{
					Trailer: &GatewayKasResponse_Trailer{},
				},
			})),
		stream.EXPECT().
			SetTrailer(gomock.Any()),
		kasStream.EXPECT().
			RecvMsg(gomock.Any()).
			Do(testhelpers.RecvMsg(&GatewayKasResponse{
				Msg: &GatewayKasResponse_Error_{
					Error: &GatewayKasResponse_Error{
						Status: &statuspb.Status{
							Code:    int32(codes.NotFound),
							Message: "something not found",
						},
					},
				},
			})),
		kasStream.EXPECT().
			RecvMsg(gomock.Any()).
			Return(errors.New("visitor error")),
	)
	gomock.InOrder( // pipeFromStreamToKas
		stream.EXPECT().
			RecvMsg(gomock.Any()).
			DoAndReturn(func(m interface{}) error {
				<-stop // as if this method is blocked on reading from the client
				return io.EOF
			}),
		kasStream.EXPECT().
			CloseSend().
			Do(func() error {
				close(stopped)
				return nil
			}),
	)
	err := f.ForwardStream(kasStream, stream)
	require.EqualError(t, err, "visitor error")
	// ForwardStream returned before stream.RecvMsg(), aborting it, as expected.
	close(stop) // Unblock stream.RecvMsg()
	<-stopped
}

func TestStreamForwarder_GatewayError(t *testing.T) {
	f, kasStream, stream := setupForwarder(t)
	stop := make(chan struct{})
	stopped := make(chan struct{})
	gomock.InOrder( // pipeFromKasToStream
		kasStream.EXPECT().
			RecvMsg(gomock.Any()).
			Do(testhelpers.RecvMsg(&GatewayKasResponse{
				Msg: &GatewayKasResponse_Header_{
					Header: &GatewayKasResponse_Header{},
				},
			})),
		stream.EXPECT().
			SetHeader(gomock.Any()),
		kasStream.EXPECT().
			RecvMsg(gomock.Any()).
			Do(testhelpers.RecvMsg(&GatewayKasResponse{
				Msg: &GatewayKasResponse_Trailer_{
					Trailer: &GatewayKasResponse_Trailer{},
				},
			})),
		stream.EXPECT().
			SetTrailer(gomock.Any()),
		kasStream.EXPECT().
			RecvMsg(gomock.Any()).
			Do(testhelpers.RecvMsg(&GatewayKasResponse{
				Msg: &GatewayKasResponse_Error_{
					Error: &GatewayKasResponse_Error{
						Status: &statuspb.Status{
							Code:    int32(codes.NotFound),
							Message: "something not found",
						},
					},
				},
			})),
		kasStream.EXPECT().
			RecvMsg(gomock.Any()).
			Return(io.EOF),
	)
	gomock.InOrder( // pipeFromStreamToKas
		stream.EXPECT().
			RecvMsg(gomock.Any()).
			DoAndReturn(func(m any) error {
				<-stop // as if this method is blocked on reading from the client
				return io.EOF
			}),
		kasStream.EXPECT().
			CloseSend().
			Do(func() error {
				close(stopped)
				return nil
			}),
	)
	err := f.ForwardStream(kasStream, stream)
	require.EqualError(t, err, "rpc error: code = NotFound desc = something not found")
	// ForwardStream returned before stream.RecvMsg(), aborting it, as expected.
	close(stop) // Unblock stream.RecvMsg()
	<-stopped
}

func setupForwarder(t *testing.T) (*kasStreamForwarder, *mock_rpc.MockClientStream, *mock_rpc.MockServerStream) {
	ctrl := gomock.NewController(t)
	rpcApi := mock_modserver.NewMockRpcApi(ctrl)
	kasStream := mock_rpc.NewMockClientStream(ctrl)
	stream := mock_rpc.NewMockServerStream(ctrl)
	gatewayKasVisitor, err := grpctool.NewStreamVisitor(&GatewayKasResponse{})
	require.NoError(t, err)
	f := &kasStreamForwarder{
		log:               zaptest.NewLogger(t),
		rpcApi:            rpcApi,
		gatewayKasVisitor: gatewayKasVisitor,
	}
	return f, kasStream, stream
}
