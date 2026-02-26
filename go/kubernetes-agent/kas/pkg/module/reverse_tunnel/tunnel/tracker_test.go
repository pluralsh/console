package tunnel

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
	clocktesting "k8s.io/utils/clock/testing"

	redistool2 "github.com/pluralsh/kubernetes-agent/pkg/tool/redistool"
	mock_redis2 "github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_redis"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/testhelpers"
)

var (
	_ Registerer = &RedisTracker{}
	_ Tracker    = &RedisTracker{}
	_ Querier    = &RedisTracker{}
)

const (
	selfUrl = "grpc://1.1.1.1:10"
	ttl     = time.Minute
)

func TestRegisterConnection(t *testing.T) {
	ctrl := gomock.NewController(t)
	hash := mock_redis2.NewMockExpiringHashApi[int64, string](ctrl)
	b := mock_redis2.NewMockSetBuilder[int64, string](ctrl)
	tm := time.Now()
	r := &RedisTracker{
		ownPrivateApiUrl: selfUrl,
		clock:            clocktesting.NewFakePassiveClock(tm),
		tunnelsByAgentId: hash,
	}
	gomock.InOrder(
		hash.EXPECT().
			SetBuilder().
			Return(b),
		b.EXPECT().
			Set(testhelpers.AgentId, gomock.Any(), gomock.Any()).
			Do(func(key int64, ttl time.Duration, kvs ...redistool2.BuilderKV[string]) {
				require.Len(t, kvs, 1)
				assert.Equal(t, selfUrl, kvs[0].HashKey)
				assert.Equal(t, tm.Add(ttl).Unix(), kvs[0].Value.ExpiresAt)
			}),
		b.EXPECT().
			Do(gomock.Any()),
	)
	assert.NoError(t, r.RegisterTunnel(context.Background(), ttl, testhelpers.AgentId))
}

func TestUnregisterConnection(t *testing.T) {
	ctrl := gomock.NewController(t)
	hash := mock_redis2.NewMockExpiringHashApi[int64, string](ctrl)
	b := mock_redis2.NewMockSetBuilder[int64, string](ctrl)
	r := &RedisTracker{
		ownPrivateApiUrl: selfUrl,
		clock:            clocktesting.NewFakePassiveClock(time.Now()),
		tunnelsByAgentId: hash,
	}
	gomock.InOrder(
		hash.EXPECT().
			SetBuilder().
			Return(b),
		b.EXPECT().
			Set(testhelpers.AgentId, gomock.Any(), gomock.Any()),
		b.EXPECT().
			Do(gomock.Any()),
		hash.EXPECT().
			Unset(gomock.Any(), testhelpers.AgentId, selfUrl),
	)

	assert.NoError(t, r.RegisterTunnel(context.Background(), ttl, testhelpers.AgentId))
	assert.NoError(t, r.UnregisterTunnel(context.Background(), testhelpers.AgentId))
}

func TestUnregisterConnection_TwoConnections(t *testing.T) {
	ctrl := gomock.NewController(t)
	hash := mock_redis2.NewMockExpiringHashApi[int64, string](ctrl)
	b1 := mock_redis2.NewMockSetBuilder[int64, string](ctrl)
	b2 := mock_redis2.NewMockSetBuilder[int64, string](ctrl)
	r := &RedisTracker{
		ownPrivateApiUrl: selfUrl,
		clock:            clocktesting.NewFakePassiveClock(time.Now()),
		tunnelsByAgentId: hash,
	}
	gomock.InOrder(
		hash.EXPECT().
			SetBuilder().
			Return(b1),
		b1.EXPECT().
			Set(testhelpers.AgentId, gomock.Any(), gomock.Any()),
		b1.EXPECT().
			Do(gomock.Any()),
		hash.EXPECT().
			SetBuilder().
			Return(b2),
		b2.EXPECT().
			Set(testhelpers.AgentId, gomock.Any(), gomock.Any()),
		b2.EXPECT().
			Do(gomock.Any()),
		hash.EXPECT().
			Unset(gomock.Any(), testhelpers.AgentId, selfUrl),
		hash.EXPECT().
			Unset(gomock.Any(), testhelpers.AgentId, selfUrl),
	)

	assert.NoError(t, r.RegisterTunnel(context.Background(), ttl, testhelpers.AgentId))
	assert.NoError(t, r.RegisterTunnel(context.Background(), ttl, testhelpers.AgentId))
	assert.NoError(t, r.UnregisterTunnel(context.Background(), testhelpers.AgentId))
	assert.NoError(t, r.UnregisterTunnel(context.Background(), testhelpers.AgentId))
}

func TestKasUrlsByAgentId_HappyPath(t *testing.T) {
	r, hash := setupTracker(t)
	hash.EXPECT().
		Scan(gomock.Any(), testhelpers.AgentId, gomock.Any()).
		Do(func(ctx context.Context, key int64, cb redistool2.ScanCallback) (int, error) {
			var done bool
			done, err := cb(selfUrl, nil, nil)
			if err != nil || done {
				return 0, err
			}
			return 0, nil
		})
	kasUrls, err := r.KasUrlsByAgentId(context.Background(), testhelpers.AgentId)
	require.NoError(t, err)
	assert.Equal(t, []string{selfUrl}, kasUrls)
}

