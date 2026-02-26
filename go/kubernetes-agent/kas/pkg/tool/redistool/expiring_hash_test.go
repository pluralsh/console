package redistool

import (
	"context"
	"crypto/rand"
	"fmt"
	"net/url"
	"os"
	"strconv"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/rueidis"
	rmock "github.com/redis/rueidis/mock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
	"google.golang.org/protobuf/proto"

	"github.com/pluralsh/kubernetes-agent/pkg/tool/tlstool"
)

const (
	redisURLEnvName = "REDIS_URL"
	ttl             = 2 * time.Second
)

var (
	_ ExpiringHash[int, int]    = (*RedisExpiringHash[int, int])(nil)
	_ ExpiringHashApi[int, int] = (*RedisExpiringHashApi[int, int])(nil)
)

func TestExpiringHash_Set(t *testing.T) {
	client, hash, key, value := setupHash(t)

	require.NoError(t, hash.Set(context.Background(), key, 123, value))

	equalHash(t, client, key, 123, value)
}

func TestExpiringHash_Unset(t *testing.T) {
	client, hash, key, value := setupHash(t)

	require.NoError(t, hash.Set(context.Background(), key, 123, value))
	require.NoError(t, hash.Unset(context.Background(), key, 123))

	require.Empty(t, getHash(t, client, key))
}

func TestExpiringHash_Forget(t *testing.T) {
	client, hash, key, value := setupHash(t)

	require.NoError(t, hash.Set(context.Background(), key, 123, value))
	hash.Forget(key, 123)

	equalHash(t, client, key, 123, value)
	require.Empty(t, hash.data)
}

func TestExpiringHash_Expires(t *testing.T) {
	t.Skip()
	client, hash, key, value := setupHash(t)

	require.NoError(t, hash.Set(context.Background(), key, 123, value))
	time.Sleep(ttl + 100*time.Millisecond)

	require.Empty(t, getHash(t, client, key))
}

func TestExpiringHash_GC(t *testing.T) {
	t.Skip()
	client, hash, key, value := setupHash(t)

	require.NoError(t, hash.Set(context.Background(), key, 123, value))
	newExpireIn := 3 * ttl
	cmd := client.B().Pexpire().Key(key).Milliseconds(newExpireIn.Milliseconds()).Build()
	err := client.Do(context.Background(), cmd).Error()
	require.NoError(t, err)
	time.Sleep(ttl + time.Second)
	require.NoError(t, hash.Set(context.Background(), key, 321, value))

	keysDeleted, err := hash.GC()(context.Background())
	require.NoError(t, err)
	assert.EqualValues(t, 1, keysDeleted)

	equalHash(t, client, key, 321, value)
}

func TestExpiringHash_GCContinuesOnConflict(t *testing.T) {
	ctrl := gomock.NewController(t)
	client := rmock.NewClient(ctrl)
	ded := rmock.NewDedicatedClient(ctrl)
	val := &ExpiringValue{
		ExpiresAt: time.Now().Unix() - 1000, // long expired
		Value:     nil,
	}
	valBytes, err := proto.Marshal(val)
	require.NoError(t, err)
	watch := func() *gomock.Call {
		return ded.EXPECT(). // Transaction
					Do(
				gomock.Any(),
				matchCmd("WATCH"),
			)
	}
	scan := func() *gomock.Call {
		return ded.EXPECT(). // scan()
					Do(
				gomock.Any(),
				matchCmd("HSCAN"),
			).
			Return(rmock.Result(rmock.RedisArray(
				rmock.RedisInt64(0), // 0 means no more elements to scan
				rmock.RedisArray(rmock.RedisString("key"), rmock.RedisString(string(valBytes))),
			)))
	}
	failDelete := func() *gomock.Call {
		return ded.EXPECT().
			DoMulti(
				gomock.Any(),
				rmock.Match("MULTI"),
				matchCmd("HDEL"),
				rmock.Match("EXEC"),
			).
			Return([]rueidis.RedisResult{
				rmock.Result(rmock.RedisString("OK")),
				rmock.Result(rmock.RedisString("QUEUED")),
				rmock.Result(rmock.RedisNil()), // conflict!
			})
	}
	set := func(key string) *gomock.Call {
		return client.EXPECT().
			DoMulti(
				gomock.Any(),
				rmock.Match("MULTI"),
				rmock.MatchFn(func(cmd []string) bool {
					return len(cmd) == 4 && cmd[0] == "HSET" && cmd[1] == key && cmd[2] == "key"
				}),
				rmock.Match("PEXPIRE", key, "2000"),
				rmock.Match("EXEC"),
			)
	}
	gomock.InOrder(
		set("1"), // SET 1,
		set("2"), // SET 2,
		client.EXPECT(). // GC() start
					Dedicate().
					Return(ded, func() {}),
		// GC first element - attempt 1
		watch(),
		scan(),
		failDelete(),
		// GC first element - attempt 2
		watch(),
		scan(),
		failDelete(),
		// GC second element
		watch(),
		scan(),
		ded.EXPECT().
			DoMulti(
				gomock.Any(),
				rmock.Match("MULTI"),
				matchCmd("HDEL"),
				rmock.Match("EXEC"),
			).
			Return([]rueidis.RedisResult{
				rmock.Result(rmock.RedisString("OK")),
				rmock.Result(rmock.RedisString("QUEUED")),
				rmock.Result(rmock.RedisArray(rmock.RedisInt64(1))), // removed 1
			}),
	)

	hash := NewRedisExpiringHash[string, string](client, s2s, s2s, ttl)
	err = hash.Set(context.Background(), "1", "key", nil)
	require.NoError(t, err)
	err = hash.Set(context.Background(), "2", "key", nil)
	require.NoError(t, err)

	deleted, err := hash.GC()(context.Background())
	require.NoError(t, err)
	assert.EqualValues(t, 1, deleted)
}

