package redistool

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/redis/rueidis"
	"google.golang.org/protobuf/proto"
)

type BuilderKV[K2 any] struct {
	HashKey K2
	// Value is the value to store in Redis.
	Value *ExpiringValue
}

type SetBuilder[K1 any, K2 any] interface {
	// Set enqueues a HSET command. Does nothing if no kvs provided.
	Set(key K1, ttl time.Duration, kvs ...BuilderKV[K2])
	// Do executes enqueued commands. Does nothing if no commands have been enqueued.
	// Builder must not be reused after this method has been called.
	Do(context.Context) error
}

type RedisSetBuilder[K1 any, K2 any] struct {
	client         rueidis.Client
	key1ToRedisKey KeyToRedisKey[K1]
	key2ToRedisKey KeyToRedisKey[K2]
	cmds           []rueidis.Completed
	setErr         error
}

func (b *RedisSetBuilder[K1, K2]) Set(key K1, ttl time.Duration, kvs ...BuilderKV[K2]) {
	if len(kvs) == 0 || b.setErr != nil {
		return
	}
	redisKey := b.key1ToRedisKey(key)
	hsetCmd := b.client.B().Hset().Key(redisKey).FieldValue()
	for _, kv := range kvs {
		redisValue, err := proto.Marshal(kv.Value)
		if err != nil {
			// This should never happen. Rather than returning an error here and complicating the API, we store the error
			// and return it when Do() is called.
			b.setErr = fmt.Errorf("failed to marshal ExpiringValue: %w", err)
			return
		}
		hsetCmd.FieldValue(b.key2ToRedisKey(kv.HashKey), rueidis.BinaryString(redisValue))
	}
	b.cmds = append(b.cmds,
		hsetCmd.Build(),
		b.client.B().Pexpire().Key(redisKey).Milliseconds(ttl.Milliseconds()).Build(),
	)
}

func (b *RedisSetBuilder[K1, K2]) Do(ctx context.Context) error {
	if b.setErr != nil { // must be checked before the b.cmd length.
		return b.setErr
	}
	if len(b.cmds) == 0 {
		return nil
	}
	multi := make([]rueidis.Completed, 0, len(b.cmds)+2)
	multi = append(multi, b.client.B().Multi().Build())
	multi = append(multi, b.cmds...)
	multi = append(multi, b.client.B().Exec().Build())

	resp := b.client.DoMulti(ctx, multi...)

	return errors.Join(MultiErrors(resp)...)
}
