package cache

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestSimpleCacheStoresJitteredExpiryPerEntry(t *testing.T) {
	cache := NewSimpleCache[string](time.Hour, 30*time.Minute)

	before := time.Now()
	cache.Add("id", "value")
	after := time.Now()

	line, ok := cache.cache.Get("id")
	assert.True(t, ok)
	assert.False(t, line.expiresAt.Before(before.Add(time.Hour)))
	assert.True(t, line.expiresAt.Before(after.Add(time.Hour+30*time.Minute)))
}

func TestSimpleCacheWithoutJitterUsesBaseExpiry(t *testing.T) {
	cache := NewSimpleCache[string](time.Hour, 0)

	before := time.Now()
	cache.Add("id", "value")
	after := time.Now()

	line, ok := cache.cache.Get("id")
	assert.True(t, ok)
	assert.False(t, line.expiresAt.Before(before.Add(time.Hour)))
	assert.False(t, line.expiresAt.After(after.Add(time.Hour)))
}
