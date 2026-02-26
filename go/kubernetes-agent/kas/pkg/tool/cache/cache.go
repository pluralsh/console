package cache

import (
	"sync"
	"time"

	"github.com/pluralsh/kubernetes-agent/pkg/tool/syncz"
)

type Entry[V any] struct {
	// protects state in this object.
	syncz.Mutex
	// Expires holds the time when this entry should be removed from the cache.
	Expires time.Time
	// Item is the cached item.
	Item    V
	HasItem bool
}

func (e *Entry[V]) IsNeedRefreshLocked() bool {
	return !e.HasItem || e.IsExpiredLocked(time.Now())
}

func (e *Entry[V]) IsExpiredLocked(t time.Time) bool {
	return e.Expires.Before(t)
}

type Cache[K comparable, V any] struct {
	mu                    sync.Mutex
	data                  map[K]*Entry[V]
	expirationCheckPeriod time.Duration
	nextExpirationCheck   time.Time
}

func New[K comparable, V any](expirationCheckPeriod time.Duration) *Cache[K, V] {
	return &Cache[K, V]{
		data:                  make(map[K]*Entry[V]),
		expirationCheckPeriod: expirationCheckPeriod,
	}
}

func (c *Cache[K, V]) EvictExpiredEntries() {
	c.mu.Lock()
	defer c.mu.Unlock()
	now := time.Now()
	if now.Before(c.nextExpirationCheck) {
		return
	}
	c.nextExpirationCheck = now.Add(c.expirationCheckPeriod)
	for key, entry := range c.data {
		func() {
			if !entry.TryLock() {
				// entry is busy, skip
				return
			}
			defer entry.Unlock()
			if entry.IsExpiredLocked(now) {
				delete(c.data, key)
			}
		}()
	}
}

func (c *Cache[K, V]) GetOrCreateCacheEntry(key K) *Entry[V] {
	c.mu.Lock()
	defer c.mu.Unlock()
	entry := c.data[key]
	if entry != nil {
		return entry
	}
	entry = &Entry[V]{
		Mutex: syncz.NewMutex(),
	}
	c.data[key] = entry
	return entry
}

func (c *Cache[K, V]) EvictEntry(key K, entry *Entry[V]) {
	c.mu.Lock()
	defer c.mu.Unlock()
	existingEntry := c.data[key]
	if existingEntry == entry {
		delete(c.data, key)
	}
}