func matchCmd(cmd string) gomock.Matcher {
	return rmock.MatchFn(func(cmdAndArgs []string) bool {
		return cmdAndArgs[0] == cmd
	})
}

func s2s(key string) string {
	return key
}

func TestExpiringHash_Refresh_ToExpireSoonerThanNextRefresh(t *testing.T) {
	client, hash, key, value := setupHash(t)

	require.NoError(t, hash.Set(context.Background(), key, 123, value))
	registrationTime := time.Now()
	time.Sleep(ttl / 2)
	require.NoError(t, hash.Refresh(context.Background(), registrationTime.Add(ttl*2)))

	expireAfter := registrationTime.Add(ttl)
	valuesExpireAfter(t, client, key, expireAfter)
}

func TestExpiringHash_Refresh_ToExpireAfterNextRefresh(t *testing.T) {
	client, hash, key, value := setupHash(t)

	require.NoError(t, hash.Set(context.Background(), key, 123, value))
	h1 := getHash(t, client, key)
	require.NoError(t, hash.Refresh(context.Background(), time.Now().Add(ttl/10)))
	h2 := getHash(t, client, key)
	assert.Equal(t, h1, h2)
}

func TestExpiringHash_ScanEmpty(t *testing.T) {
	_, hash, key, _ := setupHash(t)

	keysDeleted, err := hash.Scan(context.Background(), key, func(rawHashKey string, value []byte, err error) (bool, error) {
		require.NoError(t, err)
		assert.FailNow(t, "unexpected callback invocation")
		return false, nil
	})
	require.NoError(t, err)
	assert.Zero(t, keysDeleted)
}

func TestExpiringHash_Scan(t *testing.T) {
	_, hash, key, value := setupHash(t)
	cbCalled := false

	require.NoError(t, hash.Set(context.Background(), key, 123, value))
	keysDeleted, err := hash.Scan(context.Background(), key, func(rawHashKey string, v []byte, err error) (bool, error) {
		cbCalled = true
		require.NoError(t, err)
		assert.Equal(t, value, v)
		assert.Equal(t, "123", rawHashKey)
		return false, nil
	})
	require.NoError(t, err)
	assert.Zero(t, keysDeleted)
	assert.True(t, cbCalled)
}

func TestExpiringHash_Len(t *testing.T) {
	_, hash, key, value := setupHash(t)
	require.NoError(t, hash.Set(context.Background(), key, 123, value))
	size, err := hash.Len(context.Background(), key)
	require.NoError(t, err)
	assert.EqualValues(t, 1, size)
}

func TestExpiringHash_ScanGC(t *testing.T) {
	client, hash, key, value := setupHash(t)

	require.NoError(t, hash.Set(context.Background(), key, 123, value))
	newExpireIn := 3 * ttl
	cmd := client.B().Pexpire().Key(key).Milliseconds(newExpireIn.Milliseconds()).Build()
	err := client.Do(context.Background(), cmd).Error()
	require.NoError(t, err)
	time.Sleep(ttl + time.Second)
	require.NoError(t, hash.Set(context.Background(), key, 321, value))

	cbCalled := false
	keysDeleted, err := hash.Scan(context.Background(), key, func(rawHashKey string, v []byte, err error) (bool, error) {
		cbCalled = true
		require.NoError(t, err)
		assert.Equal(t, "321", rawHashKey)
		assert.Equal(t, value, v)
		return false, nil
	})
	require.NoError(t, err)
	assert.EqualValues(t, 1, keysDeleted)
	assert.True(t, cbCalled)
}

