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
