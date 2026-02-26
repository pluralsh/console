package tunnel

import (
	"context"
	"io"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/otel/trace"
	"go.uber.org/mock/gomock"
	"go.uber.org/zap/zaptest"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
	"k8s.io/apimachinery/pkg/util/wait"

	"github.com/pluralsh/kubernetes-agent/pkg/module/reverse_tunnel/info"
	"github.com/pluralsh/kubernetes-agent/pkg/module/reverse_tunnel/rpc"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/grpctool"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/prototool"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/matcher"
	mock_modserver2 "github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_modserver"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_reverse_tunnel_rpc"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_rpc"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/testhelpers"
)

// "slow" tests in this file are marked for concurrent execution with t.Parallel()

const (
	serviceName    = "gitlab.service1"
	methodName     = "DoSomething"
	fullMethodName = "/" + serviceName + "/" + methodName
)

var (
	_ Handler = &Registry{}
	_ Finder  = &Registry{}
	_ Querier = &Registry{}
)

func TestStopUnregistersAllConnections(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	mockApi := mock_modserver2.NewMockApi(ctrl)
	connectServer := mock_reverse_tunnel_rpc.NewMockReverseTunnel_ConnectServer[rpc.ConnectRequest, rpc.ConnectResponse](ctrl)
	tunnelTracker := NewMockTracker(ctrl)
	connectServer.EXPECT().
		Context().
		Return(context.Background()).
		MinTimes(1)
	gomock.InOrder(
		connectServer.EXPECT().
			Recv().
			Return(&rpc.ConnectRequest{
				Msg: &rpc.ConnectRequest_Descriptor_{
					Descriptor_: descriptor(),
				},
			}, nil),
		tunnelTracker.EXPECT().
			RegisterTunnel(gomock.Any(), gomock.Any(), gomock.Any()),
		tunnelTracker.EXPECT().
			UnregisterTunnel(gomock.Any(), gomock.Any()),
		mockApi.EXPECT().
			HandleProcessingError(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()),
	)
	r, err := NewRegistry(zaptest.NewLogger(t), mockApi, nt(), time.Minute, time.Minute, tunnelTracker)
	require.NoError(t, err)
	var wg wait.Group
	defer wg.Wait()
	wg.Start(func() {
		err = r.HandleTunnel(context.Background(), testhelpers.AgentInfoObj(), connectServer)
		assert.NoError(t, err)
	})
	time.Sleep(100 * time.Millisecond)
	tl, fl := r.stopInternal(context.Background())
	assert.EqualValues(t, 1, tl)
	assert.Zero(t, fl)
	for s := range r.stripes.Stripes {
		assert.Empty(t, r.stripes.Stripes[s].tunsByAgentId)
		assert.Empty(t, r.stripes.Stripes[s].findRequestsByAgentId)
	}
	tl, fl = r.stopInternal(context.Background())
	assert.Zero(t, tl)
	assert.Zero(t, fl)
}

