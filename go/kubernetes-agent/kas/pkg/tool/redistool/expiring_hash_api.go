package redistool

import (
	"context"
	"fmt"
	"time"
	"unsafe"

	"github.com/redis/rueidis"
	"google.golang.org/protobuf/proto"
)

// ExpiringHashApi represents a low-level API to work with a two-level hash: key K1 -> hashKey K2 -> value []byte.
// key identifies the hash; hashKey identifies the key in the hash; value is the value for the hashKey.
type ExpiringHashApi[K1 any, K2 any] interface {
	SetBuilder() SetBuilder[K1, K2]
	Unset(ctx context.Context, key K1, hashKey K2) error
	Scan(ctx context.Context, key K1, cb ScanCallback) (int /* keysDeleted */, error)
}

type RedisExpiringHashApi[K1 any, K2 any] struct {
	Client         rueidis.Client
	Key1ToRedisKey KeyToRedisKey[K1]
	Key2ToRedisKey KeyToRedisKey[K2]
}

func (h *RedisExpiringHashApi[K1, K2]) SetBuilder() SetBuilder[K1, K2] {
	return &RedisSetBuilder[K1, K2]{
		client:         h.Client,
		key1ToRedisKey: h.Key1ToRedisKey,
		key2ToRedisKey: h.Key2ToRedisKey,
	}
}

func (h *RedisExpiringHashApi[K1, K2]) Unset(ctx context.Context, key K1, hashKey K2) error {
	hdelCmd := h.Client.B().Hdel().Key(h.Key1ToRedisKey(key)).Field(h.Key2ToRedisKey(hashKey)).Build()
	return h.Client.Do(ctx, hdelCmd).Error()
}

func (h *RedisExpiringHashApi[K1, K2]) Scan(ctx context.Context, key K1, cb ScanCallback) (int /* keysDeleted */, error) {
	now := time.Now().Unix()
	redisKey := h.Key1ToRedisKey(key)
	keysToDelete, scanErr := scan(ctx, redisKey, h.Client,
		func(k, v string) (bool /*done*/, bool /*delete*/, error) {
			var msg ExpiringValue
			// Avoid creating a temporary copy
			vBytes := unsafe.Slice(unsafe.StringData(v), len(v))
			err := proto.Unmarshal(vBytes, &msg)
			if err != nil {
				done, cbErr := cb(k, nil, fmt.Errorf("failed to unmarshal hash value from hashkey 0x%x: %w", k, err))
				return done, false, cbErr
			}
			if msg.ExpiresAt < now {
				return false, true, nil
			}
			done, cbErr := cb(k, msg.Value, nil)
			return done, false, cbErr
		})
	if len(keysToDelete) == 0 {
		return 0, scanErr
	}
	hdelCmd := h.Client.B().Hdel().Key(redisKey).Field(keysToDelete...).Build()
	err := h.Client.Do(ctx, hdelCmd).Error()
	if err != nil {
		if scanErr != nil {
			return 0, scanErr
		}
		return 0, err
	}
	return len(keysToDelete), scanErr
}
