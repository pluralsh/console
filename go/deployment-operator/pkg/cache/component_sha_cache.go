package cache

import (
	"time"
)

var (
	componentShaCache *SimpleCache[string]
)

func InitComponentShaCache(expireAfter time.Duration) {
	InitComponentShaCacheWithExpiryFunc(func() time.Duration { return expireAfter })
}

func InitComponentShaCacheWithExpiryFunc(expiryFn func() time.Duration) {
	if componentShaCache != nil {
		return
	}

	componentShaCache = NewSimpleCacheWithExpiryFunc[string](expiryFn)
}

func ComponentShaCache() *SimpleCache[string] {
	if componentShaCache == nil {
		panic("component sha cache is not initialized")
	}

	return componentShaCache
}
