package kasapp

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
	"go.uber.org/zap/zaptest"

	"github.com/pluralsh/kubernetes-agent/pkg/module/reverse_tunnel/tunnel"
	grpctool2 "github.com/pluralsh/kubernetes-agent/pkg/tool/grpctool"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_modserver"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_reverse_tunnel_tunnel"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_rpc"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/testhelpers"
)

const (
	selfAddr   = "grpc://self"
	kasUrlPipe = "grpc://pipe"
)

func TestTunnelFinder_PollStartsSingleGoroutineForUrl(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	tf, querier, rpcApi, kasPool := setupTunnelFinder(ctx, t)

	var wg sync.WaitGroup
	wg.Add(2)

	gomock.InOrder(
		kasPool.EXPECT().
			Dial(gomock.Any(), selfAddr).
			DoAndReturn(func(ctx context.Context, targetUrl string) (grpctool2.PoolConn, error) {
				wg.Done()
				<-ctx.Done() // block to simulate a long running dial
				return nil, ctx.Err()
			}),
		rpcApi.EXPECT().
			HandleProcessingError(gomock.Any(), testhelpers.AgentId, gomock.Any(), gomock.Any()),
	)
	gomock.InOrder(
		querier.EXPECT().
			CachedKasUrlsByAgentId(testhelpers.AgentId),
		querier.EXPECT().
			PollKasUrlsByAgentId(gomock.Any(), testhelpers.AgentId, gomock.Any()).
			Do(func(ctx context.Context, agentId int64, cb tunnel.PollKasUrlsByAgentIdCallback) {
				cb([]string{kasUrlPipe})
				cb([]string{kasUrlPipe}) // same thing two times
				wg.Wait()
				cancel()
				<-ctx.Done()
			}),
	)
	gomock.InOrder(
		kasPool.EXPECT().
			Dial(gomock.Any(), kasUrlPipe).
			DoAndReturn(func(ctx context.Context, targetUrl string) (grpctool2.PoolConn, error) {
				wg.Done()
				<-ctx.Done() // block to simulate a long running dial
				return nil, ctx.Err()
			}),
		rpcApi.EXPECT().
			HandleProcessingError(gomock.Any(), testhelpers.AgentId, gomock.Any(), gomock.Any()),
	)

	_, err := tf.Find(ctx)
	assert.Same(t, context.Canceled, err)
	assert.Len(t, tf.connections, 2)
	assert.Contains(t, tf.connections, selfAddr)
	assert.Contains(t, tf.connections, kasUrlPipe)
}

func TestTunnelFinder_PollStartsGoroutineForEachUrl(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	tf, querier, rpcApi, kasPool := setupTunnelFinder(ctx, t)

	var wg sync.WaitGroup
	wg.Add(3)

	gomock.InOrder(
		kasPool.EXPECT().
			Dial(gomock.Any(), selfAddr).
			DoAndReturn(func(ctx context.Context, targetUrl string) (grpctool2.PoolConn, error) {
				wg.Done()
				<-ctx.Done() // block to simulate a long running dial
				return nil, ctx.Err()
			}),
		rpcApi.EXPECT().
			HandleProcessingError(gomock.Any(), testhelpers.AgentId, gomock.Any(), gomock.Any()),
	)
	gomock.InOrder(
		querier.EXPECT().
			CachedKasUrlsByAgentId(testhelpers.AgentId),
		querier.EXPECT().
			PollKasUrlsByAgentId(gomock.Any(), testhelpers.AgentId, gomock.Any()).
			Do(func(ctx context.Context, agentId int64, cb tunnel.PollKasUrlsByAgentIdCallback) {
				cb([]string{kasUrlPipe, "grpc://pipe2"})
				wg.Wait()
				cancel()
				<-ctx.Done()
			}),
	)
	kasPool.EXPECT().
		Dial(gomock.Any(), kasUrlPipe).
		DoAndReturn(func(ctx context.Context, targetUrl string) (grpctool2.PoolConn, error) {
			wg.Done()
			<-ctx.Done() // block to simulate a long running dial
			return nil, ctx.Err()
		})
	kasPool.EXPECT().
		Dial(gomock.Any(), "grpc://pipe2").
		DoAndReturn(func(ctx context.Context, targetUrl string) (grpctool2.PoolConn, error) {
			wg.Done()
			<-ctx.Done() // block to simulate a long running dial
			return nil, ctx.Err()
		})
	rpcApi.EXPECT().
		HandleProcessingError(gomock.Any(), testhelpers.AgentId, gomock.Any(), gomock.Any()).
		Times(2)
	_, err := tf.Find(ctx)
	assert.Same(t, context.Canceled, err)
	assert.Len(t, tf.connections, 3)
	assert.Contains(t, tf.connections, selfAddr)
	assert.Contains(t, tf.connections, kasUrlPipe)
	assert.Contains(t, tf.connections, "grpc://pipe2")
}

