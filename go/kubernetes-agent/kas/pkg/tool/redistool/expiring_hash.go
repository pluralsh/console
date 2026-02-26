package redistool

import (
	"context"
	"encoding/binary"
	"errors"
	"time"
	"unsafe"

	"github.com/redis/rueidis"
	"google.golang.org/protobuf/proto"
)

const (
	maxKeyGCAttempts = 2
)

// KeyToRedisKey is used to convert typed key (key1 or key2) into a string.
// HSET key1 key2 value.
type KeyToRedisKey[K any] func(key K) string
type ScanCallback func(rawHashKey string, value []byte, err error) (bool /* done */, error)

// ExpiringHash represents a two-level hash: key K1 -> hashKey K2 -> value []byte.
// key identifies the hash; hashKey identifies the key in the hash; value is the value for the hashKey.
// It is not safe for concurrent use.
type ExpiringHash[K1 any, K2 any] interface {
	Set(ctx context.Context, key K1, hashKey K2, value []byte) error
	Unset(ctx context.Context, key K1, hashKey K2) error
	// Forget only removes the item from the in-memory map.
	Forget(key K1, hashKey K2)
	// Scan iterates key-value pairs for key. It removes any expired entries it finds.
	// Safe for concurrent use.
	Scan(ctx context.Context, key K1, cb ScanCallback) (int /* keysDeleted */, error)
	// Len returns number of key-value mappings in the hash identified by key.
	Len(ctx context.Context, key K1) (int64, error)
	// GC returns a function that iterates all relevant stored data and deletes expired entries.
	// The returned function can be called concurrently as it does not interfere with the hash's operation.
	// The function returns number of deleted Redis (hash) keys, including when an error occurred.
	// It only inspects/GCs hashes where it has entries. Other concurrent clients GC same and/or other corresponding hashes.
	// Hashes that don't have a corresponding client (e.g. because it crashed) will expire because of TTL on the hash key.
	// GC only needs to be used if Len() is used. Otherwise expired entries will be found and deleted by Scan().
	GC() func(context.Context) (int /* keysDeleted */, error)
	// Clear clears all data in this hash and deletes it from the backing store.
	Clear(context.Context) (int, error)
	// Refresh refreshes data in the backing store to prevent it from expiring.
	Refresh(ctx context.Context, nextRefresh time.Time) error
}

type RedisExpiringHash[K1 comparable, K2 comparable] struct {
	client         rueidis.Client
	key1ToRedisKey KeyToRedisKey[K1]
	key2ToRedisKey KeyToRedisKey[K2]
	ttl            time.Duration
	api            RedisExpiringHashApi[K1, K2]
	data           map[K1]map[K2]*ExpiringValue // key -> hash key -> value
}

func NewRedisExpiringHash[K1 comparable, K2 comparable](client rueidis.Client, key1ToRedisKey KeyToRedisKey[K1],
	key2ToRedisKey KeyToRedisKey[K2], ttl time.Duration) *RedisExpiringHash[K1, K2] {
	return &RedisExpiringHash[K1, K2]{
		client:         client,
		key1ToRedisKey: key1ToRedisKey,
		key2ToRedisKey: key2ToRedisKey,
		ttl:            ttl,
		api: RedisExpiringHashApi[K1, K2]{
			Client:         client,
			Key1ToRedisKey: key1ToRedisKey,
			Key2ToRedisKey: key2ToRedisKey,
		},
		data: make(map[K1]map[K2]*ExpiringValue),
	}
}

func (h *RedisExpiringHash[K1, K2]) Set(ctx context.Context, key K1, hashKey K2, value []byte) error {
	ev := &ExpiringValue{
		ExpiresAt: time.Now().Add(h.ttl).Unix(),
		Value:     value,
	}
	h.setData(key, hashKey, ev)

	b := h.api.SetBuilder()
	b.Set(key, h.ttl, BuilderKV[K2]{
		HashKey: hashKey,
		Value:   ev,
	})
	return b.Do(ctx)
}

func (h *RedisExpiringHash[K1, K2]) Unset(ctx context.Context, key K1, hashKey K2) error {
	h.unsetData(key, hashKey)
	return h.api.Unset(ctx, key, hashKey)
}

func (h *RedisExpiringHash[K1, K2]) Forget(key K1, hashKey K2) {
	h.unsetData(key, hashKey)
}

func (h *RedisExpiringHash[K1, K2]) Len(ctx context.Context, key K1) (size int64, retErr error) {
	hlenCmd := h.client.B().Hlen().Key(h.key1ToRedisKey(key)).Build()
	return h.client.Do(ctx, hlenCmd).AsInt64()
}

type scanCb func(k, v string) (bool /*done*/, bool /*delete*/, error)

func scan(ctx context.Context, redisKey string, c rueidis.CoreClient, cb scanCb) ( /*retKeysToDelete*/ []string, error) {
	var keysToDelete []string
	// Scan keys of a hash. See https://redis.io/commands/scan
	var se rueidis.ScanEntry
	var err error
	for more := true; more; more = se.Cursor != 0 {
		hscanCmd := c.B().Hscan().Key(redisKey).Cursor(se.Cursor).Build()
		se, err = c.Do(ctx, hscanCmd).AsScanEntry()
		if err != nil {
			return keysToDelete, err
		}
		if len(se.Elements)%2 != 0 {
			// This shouldn't happen
			return keysToDelete, errors.New("invalid Redis reply")
		}
		for i := 0; i < len(se.Elements); i += 2 {
			k := se.Elements[i]
			v := se.Elements[i+1]
			done, del, err := cb(k, v)
			if del {
				keysToDelete = append(keysToDelete, k)
			}
			if err != nil || done {
				return keysToDelete, err
			}
		}
	}
	return keysToDelete, nil
}

