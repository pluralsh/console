package cache

import (
	"sync"
	"time"

	cmap "github.com/orcaman/concurrent-map/v2"
)

type simpleCacheLine[T any] struct {
	resource *T
	created  time.Time
}

type SimpleCache[T any] struct {
	sync.Mutex

	cache  cmap.ConcurrentMap[string, simpleCacheLine[T]]
	expiry time.Duration
}

func NewSimpleCache[T any](expiry time.Duration) *SimpleCache[T] {
	return &SimpleCache[T]{
		cache:  cmap.New[simpleCacheLine[T]](),
		expiry: expiry,
	}
}

func (c *SimpleCache[T]) Get(id string) (T, bool) {
	if line, ok := c.cache.Get(id); ok {
		if line.live(c.expiry) {
			return *line.resource, true
		}
	}

	var val T
	return val, false
}

func (c *SimpleCache[T]) Add(id string, resource T) {
	c.cache.Set(id, simpleCacheLine[T]{
		resource: &resource,
		created:  time.Now(),
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

func (l *simpleCacheLine[T]) live(dur time.Duration) bool {
	return l.created.After(time.Now().Add(-dur))
}