func TestTunnelDoneRegistersUnusedTunnel(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	mockApi := mock_modserver2.NewMockApi(ctrl)
	connectServer := mock_reverse_tunnel_rpc.NewMockReverseTunnel_ConnectServer[rpc.ConnectRequest, rpc.ConnectResponse](ctrl)
	tunnelTracker := NewMockTracker(ctrl)
	connectServer.EXPECT().
		Context().
		Return(context.Background()).
		MinTimes(1)
	reg := make(chan struct{})
	gomock.InOrder(
		connectServer.EXPECT().
			Recv().
			Return(&rpc.ConnectRequest{
				Msg: &rpc.ConnectRequest_Descriptor_{
					Descriptor_: descriptor(),
				},
			}, nil),
		tunnelTracker.EXPECT(). // HandleTunnel()
					RegisterTunnel(gomock.Any(), gomock.Any(), gomock.Any()).
					Do(func(ctx context.Context, ttl time.Duration, agentId int64) error {
				close(reg)
				return nil
			}),
		// UnregisterTunnel, RegisterTunnel, UnregisterTunnel, RegisterTunnel don't happen here
		// because they are optimized away into no calls.
		tunnelTracker.EXPECT(). // stopInternal()
					UnregisterTunnel(gomock.Any(), gomock.Any()),
		mockApi.EXPECT().
			HandleProcessingError(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()),
	)
	agentInfo := testhelpers.AgentInfoObj()
	r, err := NewRegistry(zaptest.NewLogger(t), mockApi, nt(), time.Minute, time.Minute, tunnelTracker)
	require.NoError(t, err)
	var wg wait.Group
	defer wg.Wait()
	wg.Start(func() {
		err = r.HandleTunnel(context.Background(), agentInfo, connectServer)
		assert.NoError(t, err)
	})
	<-reg
	found, th := r.FindTunnel(context.Background(), agentInfo.Id, serviceName, methodName)
	assert.True(t, found)
	tun, err := th.Get(context.Background())
	require.NoError(t, err)
	tun.Done(context.Background())
	th.Done(context.Background())
	found, th = r.FindTunnel(context.Background(), agentInfo.Id, serviceName, methodName)
	assert.True(t, found)
	tun, err = th.Get(context.Background())
	require.NoError(t, err)
	tun.Done(context.Background())
	th.Done(context.Background())
	tl, fl := r.stopInternal(context.Background())
	assert.EqualValues(t, 1, tl)
	assert.Zero(t, fl)
}

func TestTunnelDoneDonePanics(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	mockApi := mock_modserver2.NewMockApi(ctrl)
	connectServer := mock_reverse_tunnel_rpc.NewMockReverseTunnel_ConnectServer[rpc.ConnectRequest, rpc.ConnectResponse](ctrl)
	tunnelTracker := NewMockTracker(ctrl)
	connectServer.EXPECT().
		Context().
		Return(context.Background()).
		MinTimes(1)
	reg := make(chan struct{})
	connectServer.EXPECT().
		Recv().
		Return(&rpc.ConnectRequest{
			Msg: &rpc.ConnectRequest_Descriptor_{
				Descriptor_: descriptor(),
			},
		}, nil)
	tunnelTracker.EXPECT().
		RegisterTunnel(gomock.Any(), gomock.Any(), gomock.Any()).
		Do(func(ctx context.Context, ttl time.Duration, agentId int64) error {
			close(reg)
			return nil
		})
	tunnelTracker.EXPECT().
		UnregisterTunnel(gomock.Any(), gomock.Any())
	mockApi.EXPECT().
		HandleProcessingError(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any())
	agentInfo := testhelpers.AgentInfoObj()
	r, err := NewRegistry(zaptest.NewLogger(t), mockApi, nt(), time.Minute, time.Minute, tunnelTracker)
	require.NoError(t, err)
	var wg wait.Group
	defer wg.Wait()
	wg.Start(func() {
		err = r.HandleTunnel(context.Background(), agentInfo, connectServer)
		assert.NoError(t, err)
	})
	<-reg
	found, th := r.FindTunnel(context.Background(), agentInfo.Id, serviceName, methodName)
	assert.True(t, found)
	tun, err := th.Get(context.Background())
	require.NoError(t, err)
	tun.Done(context.Background())
	assert.PanicsWithError(t, "unreachable: ready -> done should never happen", func() {
		tun.Done(context.Background())
	})
	th.Done(context.Background())
	tl, fl := r.stopInternal(context.Background())
	assert.EqualValues(t, 1, tl)
	assert.Zero(t, fl)
}

