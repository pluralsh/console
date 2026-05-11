package service

import (
	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/polly/cache"
	"k8s.io/klog/v2"

	"github.com/pluralsh/deployment-operator/pkg/manifests"
	"github.com/pluralsh/deployment-operator/pkg/streamline"

	"k8s.io/client-go/util/workqueue"
)

type socketPublisher struct {
	svcQueueGetter func() workqueue.TypedRateLimitingInterface[string]
	svcCache       *cache.Cache[console.ServiceDeploymentForAgent]
	manCache       *manifests.ManifestCache
}

func (sp *socketPublisher) Publish(id string, kick bool) {
	sp.svcCache.Expire(id)
	sp.manCache.Expire(id)
	if kick {
		err := streamline.GetGlobalStore().Expire(id)
		if err != nil {
			klog.ErrorS(err, "unable to expire service", "id", id)
		}
	}

	sp.svcQueueGetter().Add(id)
}