func (h *RedisExpiringHash[K1, K2]) Scan(ctx context.Context, key K1, cb ScanCallback) (int /* keysDeleted */, error) {
	return h.api.Scan(ctx, key, cb)
}

func (h *RedisExpiringHash[K1, K2]) GC() func(context.Context) (int /* keysDeleted */, error) {
	// Copy keys for safe concurrent access.
	keys := make([]K1, 0, len(h.data))
	for key := range h.data {
		keys = append(keys, key)
	}
	return func(ctx context.Context) (int, error) {
		var deletedKeys int
		client, cancel := h.client.Dedicate()
		defer cancel()
		for _, key := range keys {
			deleted, err := gcHash(ctx, h.key1ToRedisKey(key), client)
			deletedKeys += deleted
			switch {
			case err == nil, errors.Is(err, errAttemptsExceeded):
				// Try to GC next key on conflicts
			default:
				return deletedKeys, err
			}
		}
		return deletedKeys, nil
	}
}

// gcHash iterates a hash and removes all expired values.
// It assumes that values are marshaled ExpiringValue.
// Returns errAttemptsExceeded if maxAttempts attempts ware made but all failed.
func gcHash(ctx context.Context, redisKey string, c rueidis.DedicatedClient) (int /* keysDeleted */, error) {
	var errs []error
	keysDeleted := 0
	// We don't want to delete a k->v mapping that has just been overwritten by another client. So use a transaction.
	// We don't want to retry too many times to GC to avoid spending too much time on it. Retry once.
	err := transaction(ctx, maxKeyGCAttempts, c, func(ctx context.Context) ([]rueidis.Completed, error) {
		now := time.Now().Unix()
		errs = nil
		keysToDelete, err := scan(ctx, redisKey, c,
			func(k, v string) (bool /*done*/, bool /*delete*/, error) {
				var msg ExpiringValueTimestamp
				// Avoid creating a temporary copy
				vBytes := unsafe.Slice(unsafe.StringData(v), len(v))
				err := proto.UnmarshalOptions{
					DiscardUnknown: true, // We know there is one more field, but we don't need it
				}.Unmarshal(vBytes, &msg)
				if err != nil {
					errs = append(errs, err)
					return false, false, nil
				}
				return false, msg.ExpiresAt < now, nil
			})
		if err != nil {
			errs = append(errs, err)
		}
		keysDeleted = len(keysToDelete)
		if keysDeleted == 0 {
			return nil, nil
		}
		return []rueidis.Completed{
			c.B().Hdel().Key(redisKey).Field(keysToDelete...).Build(),
		}, nil
	}, redisKey)
	if err != nil {
		// Propagate errAttemptsExceeded error and any other errors as is.
		return 0, err
	}
	return keysDeleted, errors.Join(errs...)
}

func (h *RedisExpiringHash[K1, K2]) Clear(ctx context.Context) (int, error) {
	var toDel []string
	keysDeleted := 0
	cmds := make([]rueidis.Completed, 0, len(h.data))
	for k1, m := range h.data {
		toDel = toDel[:0] // reuse backing array, but reset length
		for k2 := range m {
			toDel = append(toDel, h.key2ToRedisKey(k2))
		}
		cmds = append(cmds, h.client.B().Hdel().Key(h.key1ToRedisKey(k1)).Field(toDel...).Build())
		delete(h.data, k1)
		keysDeleted += len(toDel)
	}
	errs := MultiErrors(h.client.DoMulti(ctx, cmds...))
	return keysDeleted, errors.Join(errs...)
}

func (h *RedisExpiringHash[K1, K2]) Refresh(ctx context.Context, nextRefresh time.Time) error {
	expiresAt := time.Now().Add(h.ttl).Unix()
	nextRefreshUnix := nextRefresh.Unix()
	b := h.api.SetBuilder()
	var kvs []BuilderKV[K2]
	for key, hashData := range h.data {
		kvs = kvs[:0] // reuse backing array, but reset length
		for hashKey, value := range hashData {
			if value.ExpiresAt > nextRefreshUnix {
				// Expires after next refresh. Will be refreshed later, no need to refresh now.
				continue
			}
			value.ExpiresAt = expiresAt
			kvs = append(kvs, BuilderKV[K2]{
				HashKey: hashKey,
				Value:   value,
			})
		}
		b.Set(key, h.ttl, kvs...)
	}
	return b.Do(ctx)
}

func (h *RedisExpiringHash[K1, K2]) setData(key K1, hashKey K2, value *ExpiringValue) {
	nm := h.data[key]
	if nm == nil {
		nm = make(map[K2]*ExpiringValue, 1)
		h.data[key] = nm
	}
	nm[hashKey] = value
}

func (h *RedisExpiringHash[K1, K2]) unsetData(key K1, hashKey K2) {
	nm := h.data[key]
	delete(nm, hashKey)
	if len(nm) == 0 {
		delete(h.data, key)
	}
}

func PrefixedInt64Key(prefix string, key int64) string {
	b := make([]byte, 0, len(prefix)+8)
	b = append(b, prefix...)
	b = binary.LittleEndian.AppendUint64(b, uint64(key))

	return unsafe.String(unsafe.SliceData(b), len(b))
}