func TestHandleTunnelIsUnblockedByContext(t *testing.T) {
	t.Parallel()
	ctxConn, cancelConn := context.WithTimeout(context.Background(), 50*time.Millisecond) // will unblock HandleTunnel()
	defer cancelConn()

	ctrl := gomock.NewController(t)
	mockApi := mock_modserver2.NewMockApi(ctrl)
	connectServer := mock_reverse_tunnel_rpc.NewMockReverseTunnel_ConnectServer[rpc.ConnectRequest, rpc.ConnectResponse](ctrl)
	tunnelTracker := NewMockTracker(ctrl)
	connectServer.EXPECT().
		Context().
		Return(context.Background()).
		MinTimes(1)
	gomock.InOrder(
		connectServer.EXPECT().
			Recv().
			Return(&rpc.ConnectRequest{
				Msg: &rpc.ConnectRequest_Descriptor_{
					Descriptor_: descriptor(),
				},
			}, nil),
		tunnelTracker.EXPECT().
			RegisterTunnel(gomock.Any(), gomock.Any(), gomock.Any()),
		tunnelTracker.EXPECT().
			UnregisterTunnel(gomock.Any(), gomock.Any()),
	)
	r, err := NewRegistry(zaptest.NewLogger(t), mockApi, nt(), time.Minute, time.Minute, tunnelTracker)
	require.NoError(t, err)
	err = r.HandleTunnel(ctxConn, testhelpers.AgentInfoObj(), connectServer)
	assert.NoError(t, err)
	tl, fl := r.stopInternal(context.Background())
	assert.Zero(t, tl)
	assert.Zero(t, fl)
}

// Two tunnels with the same agent id. Both register. Then one of them is retrieved via FindTunnel()
// and then its context is cancelled. If this test gets stuck, we have a problem.
// Reproducer for https://gitlab.com/gitlab-org/cluster-integration/gitlab-agent/-/issues/183.
func TestHandleTunnelIsUnblockedByContext_WithTwoTunnels(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	mockApi := mock_modserver2.NewMockApi(ctrl)
	connectServer1 := mock_reverse_tunnel_rpc.NewMockReverseTunnel_ConnectServer[rpc.ConnectRequest, rpc.ConnectResponse](ctrl)
	connectServer2 := mock_reverse_tunnel_rpc.NewMockReverseTunnel_ConnectServer[rpc.ConnectRequest, rpc.ConnectResponse](ctrl)
	tunnelTracker := NewMockTracker(ctrl)
	connectServer1.EXPECT().
		Context().
		Return(context.Background()).
		MinTimes(1)
	connectServer2.EXPECT().
		Context().
		Return(context.Background()).
		MinTimes(1)
	d1 := descriptor()
	connectServer1.EXPECT().
		Recv().
		Return(&rpc.ConnectRequest{
			Msg: &rpc.ConnectRequest_Descriptor_{
				Descriptor_: d1,
			},
		}, nil)
	connectServer2.EXPECT().
		Recv().
		Return(&rpc.ConnectRequest{
			Msg: &rpc.ConnectRequest_Descriptor_{
				Descriptor_: descriptor(),
			},
		}, nil)
	gomock.InOrder(
		tunnelTracker.EXPECT().
			RegisterTunnel(gomock.Any(), gomock.Any(), gomock.Any()),
		tunnelTracker.EXPECT().
			UnregisterTunnel(gomock.Any(), gomock.Any()),
	)
	r, err := NewRegistry(zaptest.NewLogger(t), mockApi, nt(), time.Minute, time.Minute, tunnelTracker)
	require.NoError(t, err)
	defer r.stopInternal(context.Background())
	var wg wait.Group
	defer wg.Wait()
	agentInfo := testhelpers.AgentInfoObj()
	ctx1, cancel1 := context.WithCancel(context.Background())
	defer cancel1()
	wg.Start(func() {
		assert.NoError(t, r.HandleTunnel(ctx1, agentInfo, connectServer1))
	})
	ctx2, cancel2 := context.WithCancel(context.Background())
	defer cancel2()
	wg.Start(func() {
		assert.NoError(t, r.HandleTunnel(ctx2, agentInfo, connectServer2))
	})
	// wait for both to register
	agentStripe := r.stripes.GetPointer(agentInfo.Id)
	assert.Eventually(t, func() bool {
		agentStripe.mu.Lock()
		defer agentStripe.mu.Unlock()
		return len(agentStripe.tunsByAgentId[agentInfo.Id].tuns) == 2
	}, time.Second, 10*time.Millisecond)
	found, th := r.FindTunnel(context.Background(), agentInfo.Id, serviceName, methodName)
	assert.True(t, found)
	tun, err := th.Get(context.Background())
	require.NoError(t, err)
	// cancel context for the found tunnel
	switch tun.(*tunnelImpl).tunnel {
	case connectServer1:
		cancel1()
	case connectServer2:
		cancel2()
	default:
		t.FailNow()
	}
	assert.Eventually(t, func() bool {
		agentStripe.mu.Lock()
		defer agentStripe.mu.Unlock()
		return tun.(*tunnelImpl).state == stateContextDone
	}, time.Second, 10*time.Millisecond)
	tun.Done(context.Background())
	th.Done(context.Background())
}

