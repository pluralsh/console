package cache

import (
	"time"
)

var (
	componentShaCache *SimpleCache[string]
)

func InitComponentShaCache(expireAfter, expireJitter time.Duration) {
	if componentShaCache != nil {
		return
	}

	componentShaCache = NewSimpleCache[string](expireAfter, expireJitter)
}

func ComponentShaCache() *SimpleCache[string] {
	if componentShaCache == nil {
		panic("component sha cache is not initialized")
	}

	return componentShaCache
}
