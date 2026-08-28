package cache

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCacheUsesDynamicExpiryFunc(t *testing.T) {
	fetches := 0
	expiry := time.Hour
	c := NewDynamicCache(func() time.Duration { return expiry }, func(id string) (*string, error) {
		fetches++
		return &id, nil
	})

	initial := "cached"
	c.Add("id", &initial)

	value, err := c.Get("id")
	require.NoError(t, err)
	assert.Equal(t, "cached", *value)
	assert.Equal(t, 0, fetches)

	expiry = 0
	value, err = c.Get("id")
	require.NoError(t, err)
	assert.Equal(t, "id", *value)
	assert.Equal(t, 1, fetches)
}

func TestCacheExportImportSkipsExpired(t *testing.T) {
	fetches := 0
	c := NewCache(time.Hour, func(id string) (*string, error) {
		fetches++
		return &id, nil
	})

	live := "keep"
	c.Add("live", &live)
	c.cache.Set("expired", &cacheLine[string]{
		resource: ptr("drop"),
		created:  time.Now().Add(-2 * time.Hour),
	})

	exported := c.Export()
	assert.Contains(t, exported, "live")
	assert.NotContains(t, exported, "expired")

	dst := NewCache(time.Hour, func(id string) (*string, error) {
		t.Fatalf("unexpected fetch of %s", id)
		return nil, nil
	})
	dst.Import(exported)
	dst.Import(map[string]ExportedLine[string]{
		"also-expired": {Resource: "nope", Created: time.Now().Add(-2 * time.Hour)},
	})

	got, err := dst.Get("live")
	require.NoError(t, err)
	assert.Equal(t, "keep", *got)
	assert.Equal(t, 0, fetches)
}

func ptr[T any](v T) *T {
	return &v
}
