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
