package template

import (
	cmap "github.com/orcaman/concurrent-map/v2"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

var (
	namespacedCache = &gvkCache{cache: cmap.NewStringer[schema.GroupVersionKind, bool]()}
)

type gvkCache struct {
	cache cmap.ConcurrentMap[schema.GroupVersionKind, bool]
}

func (c *gvkCache) Store(gvk schema.GroupVersionKind, namespaced bool) {
	c.cache.Set(gvk, namespaced)
}

func (c *gvkCache) Namespaced(gvk schema.GroupVersionKind) bool {
	val, ok := c.cache.Get(gvk)
	return ok && val
}

func (c *gvkCache) Present(gvk schema.GroupVersionKind) bool {
	_, ok := c.cache.Get(gvk)
	return ok
}
