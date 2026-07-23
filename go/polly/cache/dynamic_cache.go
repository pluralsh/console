package cache

import (
	"sync"
	"time"

	cmap "github.com/orcaman/concurrent-map/v2"
)

type DynamicCache[T any] struct {
	sync.Mutex

	cache      cmap.ConcurrentMap[string, *cacheLine[T]]
	expiryFunc func() time.Duration
	clientGet  Getter[T]
}

func NewDynamicCache[T any](expiryFunc func() time.Duration, clientGet Getter[T]) *DynamicCache[T] {
	if expiryFunc == nil {
		expiryFunc = func() time.Duration { return 0 }
	}

	return &DynamicCache[T]{
		cache:      cmap.New[*cacheLine[T]](),
		clientGet:  clientGet,
		expiryFunc: expiryFunc,
	}
}

func (c *DynamicCache[T]) Get(id string) (*T, error) {
	if line, ok := c.cache.Get(id); ok {
		if line.live(c.expiryFunc()) {
			return line.resource, nil
		}
	}

	return c.Set(id)
}

func (c *DynamicCache[T]) Add(id string, resource *T) {
	c.cache.Set(id, &cacheLine[T]{resource: resource, created: time.Now()})
}

func (c *DynamicCache[T]) Set(id string) (*T, error) {
	c.Lock()
	defer c.Unlock()

	resource, err := c.clientGet(id)
	if err != nil {
		return nil, err
	}

	c.cache.Set(id, &cacheLine[T]{resource: resource, created: time.Now()})
	return resource, nil
}

func (c *DynamicCache[T]) Wipe() {
	c.cache.Clear()
}

func (c *DynamicCache[T]) Expire(id string) {
	c.Lock()
	defer c.Unlock()

	c.cache.Remove(id)
}