func TestTunnelFinder_StopTryingAbsentKasUrl(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	tf, querier, rpcApi, kasPool := setupTunnelFinder(ctx, t)

	var wg sync.WaitGroup
	wg.Add(2)

	gomock.InOrder(
		kasPool.EXPECT().
			Dial(gomock.Any(), selfAddr).
			DoAndReturn(func(ctx context.Context, targetUrl string) (grpctool2.PoolConn, error) {
				wg.Done()
				<-ctx.Done() // block to simulate a long running dial
				return nil, ctx.Err()
			}),
		rpcApi.EXPECT().
			HandleProcessingError(gomock.Any(), testhelpers.AgentId, gomock.Any(), gomock.Any()),
	)
	gomock.InOrder(
		querier.EXPECT().
			CachedKasUrlsByAgentId(testhelpers.AgentId),
		querier.EXPECT().
			PollKasUrlsByAgentId(gomock.Any(), testhelpers.AgentId, gomock.Any()).
			Do(func(ctx context.Context, agentId int64, cb tunnel.PollKasUrlsByAgentIdCallback) {
				cb([]string{kasUrlPipe})
				wg.Wait()
				cancel()
				<-ctx.Done()
			}),
	)
	kasPool.EXPECT().
		Dial(gomock.Any(), kasUrlPipe).
		DoAndReturn(func(ctx context.Context, targetUrl string) (grpctool2.PoolConn, error) {
			defer wg.Done()
			tf.mu.Lock()
			defer tf.mu.Unlock()
			tf.kasUrls = nil // remove kasUrlPipe from the list
			return nil, errors.New("boom")
		})
	rpcApi.EXPECT().
		HandleProcessingError(gomock.Any(), testhelpers.AgentId, gomock.Any(), gomock.Any())
	_, err := tf.Find(ctx)
	assert.Same(t, context.Canceled, err)
	assert.Len(t, tf.connections, 1)
	assert.Contains(t, tf.connections, selfAddr)
}

func setupTunnelFinder(ctx context.Context, t *testing.T) (*tunnelFinder, *mock_reverse_tunnel_tunnel.MockPollingQuerier, *mock_modserver.MockRpcApi, *mock_rpc.MockPoolInterface) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	querier := mock_reverse_tunnel_tunnel.NewMockPollingQuerier(ctrl)
	rpcApi := mock_modserver.NewMockRpcApi(ctrl)
	kasPool := mock_rpc.NewMockPoolInterface(ctrl)

	gatewayKasVisitor, err := grpctool2.NewStreamVisitor(&GatewayKasResponse{})
	require.NoError(t, err)

	tf := newTunnelFinder(
		zaptest.NewLogger(t),
		kasPool,
		querier,
		rpcApi,
		"/gitlab.agent.grpctool.test.Testing/RequestResponse",
		selfAddr,
		testhelpers.AgentId,
		ctx,
		testhelpers.NewPollConfig(100*time.Millisecond),
		gatewayKasVisitor,
		routingTryNewKasInterval,
	)
	return tf, querier, rpcApi, kasPool
}
