package cache

import (
	"time"
)

var (
	componentShaCache *SimpleCache[string]
)

func InitComponentShaCache(expireAfter time.Duration) {
	if componentShaCache != nil {
		return
	}

	componentShaCache = NewSimpleCache[string](expireAfter)
}

func ComponentShaCache() *SimpleCache[string] {
	if componentShaCache == nil {
		panic("component sha cache is not initialized")
	}

	return componentShaCache
}
