package agent_tracker

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
	"go.uber.org/zap/zaptest"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/testing/protocmp"
	"google.golang.org/protobuf/types/known/timestamppb"

	"github.com/pluralsh/kubernetes-agent/pkg/entity"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/redistool"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/matcher"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_redis"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_tool"
)

var (
	_ Registerer                 = &RedisTracker{}
	_ Querier                    = &RedisTracker{}
	_ Tracker                    = &RedisTracker{}
	_ ConnectedAgentInfoCallback = (&ConnectedAgentInfoCollector{}).Collect
)

func TestRegisterConnection_HappyPath(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	r, connectedAgents, byAgentId, _, info := setupTracker(t)

	byAgentId.EXPECT().
		Set(gomock.Any(), info.AgentId, info.ConnectionId, gomock.Any())
	connectedAgents.EXPECT().
		Set(gomock.Any(), connectedAgentsKey, info.AgentId, gomock.Any())

	go func() {
		assert.NoError(t, r.RegisterConnection(context.Background(), info))
		cancel()
	}()

	require.NoError(t, r.Run(ctx))
}

func TestRegisterConnection_AllCalledOnError(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	r, connectedAgents, byAgentId, _, info := setupTracker(t)

	err1 := errors.New("err1")
	err2 := errors.New("err2")
	err3 := errors.New("err3")

	byAgentId.EXPECT().
		Set(gomock.Any(), info.AgentId, info.ConnectionId, gomock.Any()).
		Return(err2)
	connectedAgents.EXPECT().
		Set(gomock.Any(), connectedAgentsKey, info.AgentId, gomock.Any()).
		Return(err3)

	go func() {
		err := r.RegisterConnection(context.Background(), info)

		assert.True(t, errors.Is(err, err1) || errors.Is(err, err2) || errors.Is(err, err3), err)
		cancel()
	}()

	require.NoError(t, r.Run(ctx))
}

func TestUnregisterConnection_HappyPath(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	r, connectedAgents, byAgentId, _, info := setupTracker(t)

	gomock.InOrder(
		byAgentId.EXPECT().
			Set(gomock.Any(), info.AgentId, info.ConnectionId, gomock.Any()),
		byAgentId.EXPECT().
			Unset(gomock.Any(), info.AgentId, info.ConnectionId),
	)
	gomock.InOrder(
		connectedAgents.EXPECT().
			Set(gomock.Any(), connectedAgentsKey, info.AgentId, gomock.Any()),
		connectedAgents.EXPECT().
			Forget(connectedAgentsKey, info.AgentId),
	)
	go func() {
		assert.NoError(t, r.RegisterConnection(context.Background(), info))
		assert.NoError(t, r.UnregisterConnection(context.Background(), info))
		cancel()
	}()

	require.NoError(t, r.Run(ctx))
}

func TestUnregisterConnection_AllCalledOnError(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	r, connectedAgents, byAgentId, _, info := setupTracker(t)

	err1 := errors.New("err1")
	err2 := errors.New("err2")

	gomock.InOrder(
		byAgentId.EXPECT().
			Set(gomock.Any(), info.AgentId, info.ConnectionId, gomock.Any()),
		byAgentId.EXPECT().
			Unset(gomock.Any(), info.AgentId, info.ConnectionId).
			Return(err2),
	)
	gomock.InOrder(
		connectedAgents.EXPECT().
			Set(gomock.Any(), connectedAgentsKey, info.AgentId, gomock.Any()),
		connectedAgents.EXPECT().
			Forget(connectedAgentsKey, info.AgentId),
	)

	go func() {
		assert.NoError(t, r.RegisterConnection(context.Background(), info))
		err := r.UnregisterConnection(context.Background(), info)
		assert.True(t, errors.Is(err, err1) || errors.Is(err, err2), err)
		cancel()
	}()

	require.NoError(t, r.Run(ctx))
}

