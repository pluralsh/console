package server

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func Test_GetAuthorizedProxyUserCacheKeyFunc_AllFieldsUsed(t *testing.T) {
	keyFunc := getAuthorizedProxyUserCacheKey("any-prefix")

	redisKeys := map[string]struct{}{}
	redisKeys[keyFunc(proxyUserCacheKey{
		agentId:   1,
		accessKey: "any",
		clusterId: "any",
	})] = struct{}{}
	redisKeys[keyFunc(proxyUserCacheKey{
		accessKey: "any",
	})] = struct{}{}
	redisKeys[keyFunc(proxyUserCacheKey{
		agentId:   1,
		accessKey: "any",
	})] = struct{}{}
	redisKeys[keyFunc(proxyUserCacheKey{
		agentId: 1,
	})] = struct{}{}

	assert.Equal(t, 4, len(redisKeys))
}