func TestHandleTunnelReturnErrOnRecvErr(t *testing.T) {
	ctrl := gomock.NewController(t)
	mockApi := mock_modserver2.NewMockApi(ctrl)
	connectServer := mock_reverse_tunnel_rpc.NewMockReverseTunnel_ConnectServer[rpc.ConnectRequest, rpc.ConnectResponse](ctrl)
	connectServer.EXPECT().
		Context().
		Return(context.Background()).
		MinTimes(1)
	connectServer.EXPECT().
		Recv().
		Return(nil, status.Error(codes.DataLoss, "expected err"))
	tunnelTracker := NewMockTracker(ctrl)
	r, err := NewRegistry(zaptest.NewLogger(t), mockApi, nt(), time.Minute, time.Minute, tunnelTracker)
	require.NoError(t, err)
	err = r.HandleTunnel(context.Background(), testhelpers.AgentInfoObj(), connectServer)
	assert.EqualError(t, err, "rpc error: code = DataLoss desc = expected err")
}

func TestHandleTunnelReturnErrOnInvalidMsg(t *testing.T) {
	ctrl := gomock.NewController(t)
	mockApi := mock_modserver2.NewMockApi(ctrl)
	connectServer := mock_reverse_tunnel_rpc.NewMockReverseTunnel_ConnectServer[rpc.ConnectRequest, rpc.ConnectResponse](ctrl)
	connectServer.EXPECT().
		Context().
		Return(context.Background()).
		MinTimes(1)
	connectServer.EXPECT().
		Recv().
		Return(&rpc.ConnectRequest{
			Msg: &rpc.ConnectRequest_Header{
				Header: &rpc.Header{},
			},
		}, nil)
	tunnelTracker := NewMockTracker(ctrl)
	r, err := NewRegistry(zaptest.NewLogger(t), mockApi, nt(), time.Minute, time.Minute, tunnelTracker)
	require.NoError(t, err)
	err = r.HandleTunnel(context.Background(), testhelpers.AgentInfoObj(), connectServer)
	assert.EqualError(t, err, "rpc error: code = InvalidArgument desc = Invalid oneof value type: *rpc.ConnectRequest_Header")
}

func TestHandleTunnelIsMatchedToIncomingConnection(t *testing.T) {
	t.Parallel()
	incomingStream, rpcApi, cb, tunnel, r := setupStreams(t, true)
	agentInfo := testhelpers.AgentInfoObj()
	var wg wait.Group
	defer wg.Wait()
	defer func() {
		tl, fl := r.stopInternal(context.Background())
		assert.Zero(t, tl)
		assert.Zero(t, fl)
	}()
	wg.Start(func() {
		assert.NoError(t, r.HandleTunnel(context.Background(), agentInfo, tunnel))
	})
	time.Sleep(50 * time.Millisecond)
	found, th := r.FindTunnel(context.Background(), agentInfo.Id, serviceName, methodName)
	defer th.Done(context.Background())
	assert.True(t, found)
	tun, err := th.Get(context.Background())
	require.NoError(t, err)
	defer tun.Done(context.Background())
	err = tun.ForwardStream(zaptest.NewLogger(t), rpcApi, incomingStream, cb)
	require.NoError(t, err)
}