func TestGC_HappyPath(t *testing.T) {
	r, connectedAgents, byAgentId, _, _ := setupTracker(t)

	wasCalled1 := false
	wasCalled2 := false

	connectedAgents.EXPECT().
		GC().
		Return(func(_ context.Context) (int, error) {
			wasCalled2 = true
			return 3, nil
		})

	byAgentId.EXPECT().
		GC().
		Return(func(_ context.Context) (int, error) {
			wasCalled1 = true
			return 2, nil
		})

	assert.EqualValues(t, 5, r.runGC(context.Background()))
	assert.True(t, wasCalled1)
	assert.True(t, wasCalled2)
}

func TestGC_AllCalledOnError(t *testing.T) {
	r, connectedAgents, byAgentId, rep, _ := setupTracker(t)

	wasCalled2 := false
	wasCalled3 := false

	gomock.InOrder(
		connectedAgents.EXPECT().
			GC().
			Return(func(_ context.Context) (int, error) {
				wasCalled3 = true
				return 3, errors.New("err3")
			}),
		rep.EXPECT().
			HandleProcessingError(gomock.Any(), gomock.Any(), "Failed to GC data in Redis", matcher.ErrorEq("err3")),
	)

	gomock.InOrder(
		byAgentId.EXPECT().
			GC().
			Return(func(_ context.Context) (int, error) {
				wasCalled2 = true
				return 2, errors.New("err2")
			}),
		rep.EXPECT().
			HandleProcessingError(gomock.Any(), gomock.Any(), "Failed to GC data in Redis", matcher.ErrorEq("err2")),
	)

	assert.EqualValues(t, 5, r.runGC(context.Background()))
	assert.True(t, wasCalled2)
	assert.True(t, wasCalled3)
}

func TestRefresh_HappyPath(t *testing.T) {
	r, connectedAgents, byAgentId, _, _ := setupTracker(t)

	connectedAgents.EXPECT().
		Refresh(gomock.Any(), gomock.Any())
	byAgentId.EXPECT().
		Refresh(gomock.Any(), gomock.Any())
	r.refreshRegistrations(context.Background(), time.Now())
}

func TestRefresh_AllCalledOnError(t *testing.T) {
	r, connectedAgents, byAgentId, rep, _ := setupTracker(t)

	gomock.InOrder(
		connectedAgents.EXPECT().
			Refresh(gomock.Any(), gomock.Any()).
			Return(errors.New("err3")),
		rep.EXPECT().
			HandleProcessingError(gomock.Any(), gomock.Any(), "Failed to refresh hash data in Redis", matcher.ErrorEq("err3")),
	)
	gomock.InOrder(
		byAgentId.EXPECT().
			Refresh(gomock.Any(), gomock.Any()).
			Return(errors.New("err1")),
		rep.EXPECT().
			HandleProcessingError(gomock.Any(), gomock.Any(), "Failed to refresh hash data in Redis", matcher.ErrorEq("err1")),
	)
	r.refreshRegistrations(context.Background(), time.Now())
}

func TestGetConnectionsByAgentId_HappyPath(t *testing.T) {
	r, _, byAgentId, _, info := setupTracker(t)
	infoBytes, err := proto.Marshal(info)
	require.NoError(t, err)
	byAgentId.EXPECT().
		Scan(gomock.Any(), info.AgentId, gomock.Any()).
		Do(func(ctx context.Context, key int64, cb redistool.ScanCallback) (int, error) {
			var done bool
			done, err = cb("k2", infoBytes, nil)
			if err != nil || done {
				return 0, err
			}
			return 0, nil
		})
	var cbCalled int
	err = r.GetConnectionsByAgentId(context.Background(), info.AgentId, func(i *ConnectedAgentInfo) (done bool, err error) {
		cbCalled++
		assert.Empty(t, cmp.Diff(i, info, protocmp.Transform()))
		return false, nil
	})
	require.NoError(t, err)
	assert.EqualValues(t, 1, cbCalled)
}

