package cache

import (
	"sync"
	"time"

	cmap "github.com/orcaman/concurrent-map/v2"
)

type cacheLine[T any] struct {
	resource *T
	created  time.Time
}

type Cache[T any] struct {
	sync.Mutex

	cache     cmap.ConcurrentMap[string, *cacheLine[T]]
	expiry    time.Duration
	clientGet Getter[T]
}

type Getter[T any] func(id string) (*T, error)

type Store[T any] interface {
	Get(id string) (*T, error)
	Add(id string, resource *T)
	Wipe()
	Expire(id string)
}

func NewCache[T any](expiry time.Duration, clientGet Getter[T]) *Cache[T] {
	return &Cache[T]{
		cache:     cmap.New[*cacheLine[T]](),
		clientGet: clientGet,
		expiry:    expiry,
	}
}

func (c *Cache[T]) Get(id string) (*T, error) {
	if line, ok := c.cache.Get(id); ok {
		if line.live(c.expiry) {
			return line.resource, nil
		}
	}

	return c.Set(id)
}

func (c *Cache[T]) Add(id string, resource *T) {
	c.cache.Set(id, &cacheLine[T]{resource: resource, created: time.Now()})
}

func (c *Cache[T]) Set(id string) (*T, error) {
	c.Lock()
	defer c.Unlock()

	resource, err := c.clientGet(id)
	if err != nil {
		return nil, err
	}

	c.cache.Set(id, &cacheLine[T]{resource: resource, created: time.Now()})
	return resource, nil
}

func (c *Cache[T]) Wipe() {
	c.cache.Clear()
}

type ExportedLine[T any] struct {
	Resource T
	Created  time.Time
}

func (c *Cache[T]) Export() map[string]ExportedLine[T] {
	items := make(map[string]ExportedLine[T])
	for id, line := range c.cache.Items() {
		if line == nil || line.resource == nil || !line.live(c.expiry) {
			continue
		}
		items[id] = ExportedLine[T]{Resource: *line.resource, Created: line.created}
	}
	return items
}

func (c *Cache[T]) Import(items map[string]ExportedLine[T]) {
	for id, line := range items {
		resource := line.Resource
		cl := &cacheLine[T]{resource: &resource, created: line.Created}
		if !cl.live(c.expiry) {
			continue
		}
		c.cache.Set(id, cl)
	}
}

func (c *Cache[T]) Expire(id string) {
	c.Lock()
	defer c.Unlock()

	c.cache.Remove(id)
}

func (l *cacheLine[T]) live(dur time.Duration) bool {
	return l.created.After(time.Now().Add(-dur))
}