func TestKasUrlsByAgentId_ScanError(t *testing.T) {
	r, hash := setupTracker(t)
	hash.EXPECT().
		Scan(gomock.Any(), testhelpers.AgentId, gomock.Any()).
		Do(func(ctx context.Context, key int64, cb redistool2.ScanCallback) (int, error) {
			done, err := cb("", nil, errors.New("intended error"))
			require.NoError(t, err)
			assert.False(t, done)
			return 0, nil
		})
	kasUrls, err := r.KasUrlsByAgentId(context.Background(), testhelpers.AgentId)
	assert.EqualError(t, err, "intended error")
	assert.Empty(t, kasUrls)
}

func TestRefresh_NoAgents(t *testing.T) {
	ctrl := gomock.NewController(t)
	hash := mock_redis2.NewMockExpiringHashApi[int64, string](ctrl)
	b := mock_redis2.NewMockSetBuilder[int64, string](ctrl)
	r := &RedisTracker{
		ownPrivateApiUrl: selfUrl,
		clock:            clocktesting.NewFakePassiveClock(time.Now()),
		tunnelsByAgentId: hash,
	}
	gomock.InOrder(
		hash.EXPECT().
			SetBuilder().
			Return(b),
		b.EXPECT().
			Do(gomock.Any()),
	)
	assert.NoError(t, r.Refresh(context.Background(), ttl))
}

func TestRefresh_OneAgent(t *testing.T) {
	ctrl := gomock.NewController(t)
	hash := mock_redis2.NewMockExpiringHashApi[int64, string](ctrl)
	b := mock_redis2.NewMockSetBuilder[int64, string](ctrl)
	tm := time.Now()
	r := &RedisTracker{
		ownPrivateApiUrl: selfUrl,
		clock:            clocktesting.NewFakePassiveClock(tm),
		tunnelsByAgentId: hash,
	}
	gomock.InOrder(
		hash.EXPECT().
			SetBuilder().
			Return(b),
		b.EXPECT().
			Set(testhelpers.AgentId, gomock.Any(), gomock.Any()).
			Do(func(key int64, ttl time.Duration, kvs ...redistool2.BuilderKV[string]) {
				require.Len(t, kvs, 1)
				assert.Equal(t, selfUrl, kvs[0].HashKey)
				assert.Equal(t, tm.Add(ttl).Unix(), kvs[0].Value.ExpiresAt)
			}),
		b.EXPECT().
			Do(gomock.Any()),
	)
	assert.NoError(t, r.Refresh(context.Background(), ttl, testhelpers.AgentId))
}

func TestRefresh_TwoAgents(t *testing.T) {
	ctrl := gomock.NewController(t)
	hash := mock_redis2.NewMockExpiringHashApi[int64, string](ctrl)
	b := mock_redis2.NewMockSetBuilder[int64, string](ctrl)
	tm := time.Now()
	r := &RedisTracker{
		ownPrivateApiUrl: selfUrl,
		clock:            clocktesting.NewFakePassiveClock(tm),
		tunnelsByAgentId: hash,
	}
	gomock.InOrder(
		hash.EXPECT().
			SetBuilder().
			Return(b),
		b.EXPECT().
			Set(testhelpers.AgentId, gomock.Any(), gomock.Any()).
			Do(func(key int64, ttl time.Duration, kvs ...redistool2.BuilderKV[string]) {
				require.Len(t, kvs, 1)
				assert.Equal(t, selfUrl, kvs[0].HashKey)
				assert.Equal(t, tm.Add(ttl).Unix(), kvs[0].Value.ExpiresAt)
			}),
		b.EXPECT().
			Set(testhelpers.AgentId+1, gomock.Any(), gomock.Any()).
			Do(func(key int64, ttl time.Duration, kvs ...redistool2.BuilderKV[string]) {
				require.Len(t, kvs, 1)
				assert.Equal(t, selfUrl, kvs[0].HashKey)
				assert.Equal(t, tm.Add(ttl).Unix(), kvs[0].Value.ExpiresAt)
			}),
		b.EXPECT().
			Do(gomock.Any()),
	)
	assert.NoError(t, r.Refresh(context.Background(), ttl, testhelpers.AgentId, testhelpers.AgentId+1))
}

func setupTracker(t *testing.T) (*RedisTracker, *mock_redis2.MockExpiringHashApi[int64, string]) {
	ctrl := gomock.NewController(t)
	hash := mock_redis2.NewMockExpiringHashApi[int64, string](ctrl)
	return &RedisTracker{
		ownPrivateApiUrl: selfUrl,
		clock:            clocktesting.NewFakePassiveClock(time.Now()),
		tunnelsByAgentId: hash,
	}, hash
}
