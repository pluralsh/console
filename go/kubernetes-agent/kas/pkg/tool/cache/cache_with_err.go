package cache

import (
	"context"
	"time"

	"go.opentelemetry.io/otel/trace"
)

type GetItemDirectly[V any] func() (V, error)

type ErrCacher[K any] interface {
	// GetError retrieves a cached error.
	// Returns nil if no cached error found or if there was a problem accessing the cache.
	GetError(ctx context.Context, key K) error
	// CacheError puts error into the cache.
	CacheError(ctx context.Context, key K, err error, errTtl time.Duration)
}

type CacheWithErr[K comparable, V any] struct {
	cache     *Cache[K, V]
	ttl       time.Duration
	errTtl    time.Duration
	errCacher ErrCacher[K]
	tracer    trace.Tracer
	// isCacheable determines whether an error is cacheable or not.
	// Returns true if cacheable and false otherwise.
	isCacheable func(error) bool
}

func NewWithError[K comparable, V any](ttl, errTtl time.Duration, errCacher ErrCacher[K], tracer trace.Tracer,
	isCacheableFunc func(error) bool) *CacheWithErr[K, V] {
	return &CacheWithErr[K, V]{
		cache:       New[K, V](ttl),
		ttl:         ttl,
		errTtl:      errTtl,
		errCacher:   errCacher,
		tracer:      tracer,
		isCacheable: isCacheableFunc,
	}
}

func (c *CacheWithErr[K, V]) GetItem(ctx context.Context, key K, f GetItemDirectly[V]) (V, error) {
	ctx, span := c.tracer.Start(ctx, "cache.GetItem", trace.WithSpanKind(trace.SpanKindInternal))
	defer span.End()
	if c.ttl == 0 {
		return f()
	}
	c.cache.EvictExpiredEntries()
	lockCtx, lockSpan := c.tracer.Start(ctx, "cache.Lock", trace.WithSpanKind(trace.SpanKindInternal))
	entry := c.cache.GetOrCreateCacheEntry(key)
	locked := entry.Lock(lockCtx)
	lockSpan.End()
	if !locked { // a concurrent caller may be refreshing the entry. Block until exclusive access is available.
		var v V
		return v, ctx.Err()
	}
	evictEntry := false
	defer func() {
		entry.Unlock()
		if evictEntry {
			// Currently, cache (e.g. in EvictExpiredEntries()) grabs the cache lock and then an entry's lock,
			// but only via TryLock(). We may need to use Lock() rather than TryLock() in the future in some
			// other method. That would lead to deadlocks if we grab an entry's lock and then such method is called
			// concurrently. Hence,	to future-proof the code, calling EvictEntry() after entry's lock has been
			// unlocked here.
			c.cache.EvictEntry(key, entry)
		}
	}()
	if entry.IsNeedRefreshLocked() {
		err := c.errCacher.GetError(ctx, key)
		if err != nil {
			evictEntry = true
			var v V
			return v, err
		}
		item, err := f()
		if err != nil {
			if c.isCacheable != nil && c.isCacheable(err) {
				// cacheable error
				c.errCacher.CacheError(ctx, key, err, c.errTtl)
			}
			var v V
			return v, err
		}
		entry.Item = item
		entry.HasItem = true
		entry.Expires = time.Now().Add(c.ttl)
	}
	return entry.Item, nil
}