func TestHandleTunnelIsNotMatchedToIncomingConnectionForMissingMethod(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	mockApi := mock_modserver2.NewMockApi(ctrl)
	tunnelTracker := NewMockTracker(ctrl)
	connectServer := mock_reverse_tunnel_rpc.NewMockReverseTunnel_ConnectServer[rpc.ConnectRequest, rpc.ConnectResponse](ctrl)
	connectServer.EXPECT().
		Context().
		Return(context.Background()).
		MinTimes(1)
	connectServer.EXPECT().
		Recv().
		Return(&rpc.ConnectRequest{
			Msg: &rpc.ConnectRequest_Descriptor_{
				Descriptor_: descriptor(),
			},
		}, nil)
	gomock.InOrder(
		tunnelTracker.EXPECT().
			RegisterTunnel(gomock.Any(), gomock.Any(), gomock.Any()),
		tunnelTracker.EXPECT().
			UnregisterTunnel(gomock.Any(), gomock.Any()),
		mockApi.EXPECT().
			HandleProcessingError(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()),
	)
	r, err := NewRegistry(zaptest.NewLogger(t), mockApi, nt(), time.Minute, time.Minute, tunnelTracker)
	require.NoError(t, err)
	agentInfo := testhelpers.AgentInfoObj()
	var wg wait.Group
	defer wg.Wait()
	defer r.stopInternal(context.Background())
	wg.Start(func() {
		assert.NoError(t, r.HandleTunnel(context.Background(), agentInfo, connectServer))
	})
	time.Sleep(50 * time.Millisecond)
	ctx2, cancel2 := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel2()
	found, th := r.FindTunnel(context.Background(), agentInfo.Id, "missing_service", "missing_method")
	defer th.Done(context.Background())
	assert.False(t, found)
	_, err = th.Get(ctx2)
	assert.EqualError(t, err, "rpc error: code = DeadlineExceeded desc = FindTunnel request aborted: context deadline exceeded")
}

func TestForwardStreamIsMatchedToHandleTunnel(t *testing.T) {
	t.Parallel()
	incomingStream, rpcApi, cb, tunnel, r := setupStreams(t, false)
	agentInfo := testhelpers.AgentInfoObj()
	var wg wait.Group
	defer wg.Wait()
	defer func() {
		tl, fl := r.stopInternal(context.Background())
		assert.Zero(t, tl)
		assert.Zero(t, fl)
	}()
	wg.Start(func() {
		_, th := r.FindTunnel(context.Background(), agentInfo.Id, serviceName, methodName)
		defer th.Done(context.Background())
		tun, err := th.Get(context.Background())
		if !assert.NoError(t, err) {
			return
		}
		defer tun.Done(context.Background())
		err = tun.ForwardStream(zaptest.NewLogger(t), rpcApi, incomingStream, cb)
		assert.NoError(t, err)
	})
	time.Sleep(50 * time.Millisecond)
	err := r.HandleTunnel(context.Background(), agentInfo, tunnel)
	require.NoError(t, err)
}

func TestForwardStreamIsNotMatchedToHandleTunnelForMissingMethod(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	mockApi := mock_modserver2.NewMockApi(ctrl)
	tunnelTracker := NewMockTracker(ctrl)
	connectServer := mock_reverse_tunnel_rpc.NewMockReverseTunnel_ConnectServer[rpc.ConnectRequest, rpc.ConnectResponse](ctrl)
	connectServer.EXPECT().
		Context().
		Return(context.Background()).
		MinTimes(1)
	connectServer.EXPECT().
		Recv().
		Return(&rpc.ConnectRequest{
			Msg: &rpc.ConnectRequest_Descriptor_{
				Descriptor_: descriptor(),
			},
		}, nil)
	gomock.InOrder(
		tunnelTracker.EXPECT().
			RegisterTunnel(gomock.Any(), gomock.Any(), gomock.Any()),
		tunnelTracker.EXPECT().
			UnregisterTunnel(gomock.Any(), gomock.Any()),
		mockApi.EXPECT().
			HandleProcessingError(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()),
	)
	r, err := NewRegistry(zaptest.NewLogger(t), mockApi, nt(), time.Minute, time.Minute, tunnelTracker)
	require.NoError(t, err)
	agentInfo := testhelpers.AgentInfoObj()
	var wg wait.Group
	defer wg.Wait()
	defer r.stopInternal(context.Background())
	wg.Start(func() {
		found, th := r.FindTunnel(context.Background(), agentInfo.Id, "missing_service", "missing_method")
		defer th.Done(context.Background())
		assert.False(t, found)
		_, findErr := th.Get(context.Background())
		assert.EqualError(t, findErr, "rpc error: code = Unavailable desc = kas is shutting down")
	})
	time.Sleep(50 * time.Millisecond)
	ctx2, cancel2 := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel2()
	err = r.HandleTunnel(ctx2, agentInfo, connectServer)
	assert.NoError(t, err)
}

