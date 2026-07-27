package cache

import (
	"math/rand"
	"sync"
	"time"

	cmap "github.com/orcaman/concurrent-map/v2"
)

type simpleCacheLine[T any] struct {
	resource  *T
	expiresAt time.Time
}

type SimpleCache[T any] struct {
	sync.Mutex

	cache        cmap.ConcurrentMap[string, simpleCacheLine[T]]
	expiry       time.Duration
	expiryJitter time.Duration
}

func NewSimpleCache[T any](expiry, expiryJitter time.Duration) *SimpleCache[T] {
	return &SimpleCache[T]{
		cache:        cmap.New[simpleCacheLine[T]](),
		expiry:       expiry,
		expiryJitter: expiryJitter,
	}
}

func (c *SimpleCache[T]) Get(id string) (T, bool) {
	if line, ok := c.cache.Get(id); ok {
		if line.live() {
			return *line.resource, true
		}
	}

	var val T
	return val, false
}

func (c *SimpleCache[T]) Add(id string, resource T) {
	c.cache.Set(id, simpleCacheLine[T]{
		resource:  &resource,
		expiresAt: time.Now().Add(c.ExpiryWithJitter()),
	})
}

func (c *SimpleCache[T]) Wipe() {
	c.cache.Clear()
}

func (c *SimpleCache[T]) Expire(id string) {
	c.Lock()
	defer c.Unlock()

	c.cache.Remove(id)
}

func (c *SimpleCache[T]) ExpiryWithJitter() time.Duration {
	if c.expiryJitter <= 0 {
		return c.expiry
	}

	return c.expiry + time.Duration(rand.Int63n(int64(c.expiryJitter)))
}

func (l *simpleCacheLine[T]) live() bool {
	return time.Now().Before(l.expiresAt)
}
