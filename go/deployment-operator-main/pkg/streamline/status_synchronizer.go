package streamline

import (
	"slices"
	"strings"
	"time"

	"golang.org/x/time/rate"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/deployment-operator/internal/utils"
	"github.com/pluralsh/deployment-operator/pkg/cache"
	"github.com/pluralsh/deployment-operator/pkg/client"
	"github.com/pluralsh/deployment-operator/pkg/common"
)

// NewStatusSynchronizer creates a new StatusSynchronizer with rate limiting set to 10 calls per second.
func NewStatusSynchronizer(client client.Client, cacheTTL time.Duration) StatusSynchronizer {
	return StatusSynchronizer{
		client:      client,
		shaCache:    cache.NewSimpleCache[string](cacheTTL),
		rateLimiter: rate.NewLimiter(rate.Limit(50), 10),
	}
}

type StatusSynchronizer struct {
	client      client.Client
	shaCache    *cache.SimpleCache[string]
	rateLimiter *rate.Limiter
}

func (in *StatusSynchronizer) UpdateServiceComponents(serviceId string, components []*console.ComponentAttributes) error {
	// Ensure consistent ordering for comparison.
	slices.SortFunc(components, func(a, b *console.ComponentAttributes) int {
		return strings.Compare(common.ComponentAttributesKey(*a), common.ComponentAttributesKey(*b))
	})

	// Hash the components to determine if there has been a meaningful change we need to report to the server.
	sha, err := utils.HashObject(struct {
		ServiceId  string                         `json:"serviceId"`
		Attributes []*console.ComponentAttributes `json:"attributes"`
	}{
		ServiceId:  serviceId,
		Attributes: components,
	})
	if err != nil {
		return err
	}

	if old, ok := in.shaCache.Get(serviceId); ok && old == sha {
		return nil
	}

	// Rate limit API calls. If the rate limit is exceeded, skip the update silently.
	if !in.rateLimiter.Allow() {
		return nil
	}

	if err = in.client.UpdateComponents(serviceId, "", nil, components, nil, nil); err != nil {
		return err
	}

	in.shaCache.Add(serviceId, sha)

	return nil
}
