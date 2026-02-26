package redistool

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/redis/rueidis"
	rmock "github.com/redis/rueidis/mock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
	"go.uber.org/zap/zaptest"
	clock_testing "k8s.io/utils/clock/testing"

	"github.com/pluralsh/kubernetes-agent/pkg/api"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/matcher"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/testhelpers"
)

const (
	ctxKey = 23124
)

func BenchmarkBuildTokenLimiterKey(b *testing.B) {
	b.ReportAllocs()
	const prefix = "pref"
	const currentMinute = 42
	var sink string
	requestKey := []byte{1, 2, 3, 4}
	for i := 0; i < b.N; i++ {
		sink = buildTokenLimiterKey(prefix, requestKey, currentMinute)
	}
	_ = sink
}

func TestBuildTokenLimiterKey(t *testing.T) {
	const prefix = "pref"
	const currentMinute = 42
	requestKey := []byte{1, 2, 3, 4}
	key := buildTokenLimiterKey(prefix, requestKey, currentMinute)

	assert.Equal(t, fmt.Sprintf("%s:%s:%c", prefix, requestKey, currentMinute), key)
}

func TestTokenLimiterHappyPath(t *testing.T) {
	ctx, _, client, limiter, key := setup(t)

	client.EXPECT().
		Do(gomock.Any(), rmock.Match("GET", key)).
		Return(rmock.Result(rmock.RedisInt64(0)))
	client.EXPECT().
		DoMulti(gomock.Any(),
			rmock.Match("MULTI"),
			rmock.Match("INCR", key),
			rmock.Match("EXPIRE", key, "59"),
			rmock.Match("EXEC"),
		)

	require.True(t, limiter.Allow(ctx), "Allow when no token has been consumed")
}

func TestTokenLimiterOverLimit(t *testing.T) {
	ctx, _, client, limiter, key := setup(t)

	client.EXPECT().
		Do(gomock.Any(), rmock.Match("GET", key)).
		Return(rmock.Result(rmock.RedisInt64(1)))

	require.False(t, limiter.Allow(ctx), "Do not allow when a token has been consumed")
}

func TestTokenLimiterNotAllowedWhenGetError(t *testing.T) {
	ctx, rpcApi, client, limiter, key := setup(t)
	err := errors.New("test connection error")
	client.EXPECT().
		Do(gomock.Any(), rmock.Match("GET", key)).
		Return(rmock.ErrorResult(err))

	rpcApi.EXPECT().
		HandleProcessingError("redistool.TokenLimiter: error retrieving minute bucket count", err)

	require.False(t, limiter.Allow(ctx), "Do not allow when there is a connection error")
}

func TestTokenLimiterNotAllowedWhenIncrError(t *testing.T) {
	err := errors.New("test connection error")
	ctx, rpcApi, client, limiter, key := setup(t)

	client.EXPECT().
		Do(gomock.Any(), rmock.Match("GET", key)).
		Return(rmock.Result(rmock.RedisInt64(0)))
	client.EXPECT().
		DoMulti(gomock.Any(),
			rmock.Match("MULTI"),
			rmock.Match("INCR", key),
			rmock.Match("EXPIRE", key, "59"),
			rmock.Match("EXEC"),
		).
		Return([]rueidis.RedisResult{rmock.ErrorResult(err)})
	rpcApi.EXPECT().
		HandleProcessingError("redistool.TokenLimiter: error while incrementing token key count", matcher.ErrorIs(err))

	require.False(t, limiter.Allow(ctx), "Do not allow when there is a connection error")
}

func setup(t *testing.T) (context.Context, *MockRpcApi, *rmock.Client, *TokenLimiter, string) {
	ctrl := gomock.NewController(t)
	client := rmock.NewClient(ctrl)
	rpcApi := NewMockRpcApi(ctrl)
	rpcApi.EXPECT().
		Log().
		Return(zaptest.NewLogger(t)).
		AnyTimes()

	limiter := NewTokenLimiter(client, "key_prefix", 1,
		prometheus.NewCounter(prometheus.CounterOpts{
			Name: "test",
		}),
		func(ctx context.Context) RpcApi {
			rpcApi.EXPECT().
				RequestKey().
				Return(api.AgentToken2key(ctx.Value(ctxKey).(api.AgentToken)))
			return rpcApi
		})
	limiter.clock = clock_testing.NewFakePassiveClock(time.Unix(100, 0))
	ctx := context.WithValue(context.Background(), ctxKey, testhelpers.AgentkToken) // nolint: staticcheck
	key := buildTokenLimiterKey(limiter.keyPrefix, api.AgentToken2key(testhelpers.AgentkToken), byte(limiter.clock.Now().UTC().Minute()))
	return ctx, rpcApi, client, limiter, key
}