func TestFindTunnelIsUnblockedByContext(t *testing.T) {
	t.Parallel()
	ctxConn, cancelConn := context.WithTimeout(context.Background(), 50*time.Millisecond) // will unblock FindTunnel()
	defer cancelConn()

	ctrl := gomock.NewController(t)
	mockApi := mock_modserver2.NewMockApi(ctrl)
	tunnelTracker := NewMockTracker(ctrl)
	r, err := NewRegistry(zaptest.NewLogger(t), mockApi, nt(), time.Minute, time.Minute, tunnelTracker)
	require.NoError(t, err)
	found, th := r.FindTunnel(context.Background(), testhelpers.AgentId, serviceName, methodName)
	defer th.Done(context.Background())
	assert.False(t, found)
	_, err = th.Get(ctxConn)
	assert.EqualError(t, err, "rpc error: code = DeadlineExceeded desc = FindTunnel request aborted: context deadline exceeded")
}

func TestRefreshRegistrations(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	mockApi := mock_modserver2.NewMockApi(ctrl)
	tunnelTracker := NewMockTracker(ctrl)
	r, err := NewRegistry(zaptest.NewLogger(t), mockApi, nt(), time.Minute, time.Minute, tunnelTracker)
	require.NoError(t, err)
	tunnelTracker.EXPECT().
		Refresh(gomock.Any(), gomock.Any()).
		Times(len(r.stripes.Stripes))

	r.refreshRegistrations(context.Background())
}

