package cache

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestSimpleCacheStoresJitteredExpiryPerEntry(t *testing.T) {
	cache := NewSimpleCache[string](time.Hour)

	before := time.Now()
	cache.Add("id", "value")
	after := time.Now()

	line, ok := cache.cache.Get("id")
	assert.True(t, ok)
	assert.False(t, line.expiresAt.Before(before.Add(30*time.Minute)))
	assert.True(t, line.expiresAt.Before(after.Add(90*time.Minute)))
}

func TestSimpleCacheUsesCurrentExpiryFunctionValue(t *testing.T) {
	ttl := time.Hour
	cache := NewSimpleCacheWithExpiryFunc[string](func() time.Duration { return ttl })

	ttl = 2 * time.Hour
	before := time.Now()
	cache.Add("id", "value")
	after := time.Now()

	line, ok := cache.cache.Get("id")
	assert.True(t, ok)
	assert.False(t, line.expiresAt.Before(before.Add(time.Hour)))
	assert.True(t, line.expiresAt.Before(after.Add(3*time.Hour)))
}

func TestSimpleCacheExportImportSkipsExpired(t *testing.T) {
	src := NewSimpleCache[string](time.Hour)
	src.Add("live", "keep")
	src.cache.Set("expired", simpleCacheLine[string]{
		resource:  ptr("drop"),
		expiresAt: time.Now().Add(-time.Minute),
	})

	exported := src.Export()
	assert.Contains(t, exported, "live")
	assert.NotContains(t, exported, "expired")

	dst := NewSimpleCache[string](time.Hour)
	dst.Import(exported)
	dst.Import(map[string]ExportedLine[string]{
		"also-expired": {Resource: "nope", ExpiresAt: time.Now().Add(-time.Second)},
	})

	got, ok := dst.Get("live")
	assert.True(t, ok)
	assert.Equal(t, "keep", got)
	_, ok = dst.Get("also-expired")
	assert.False(t, ok)
}

func TestSimpleCacheExportSkipsNilResource(t *testing.T) {
	src := NewSimpleCache[string](time.Hour)
	src.cache.Set("nil", simpleCacheLine[string]{
		expiresAt: time.Now().Add(time.Hour),
	})

	assert.NotPanics(t, func() {
		exported := src.Export()
		assert.NotContains(t, exported, "nil")
	})
}

func ptr[T any](v T) *T {
	return &v
}