func TestExpiringHash_Clear(t *testing.T) {
	client, hash, key, value := setupHash(t)
	require.NoError(t, hash.Set(context.Background(), key, 123, value))
	require.NoError(t, hash.Set(context.Background(), key+"123", 321, value))
	size, err := hash.Clear(context.Background())
	require.NoError(t, err)
	assert.EqualValues(t, 2, size)
	assert.Empty(t, hash.data)
	h := getHash(t, client, key)
	assert.Empty(t, h)
	size, err = hash.Clear(context.Background())
	require.NoError(t, err)
	assert.Zero(t, size)
}

func TestTransactionConflict_Sibling(t *testing.T) {
	client, _, key, _ := setupHash(t)
	c, cancel := client.Dedicate()
	defer cancel()
	iteration := 0
	err := transaction(context.Background(), 10, c, func(ctx context.Context) ([]rueidis.Completed, error) {
		switch iteration {
		case 0:
			// Mutate a sibling mapping on purpose to trigger a conflict situation.
			err := client.Do(context.Background(), client.B().Hset().Key(key).FieldValue().FieldValue("1", "123").Build()).Error() // nolint: contextcheck
			if err != nil {
				return nil, err
			}
		case 1:
			// the expected retry
		default:
			require.FailNow(t, "unexpected invocation")
		}
		iteration++
		return []rueidis.Completed{
			client.B().Hset().Key(key).FieldValue().FieldValue("2", "234").Build(),
		}, nil
	}, key)
	require.NoError(t, err)
	v1, err := client.Do(context.Background(), client.B().Hget().Key(key).Field("1").Build()).ToString()
	require.NoError(t, err)
	assert.Equal(t, "123", v1)
	v2, err := client.Do(context.Background(), client.B().Hget().Key(key).Field("2").Build()).ToString()
	require.NoError(t, err)
	assert.Equal(t, "234", v2)
}

func TestTransactionConflict_SameKey(t *testing.T) {
	client, _, key, _ := setupHash(t)
	c, cancel := client.Dedicate()
	defer cancel()
	iteration := 0
	err := transaction(context.Background(), 10, c, func(ctx context.Context) ([]rueidis.Completed, error) {
		switch iteration {
		case 0:
			// Mutate a sibling mapping on purpose to trigger a conflict situation.
			err := client.Do(context.Background(), client.B().Hset().Key(key).FieldValue().FieldValue("1", "xxxxxx").Build()).Error() // nolint: contextcheck
			if err != nil {
				return nil, err
			}
		case 1:
			// the expected retry
		default:
			require.FailNow(t, "unexpected invocation")
		}
		iteration++
		return []rueidis.Completed{
			client.B().Hset().Key(key).FieldValue().FieldValue("1", "123").Build(),
		}, nil
	}, key)
	require.NoError(t, err)
	v1, err := client.Do(context.Background(), client.B().Hget().Key(key).Field("1").Build()).ToString()
	require.NoError(t, err)
	assert.Equal(t, "123", v1)
}

func TestTransactionConflict_AttemptsExceeded(t *testing.T) {
	client, _, key, _ := setupHash(t)
	c, cancel := client.Dedicate()
	defer cancel()
	iteration := 0
	err := transaction(context.Background(), 1, c, func(ctx context.Context) ([]rueidis.Completed, error) {
		switch iteration {
		case 0:
			// Mutate a sibling mapping on purpose to trigger a conflict situation.
			err := client.Do(context.Background(), client.B().Hset().Key(key).FieldValue().FieldValue("1", "xxxxxx").Build()).Error() // nolint: contextcheck
			if err != nil {
				return nil, err
			}
		default:
			require.FailNow(t, "unexpected invocation")
		}
		iteration++
		return []rueidis.Completed{
			client.B().Hset().Key(key).FieldValue().FieldValue("1", "123").Build(),
		}, nil
	}, key)
	require.Same(t, errAttemptsExceeded, err)
	v1, err := client.Do(context.Background(), client.B().Hget().Key(key).Field("1").Build()).ToString()
	require.NoError(t, err)
	assert.Equal(t, "xxxxxx", v1)
}