func TestGetConnectionsByAgentId_ScanError(t *testing.T) {
	r, _, byAgentId, rep, info := setupTracker(t)
	gomock.InOrder(
		byAgentId.EXPECT().
			Scan(gomock.Any(), info.AgentId, gomock.Any()).
			Do(func(ctx context.Context, key int64, cb redistool.ScanCallback) (int, error) {
				done, err := cb("", nil, errors.New("intended error"))
				require.NoError(t, err)
				assert.False(t, done)
				return 0, nil
			}),
		rep.EXPECT().
			HandleProcessingError(gomock.Any(), gomock.Any(), "Redis hash scan", matcher.ErrorEq("intended error")),
	)
	err := r.GetConnectionsByAgentId(context.Background(), info.AgentId, func(i *ConnectedAgentInfo) (done bool, err error) {
		require.FailNow(t, "unexpected call")
		return false, nil
	})
	require.NoError(t, err)
}

func TestGetConnectionsByAgentId_UnmarshalError(t *testing.T) {
	r, _, byAgentId, rep, info := setupTracker(t)
	byAgentId.EXPECT().
		Scan(gomock.Any(), info.AgentId, gomock.Any()).
		Do(func(ctx context.Context, key int64, cb redistool.ScanCallback) (int, error) {
			done, err := cb("k2", []byte{1, 2, 3}, nil) // invalid bytes
			require.NoError(t, err)                     // ignores error to keep going
			assert.False(t, done)
			return 0, nil
		})
	rep.EXPECT().
		HandleProcessingError(gomock.Any(), gomock.Any(), "Redis proto.Unmarshal(ConnectedAgentInfo)", matcher.ErrorIs(proto.Error))
	err := r.GetConnectionsByAgentId(context.Background(), info.AgentId, func(i *ConnectedAgentInfo) (done bool, err error) {
		require.FailNow(t, "unexpected call")
		return false, nil
	})
	require.NoError(t, err)
}

func TestGetConnectedAgentsCount_HappyPath(t *testing.T) {
	r, connectedAgents, _, _, _ := setupTracker(t)
	connectedAgents.EXPECT().
		Len(gomock.Any(), connectedAgentsKey).
		Return(int64(1), nil)
	size, err := r.GetConnectedAgentsCount(context.Background())
	require.NoError(t, err)
	assert.EqualValues(t, 1, size)
}

func TestGetConnectedAgentsCount_LenError(t *testing.T) {
	r, connectedAgents, _, _, _ := setupTracker(t)
	connectedAgents.EXPECT().
		Len(gomock.Any(), connectedAgentsKey).
		Return(int64(0), errors.New("intended error"))
	size, err := r.GetConnectedAgentsCount(context.Background())
	require.Error(t, err)
	assert.Zero(t, size)
}

func setupTracker(t *testing.T) (*RedisTracker, *mock_redis.MockExpiringHash[int64, int64], *mock_redis.MockExpiringHash[int64, int64], *mock_tool.MockErrReporter, *ConnectedAgentInfo) {
	ctrl := gomock.NewController(t)
	rep := mock_tool.NewMockErrReporter(ctrl)
	connectedAgents := mock_redis.NewMockExpiringHash[int64, int64](ctrl)
	byAgentId := mock_redis.NewMockExpiringHash[int64, int64](ctrl)
	tr := &RedisTracker{
		log:                  zaptest.NewLogger(t),
		errRep:               rep,
		refreshPeriod:        time.Minute,
		gcPeriod:             time.Minute,
		connectionsByAgentId: byAgentId,
		connectedAgents:      connectedAgents,
	}
	return tr, connectedAgents, byAgentId, rep, connInfo()
}

func connInfo() *ConnectedAgentInfo {
	return &ConnectedAgentInfo{
		AgentMeta: &entity.AgentMeta{
			Version:      "v1.2.3",
			CommitId:     "123123",
			PodNamespace: "ns",
			PodName:      "name",
		},
		ConnectedAt:  timestamppb.Now(),
		ConnectionId: 123,
		AgentId:      345,
		ClusterId:    "456",
	}
}
