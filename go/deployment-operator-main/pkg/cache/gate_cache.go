package cache

import (
	"time"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/polly/cache"

	"github.com/pluralsh/deployment-operator/pkg/client"
)

var (
	gateCache *cache.Cache[console.PipelineGateFragment]
)

func InitGateCache(expireAfter time.Duration, consoleClient client.Client) {
	if gateCache != nil {
		return
	}

	gateCache = cache.NewCache[console.PipelineGateFragment](expireAfter, func(id string) (*console.PipelineGateFragment, error) {
		return consoleClient.GetClusterGate(id)
	})
}

func GateCache() *cache.Cache[console.PipelineGateFragment] {
	if gateCache == nil {
		panic("gate cache is not initialized")
	}

	return gateCache
}
