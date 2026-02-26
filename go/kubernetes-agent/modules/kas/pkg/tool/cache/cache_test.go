package cache

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

const (
	key     = 1
	itemVal = 123
)

func TestEntry(t *testing.T) {
	c := New[int, int](time.Minute)
	expires := time.Now().Add(time.Hour)
	checkEntry := func() {
		entry := c.GetOrCreateCacheEntry(key)
		entry.Lock(context.Background())
		defer entry.Unlock()
		assert.True(t, entry.HasItem)
		assert.False(t, entry.IsExpiredLocked(time.Now()))
		assert.False(t, entry.IsNeedRefreshLocked())
		assert.Equal(t, itemVal, entry.Item)
		assert.Equal(t, expires, entry.Expires)
	}
	entry := c.GetOrCreateCacheEntry(key)
	entry.Lock(context.Background())
	defer entry.Unlock()
	go checkEntry() // started while holding the lock
	assert.False(t, entry.HasItem)
	assert.True(t, entry.IsExpiredLocked(time.Now()))
	assert.True(t, entry.IsNeedRefreshLocked())
	entry.Item = itemVal
	entry.HasItem = true
	entry.Expires = expires
}

func TestEvictExpiredEntries_RemovesExpired(t *testing.T) {
	c := New[int, int](time.Minute)
	func() { // init entry
		entry := c.GetOrCreateCacheEntry(key)
		entry.Lock(context.Background())
		defer entry.Unlock()
		entry.Item = itemVal
		entry.HasItem = true
		entry.Expires = time.Now().Add(-time.Second)
	}()
	c.EvictExpiredEntries()
	entry := c.GetOrCreateCacheEntry(key)
	entry.Lock(context.Background())
	defer entry.Unlock()
	assert.Zero(t, entry.Item)
	assert.Zero(t, entry.Expires)
}

func TestEvictExpiredEntries_IgnoresBusy(t *testing.T) {
	c := New[int, int](time.Minute)
	expires := time.Now().Add(-time.Second)
	func() {
		entry := c.GetOrCreateCacheEntry(key)
		entry.Lock(context.Background())
		defer entry.Unlock()
		entry.Expires = expires
		entry.Item = itemVal
		entry.HasItem = true
		c.EvictExpiredEntries() // evict while locked
	}()
	entry := c.GetOrCreateCacheEntry(key)
	entry.Lock(context.Background())
	defer entry.Unlock()
	assert.Equal(t, itemVal, entry.Item)
	assert.Equal(t, expires, entry.Expires)
}