func setupStreams(t *testing.T, expectRegisterTunnel bool) (*mock_rpc.MockServerStream, *mock_modserver2.MockAgentRpcApi, *MockDataCallback, *mock_reverse_tunnel_rpc.MockReverseTunnel_ConnectServer[rpc.ConnectRequest, rpc.ConnectResponse], *Registry) {
	const metaKey = "Cba"
	meta := metadata.MD{}
	meta.Set(metaKey, "3", "4")
	ctrl := gomock.NewController(t)
	mockApi := mock_modserver2.NewMockApi(ctrl)
	sts := mock_rpc.NewMockServerTransportStream(ctrl)
	cb := NewMockDataCallback(ctrl)

	rpcApi := mock_modserver2.NewMockAgentRpcApi(ctrl)
	incomingCtx := grpc.NewContextWithServerTransportStream(context.Background(), sts)
	incomingCtx = metadata.NewIncomingContext(incomingCtx, meta)
	incomingStream := mock_rpc.NewMockServerStream(ctrl)
	incomingStream.EXPECT().
		Context().
		Return(incomingCtx).
		MinTimes(1)

	tunnelTracker := NewMockTracker(ctrl)
	connectServer := mock_reverse_tunnel_rpc.NewMockReverseTunnel_ConnectServer[rpc.ConnectRequest, rpc.ConnectResponse](ctrl)
	connectServer.EXPECT().
		Context().
		Return(context.Background()).
		MinTimes(1)
	connectServer.EXPECT().
		Recv().
		Return(&rpc.ConnectRequest{
			Msg: &rpc.ConnectRequest_Descriptor_{
				Descriptor_: descriptor(),
			},
		}, nil)
	if expectRegisterTunnel {
		gomock.InOrder(
			tunnelTracker.EXPECT().
				RegisterTunnel(gomock.Any(), gomock.Any(), gomock.Any()),
			tunnelTracker.EXPECT().
				UnregisterTunnel(gomock.Any(), gomock.Any()),
		)
	}
	frame := grpctool.RawFrame{
		Data: []byte{1, 2, 3},
	}
	gomock.InOrder(
		sts.EXPECT().
			Method().
			Return(fullMethodName).
			MinTimes(1),
		connectServer.EXPECT().
			Send(matcher.ProtoEq(t, &rpc.ConnectResponse{
				Msg: &rpc.ConnectResponse_RequestInfo{
					RequestInfo: &rpc.RequestInfo{
						MethodName: fullMethodName,
						Meta: map[string]*prototool.Values{
							"cba": {Value: []string{"3", "4"}},
						},
					},
				},
			})),
		incomingStream.EXPECT().
			RecvMsg(gomock.Any()).
			Do(testhelpers.RecvMsg(&frame)),
		connectServer.EXPECT().
			Send(matcher.ProtoEq(t, &rpc.ConnectResponse{
				Msg: &rpc.ConnectResponse_Message{
					Message: &rpc.Message{
						Data: frame.Data,
					},
				},
			})),
		incomingStream.EXPECT().
			RecvMsg(gomock.Any()).
			Return(io.EOF),
		connectServer.EXPECT().
			Send(matcher.ProtoEq(t, &rpc.ConnectResponse{
				Msg: &rpc.ConnectResponse_CloseSend{
					CloseSend: &rpc.CloseSend{},
				},
			})),
	)
	gomock.InOrder(
		connectServer.EXPECT().
			RecvMsg(gomock.Any()).
			Do(testhelpers.RecvMsg(&rpc.ConnectRequest{
				Msg: &rpc.ConnectRequest_Header{
					Header: &rpc.Header{
						Meta: map[string]*prototool.Values{
							"resp": {Value: []string{"1", "2"}},
						},
					},
				},
			})),
		cb.EXPECT().
			Header(map[string]*prototool.Values{
				"resp": {Value: []string{"1", "2"}},
			}),
		connectServer.EXPECT().
			RecvMsg(gomock.Any()).
			Do(testhelpers.RecvMsg(&rpc.ConnectRequest{
				Msg: &rpc.ConnectRequest_Message{
					Message: &rpc.Message{
						Data: []byte{5, 6, 7},
					},
				},
			})),
		cb.EXPECT().
			Message([]byte{5, 6, 7}),
		connectServer.EXPECT().
			RecvMsg(gomock.Any()).
			Do(testhelpers.RecvMsg(&rpc.ConnectRequest{
				Msg: &rpc.ConnectRequest_Trailer{
					Trailer: &rpc.Trailer{
						Meta: map[string]*prototool.Values{
							"trailer": {Value: []string{"8", "9"}},
						},
					},
				},
			})),
		cb.EXPECT().
			Trailer(map[string]*prototool.Values{
				"trailer": {Value: []string{"8", "9"}},
			}),
		connectServer.EXPECT().
			RecvMsg(gomock.Any()).
			Return(io.EOF),
	)

	r, err := NewRegistry(zaptest.NewLogger(t), mockApi, nt(), time.Minute, time.Minute, tunnelTracker)
	require.NoError(t, err)
	return incomingStream, rpcApi, cb, connectServer, r
}

func descriptor() *rpc.Descriptor {
	return &rpc.Descriptor{
		AgentDescriptor: &info.AgentDescriptor{
			Services: []*info.Service{
				{
					Name: serviceName,
					Methods: []*info.Method{
						{
							Name: methodName,
						},
					},
				},
			},
		},
	}
}

func nt() trace.Tracer {
	return trace.NewNoopTracerProvider().Tracer("test")
}
