package tunnel

import (
	"context"
	"errors"
	"time"

	"github.com/redis/rueidis"
	"k8s.io/utils/clock"

	redistool2 "github.com/pluralsh/kubernetes-agent/pkg/tool/redistool"
)

type Querier interface {
	// KasUrlsByAgentId returns the list of kas URLs for a particular agent id.
	// A partial list may be returned together with an error.
	// Safe for concurrent use.
	KasUrlsByAgentId(ctx context.Context, agentId int64) ([]string, error)
}

// Registerer allows to register and unregister tunnels.
// Caller is responsible for periodically calling GC() and Refresh().
// Not safe for concurrent use.
type Registerer interface {
	// RegisterTunnel registers tunnel with the tracker.
	RegisterTunnel(ctx context.Context, ttl time.Duration, agentId int64) error
	// UnregisterTunnel unregisters tunnel with the tracker.
	UnregisterTunnel(ctx context.Context, agentId int64) error
	// Refresh refreshes registered tunnels in the underlying storage.
	Refresh(ctx context.Context, ttl time.Duration, agentIds ...int64) error
}

type Tracker interface {
	Registerer
	Querier
}

type RedisTracker struct {
	ownPrivateApiUrl string
	clock            clock.PassiveClock
	tunnelsByAgentId redistool2.ExpiringHashApi[int64, string] // agentId -> kas URL -> nil
}

func NewRedisTracker(client rueidis.Client, agentKeyPrefix string, ownPrivateApiUrl string) *RedisTracker {
	return &RedisTracker{
		ownPrivateApiUrl: ownPrivateApiUrl,
		clock:            clock.RealClock{},
		tunnelsByAgentId: &redistool2.RedisExpiringHashApi[int64, string]{
			Client:         client,
			Key1ToRedisKey: tunnelsByAgentIdHashKey(agentKeyPrefix),
			Key2ToRedisKey: strToStr,
		},
	}
}

func (t *RedisTracker) RegisterTunnel(ctx context.Context, ttl time.Duration, agentId int64) error {
	b := t.tunnelsByAgentId.SetBuilder()
	b.Set(agentId, ttl, t.kv(t.clock.Now().Add(ttl)))
	return b.Do(ctx)
}

func (t *RedisTracker) UnregisterTunnel(ctx context.Context, agentId int64) error {
	return t.tunnelsByAgentId.Unset(ctx, agentId, t.ownPrivateApiUrl)
}

func (t *RedisTracker) KasUrlsByAgentId(ctx context.Context, agentId int64) ([]string, error) {
	var urls []string
	var errs []error
	_, err := t.tunnelsByAgentId.Scan(ctx, agentId, func(rawHashKey string, value []byte, err error) (bool, error) {
		if err != nil {
			errs = append(errs, err)
			return false, nil
		}
		urls = append(urls, rawHashKey)
		return false, nil
	})
	if err != nil {
		errs = append(errs, err)
	}
	return urls, errors.Join(errs...)
}

func (t *RedisTracker) Refresh(ctx context.Context, ttl time.Duration, agentIds ...int64) error {
	b := t.tunnelsByAgentId.SetBuilder()
	// allocate once. Slice is passed as-is to variadic funcs vs individual args allocate a new one on each call
	kvs := []redistool2.BuilderKV[string]{t.kv(t.clock.Now().Add(ttl))}
	for _, agentId := range agentIds {
		b.Set(agentId, ttl, kvs...)
	}
	return b.Do(ctx)
}

func (t *RedisTracker) kv(expiresAt time.Time) redistool2.BuilderKV[string] {
	return redistool2.BuilderKV[string]{
		HashKey: t.ownPrivateApiUrl,
		Value: &redistool2.ExpiringValue{
			ExpiresAt: expiresAt.Unix(),
			Value:     nil, // nothing to store.
		},
	}
}

// tunnelsByAgentIdHashKey returns a key for agentId -> (kasUrl -> nil).
func tunnelsByAgentIdHashKey(agentKeyPrefix string) redistool2.KeyToRedisKey[int64] {
	prefix := agentKeyPrefix + ":kas_by_agent_id:"
	return func(agentId int64) string {
		return redistool2.PrefixedInt64Key(prefix, agentId)
	}
}

func strToStr(key string) string {
	return key
}
