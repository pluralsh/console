package redistool

import (
	"context"
	"errors"
	"unsafe"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/redis/rueidis"
	"go.uber.org/zap"
	"k8s.io/utils/clock"

	"github.com/pluralsh/kubernetes-agent/pkg/tool/logz"
)

type RpcApi interface {
	Log() *zap.Logger
	HandleProcessingError(msg string, err error)
	RequestKey() []byte
}

// TokenLimiter is a redis-based rate limiter implementing the algorithm in https://redislabs.com/redis-best-practices/basic-rate-limiting/
type TokenLimiter struct {
	redisClient    rueidis.Client
	clock          clock.PassiveClock
	keyPrefix      string
	limitPerMinute uint64
	limitExceeded  prometheus.Counter
	getApi         func(context.Context) RpcApi
}

// NewTokenLimiter returns a new TokenLimiter
func NewTokenLimiter(redisClient rueidis.Client, keyPrefix string,
	limitPerMinute uint64, limitExceeded prometheus.Counter, getApi func(context.Context) RpcApi) *TokenLimiter {
	return &TokenLimiter{
		redisClient:    redisClient,
		clock:          clock.RealClock{},
		keyPrefix:      keyPrefix,
		limitPerMinute: limitPerMinute,
		limitExceeded:  limitExceeded,
		getApi:         getApi,
	}
}

// Allow consumes one limitable event from the token in the context
func (l *TokenLimiter) Allow(ctx context.Context) bool {
	api := l.getApi(ctx)
	key := buildTokenLimiterKey(l.keyPrefix, api.RequestKey(), byte(l.clock.Now().UTC().Minute()))
	getCmd := l.redisClient.B().Get().Key(key).Build()

	count, err := l.redisClient.Do(ctx, getCmd).AsUint64()
	if err != nil {
		if err != rueidis.Nil { // nolint:errorlint
			api.HandleProcessingError("redistool.TokenLimiter: error retrieving minute bucket count", err)
			return false
		}
		count = 0
	}
	if count >= l.limitPerMinute {
		l.limitExceeded.Inc()
		api.Log().Debug("redistool.TokenLimiter: rate limit exceeded",
			logz.RedisKey([]byte(key)), logz.U64Count(count), logz.TokenLimit(l.limitPerMinute))
		return false
	}

	resp := l.redisClient.DoMulti(ctx,
		l.redisClient.B().Multi().Build(),
		l.redisClient.B().Incr().Key(key).Build(),
		l.redisClient.B().Expire().Key(key).Seconds(59).Build(),
		l.redisClient.B().Exec().Build(),
	)
	err = errors.Join(MultiErrors(resp)...)
	if err != nil {
		api.HandleProcessingError("redistool.TokenLimiter: error while incrementing token key count", err)
		return false
	}

	return true
}

func buildTokenLimiterKey(keyPrefix string, requestKey []byte, currentMinute byte) string {
	result := make([]byte, 0, len(keyPrefix)+1+len(requestKey)+1+1)
	result = append(result, keyPrefix...)
	result = append(result, ':')
	result = append(result, requestKey...)
	result = append(result, ':', currentMinute)

	return unsafe.String(unsafe.SliceData(result), len(result))
}
