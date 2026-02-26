package tunnel

import (
	"context"
	"errors"
	"io"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
	statuspb "google.golang.org/genproto/googleapis/rpc/status"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/pluralsh/kubernetes-agent/pkg/module/reverse_tunnel/rpc"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/grpctool"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/matcher"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_reverse_tunnel_rpc"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_rpc"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/testhelpers"
)

var (
	_ Tunnel = &tunnelImpl{}
)

func TestTunnel_ForwardStream_VisitorErrorIsReturnedOnErrorMessageAndReadError(t *testing.T) {
	ctrl := gomock.NewController(t)
	tunnelRetErr := make(chan error)
	tunnelStreamVisitor, err := grpctool.NewStreamVisitor(&rpc.ConnectRequest{})
	require.NoError(t, err)
	connectServer := mock_reverse_tunnel_rpc.NewMockReverseTunnel_ConnectServer[rpc.ConnectRequest, rpc.ConnectResponse](ctrl)
	incomingStream := mock_rpc.NewMockServerStream(ctrl)
	sts := mock_rpc.NewMockServerTransportStream(ctrl)
	incomingCtx := grpc.NewContextWithServerTransportStream(context.Background(), sts)
	cb := NewMockDataCallback(ctrl)
	incomingStream.EXPECT().
		Context().
		Return(incomingCtx).
		MinTimes(1)
	sts.EXPECT().
		Method().
		Return("some method")

	gomock.InOrder(
		connectServer.EXPECT().
			Send(gomock.Any()),
		incomingStream.EXPECT().
			RecvMsg(gomock.Any()).
			DoAndReturn(func(x interface{}) error {
				<-tunnelRetErr // wait until the other goroutine finished
				return errors.New("failed read")
			}),
	)

	stat := &statuspb.Status{
		Code:    int32(codes.DataLoss),
		Message: "expected data loss",
	}
	gomock.InOrder(
		connectServer.EXPECT().
			RecvMsg(gomock.Any()).
			Do(testhelpers.RecvMsg(&rpc.ConnectRequest{
				Msg: &rpc.ConnectRequest_Error{
					Error: &rpc.Error{
						Status: stat,
					},
				},
			})),
		cb.EXPECT().
			Error(matcher.ProtoEq(t, &rpc.Error{Status: stat})),
		connectServer.EXPECT().
			RecvMsg(gomock.Any()).
			Return(errors.New("correct error")),
	)
	c := tunnelImpl{
		tunnel:              connectServer,
		tunnelStreamVisitor: tunnelStreamVisitor,
		tunnelRetErr:        tunnelRetErr,
		onForward: func(t *tunnelImpl) error {
			return nil
		},
		onDone: func(ctx context.Context, t *tunnelImpl) {},
	}
	err = c.ForwardStream(nil, nil, incomingStream, cb)
	assert.EqualError(t, err, "correct error")
}

func TestTunnel_ForwardStream_IsUnblockedWhenIncomingStreamContextIsCancelledAfterSendingAllData(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	tunnelRetErr := make(chan error, 1)
	tunnelStreamVisitor, err := grpctool.NewStreamVisitor(&rpc.ConnectRequest{})
	require.NoError(t, err)
	connectServer := mock_reverse_tunnel_rpc.NewMockReverseTunnel_ConnectServer[rpc.ConnectRequest, rpc.ConnectResponse](ctrl)
	incomingStream := mock_rpc.NewMockServerStream(ctrl)
	sts := mock_rpc.NewMockServerTransportStream(ctrl)
	incomingCtx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()
	incomingCtx = grpc.NewContextWithServerTransportStream(incomingCtx, sts)
	cb := NewMockDataCallback(ctrl)
	incomingStream.EXPECT().
		Context().
		Return(incomingCtx).
		MinTimes(1)
	sts.EXPECT().
		Method().
		Return("some method")

	gomock.InOrder( //
		connectServer.EXPECT().
			Send(gomock.Any()), // ConnectResponse_RequestInfo
		incomingStream.EXPECT().
			RecvMsg(gomock.Any()).
			Return(io.EOF),
		connectServer.EXPECT().
			Send(gomock.Any()), // ConnectResponse_CloseSend
	)

	recvChan := make(chan struct{})
	connectServer.EXPECT().
		RecvMsg(gomock.Any()).
		DoAndReturn(func(msg interface{}) error {
			<-recvChan
			return status.Error(codes.DataLoss, "boom")
		})

	c := tunnelImpl{
		tunnel:              connectServer,
		tunnelStreamVisitor: tunnelStreamVisitor,
		tunnelRetErr:        tunnelRetErr,
		onForward: func(t *tunnelImpl) error {
			return nil
		},
		onDone: func(ctx context.Context, t *tunnelImpl) {},
	}
	err = c.ForwardStream(nil, nil, incomingStream, cb)
	assert.EqualError(t, err, "rpc error: code = DeadlineExceeded desc = Incoming stream closed: context deadline exceeded")
	err = <-tunnelRetErr
	assert.EqualError(t, err, "rpc error: code = DeadlineExceeded desc = Incoming stream closed: context deadline exceeded")
	close(recvChan) // unblock recv
}
