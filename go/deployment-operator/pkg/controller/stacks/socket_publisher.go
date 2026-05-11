package stacks

import (
	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/polly/cache"
	"k8s.io/client-go/util/workqueue"
)

type socketPublisher struct {
	stackRunQueue workqueue.TypedRateLimitingInterface[string]
	stackRunCache *cache.Cache[console.StackRunMinimalFragment]
}

func (sp *socketPublisher) Publish(id string, _ bool) {
	sp.stackRunCache.Expire(id)
	sp.stackRunQueue.Add(id)
}