func BenchmarkExpiringValue_Unmarshal(b *testing.B) {
	d, err := proto.Marshal(&ExpiringValue{
		ExpiresAt: 123123123,
		Value:     []byte("1231231231232313"),
	})
	require.NoError(b, err)
	b.Run("ExpiringValue", func(b *testing.B) {
		b.ReportAllocs()
		var val ExpiringValue
		for i := 0; i < b.N; i++ {
			err = proto.Unmarshal(d, &val)
		}
	})
	b.Run("ExpiringValueTimestamp", func(b *testing.B) {
		b.ReportAllocs()
		var val ExpiringValueTimestamp
		for i := 0; i < b.N; i++ {
			err = proto.Unmarshal(d, &val)
		}
	})
	b.Run("ExpiringValueTimestamp DiscardUnknown", func(b *testing.B) {
		b.ReportAllocs()
		var val ExpiringValueTimestamp
		for i := 0; i < b.N; i++ {
			err = proto.UnmarshalOptions{
				DiscardUnknown: true,
			}.Unmarshal(d, &val)
		}
	})
}

func BenchmarkPrefixedInt64Key(b *testing.B) {
	b.ReportAllocs()
	const prefix = "pref"
	var sink string
	for i := 0; i < b.N; i++ {
		sink = PrefixedInt64Key(prefix, int64(i))
	}
	_ = sink
}

func TestPrefixedInt64Key(t *testing.T) {
	const prefix = "pref"
	key := PrefixedInt64Key(prefix, 0x1122334455667788)

	assert.Equal(t, prefix+"\x88\x77\x66\x55\x44\x33\x22\x11", key)
}

func setupHash(t *testing.T) (rueidis.Client, *RedisExpiringHash[string, int64], string, []byte) {
	t.Parallel()
	s := miniredis.RunT(t)
	os.Setenv("REDIS_URL", fmt.Sprintf("localhost:%s", s.Port()))
	client := redisClient(t)
	t.Cleanup(client.Close)
	prefix := make([]byte, 32)
	_, err := rand.Read(prefix)
	require.NoError(t, err)
	key := string(prefix)
	hash := NewRedisExpiringHash[string, int64](client, func(key string) string {
		return key
	}, int64ToStr, ttl)
	return client, hash, key, []byte{1, 2, 3}
}

func redisClient(t *testing.T) rueidis.Client {
	redisURL := os.Getenv(redisURLEnvName)
	if redisURL == "" {
		t.Skipf("%s environment variable not set, skipping test", redisURLEnvName)
	}

	u, err := url.Parse(redisURL)
	require.NoError(t, err)
	opts := rueidis.ClientOption{
		ClientName:   "gitlab-agent-test",
		DisableCache: true,
	}
	switch u.Scheme {
	case "unix":
		opts.DialFn = UnixDialer
		opts.InitAddress = []string{u.Path}
	case "redis":
		opts.InitAddress = []string{u.Host}
	case "rediss":
		opts.InitAddress = []string{u.Host}
		opts.TLSConfig = tlstool.DefaultClientTLSConfig()
	default:
		opts.InitAddress = []string{redisURL}
	}
	client, err := rueidis.NewClient(opts)
	require.NoError(t, err)
	return client
}

func getHash(t *testing.T, client rueidis.Client, key string) map[string]string {
	cmd := client.B().Hgetall().Key(key).Build()
	reply, err := client.Do(context.Background(), cmd).AsStrMap()
	require.NoError(t, err)
	return reply
}

func equalHash(t *testing.T, client rueidis.Client, key string, hashKey int64, value []byte) {
	hash := getHash(t, client, key)
	require.Len(t, hash, 1)
	connectionIdStr := strconv.FormatInt(hashKey, 10)
	require.Contains(t, hash, connectionIdStr)
	val := hash[connectionIdStr]
	var msg ExpiringValue
	err := proto.Unmarshal([]byte(val), &msg)
	require.NoError(t, err)
	assert.Equal(t, value, msg.Value)
}

func valuesExpireAfter(t *testing.T, client rueidis.Client, key string, expireAfter time.Time) {
	hash := getHash(t, client, key)
	require.NotEmpty(t, hash)
	for _, val := range hash {
		var msg ExpiringValue
		err := proto.Unmarshal([]byte(val), &msg)
		require.NoError(t, err)
		assert.Greater(t, msg.ExpiresAt, expireAfter.Unix())
	}
}

func int64ToStr(key int64) string {
	return strconv.FormatInt(key, 10)
}
