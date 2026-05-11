package restore

import (
	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/polly/cache"
	"k8s.io/client-go/util/workqueue"
)

type socketPublisher struct {
	restoreQueue workqueue.TypedRateLimitingInterface[string]
	restoreCache *cache.Cache[console.ClusterRestoreFragment]
}

func (sp *socketPublisher) Publish(id string, _ bool) {
	sp.restoreCache.Expire(id)
	sp.restoreQueue.Add(id)
}
