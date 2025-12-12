package plural

import (
	"github.com/pluralsh/console/go/controller/cmd/args"
	"github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/log"
	pollycache "github.com/pluralsh/polly/cache"
	"github.com/samber/lo"
	"k8s.io/klog/v2"
)

var cache *pluralCache

func Cache() ClusterCache {
	if cache == nil {
		klog.V(log.LogLevelDefault).InfoS("initializing cluster cache")

		consoleClient := client.New(args.ConsoleUrl(), args.ConsoleToken(), args.DatadogEnabled())

		cache = &pluralCache{
			consoleClient: consoleClient,
			clusterCache: pollycache.NewCache[string](args.WipeCacheInterval(), func(handle string) (*string, error) {
				id, err := consoleClient.GetClusterIdByHandle(handle)
				if err != nil {
					return nil, err
				}
				return lo.ToPtr(id), err
			}),
			gitRepoCache: pollycache.NewCache[string](args.WipeCacheInterval(), func(url string) (*string, error) {
				id, err := consoleClient.GetRepositoryID(url)
				if err != nil {
					return nil, err
				}
				return lo.ToPtr(id), err
			}),
		}

		klog.V(log.LogLevelDefault).InfoS("user group cache initialized")
	}

	return cache
}

type pluralCache struct {
	consoleClient client.ConsoleClient
	clusterCache  *pollycache.Cache[string]
	gitRepoCache  *pollycache.Cache[string]
}

func (u *pluralCache) GetGitRepoID(url string) (*string, error) {
	return u.gitRepoCache.Get(url)
}

func (u *pluralCache) GetClusterID(handle string) (*string, error) {
	return u.clusterCache.Get(handle)
}

type ClusterCache interface {
	GetGitRepoID(url string) (*string, error)
	GetClusterID(handle string) (*string, error)
}
