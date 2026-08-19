package cache

import (
	"sync"
	"time"

	cmap "github.com/orcaman/concurrent-map/v2"
	"github.com/pluralsh/console/go/deployment-operator/internal/utils"
)

type simpleCacheLine[T any] struct {
	resource  *T
	expiresAt time.Time
}

type SimpleCache[T any] struct {
	sync.Mutex

	cache    cmap.ConcurrentMap[string, simpleCacheLine[T]]
	expiryFn func() time.Duration
}

func NewSimpleCache[T any](expiry time.Duration) *SimpleCache[T] {
	return NewSimpleCacheWithExpiryFunc[T](func() time.Duration { return expiry })
}

func NewSimpleCacheWithExpiryFunc[T any](expiryFn func() time.Duration) *SimpleCache[T] {
	return &SimpleCache[T]{
		cache:    cmap.New[simpleCacheLine[T]](),
		expiryFn: expiryFn,
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
	return utils.WithJitterFactor(c.expiryFn(), 0.5)
}

func (l *simpleCacheLine[T]) live() bool {
	return time.Now().Before(l.expiresAt)
}
