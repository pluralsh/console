package sentinel

import (
	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/polly/cache"
	"k8s.io/client-go/util/workqueue"
)

type socketPublisher struct {
	sentinelRunQueue workqueue.TypedRateLimitingInterface[string]
	sentinelRunCache cache.Store[console.SentinelRunJobFragment]
}

func (sp *socketPublisher) Publish(id string, _ bool) {
	sp.sentinelRunCache.Expire(id)
	sp.sentinelRunQueue.Add(id)
}
