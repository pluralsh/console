package plural

import (
	"context"

	cmap "github.com/orcaman/concurrent-map/v2"
	"github.com/pluralsh/console/go/controller/cmd/args"
	"github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/log"
	"k8s.io/apimachinery/pkg/util/wait"
	"k8s.io/klog/v2"
)

var cache *clusterCache

func Cache() ClusterCache {
	if cache == nil {
		klog.V(log.LogLevelDefault).InfoS("initializing cluster cache")

		cache = &clusterCache{
			consoleClient: client.New(args.ConsoleUrl(), args.ConsoleToken(), args.DatadogEnabled()),
			clusterMap:    cmap.New[string](),
			gitRepoMap:    cmap.New[string](),
		}

		go func() {
			_ = wait.PollUntilContextCancel(context.Background(), args.WipeCacheInterval(), false,
				func(ctx context.Context) (done bool, err error) {
					cache.Wipe()
					return false, nil
				})
		}()

		klog.V(log.LogLevelDefault).InfoS("user group cache initialized")
	}

	return cache
}

type clusterCache struct {
	consoleClient client.ConsoleClient
	clusterMap    cmap.ConcurrentMap[string, string]
	gitRepoMap    cmap.ConcurrentMap[string, string]
}

func (u *clusterCache) GetGitRepoID(url string) (string, error) {
	id, ok := u.gitRepoMap.Get(url)
	if ok {
		return id, nil
	}

	repoID, err := u.consoleClient.GetRepositoryID(url)
	if err != nil {
		return "", err
	}

	u.gitRepoMap.Set(url, repoID)
	return repoID, nil
}

func (u *clusterCache) GetClusterID(handle string) (string, error) {
	id, ok := u.clusterMap.Get(handle)
	if ok {
		return id, nil
	}

	clusterID, err := u.consoleClient.GetClusterIdByHandle(handle)
	if err != nil {
		return "", err
	}

	u.clusterMap.Set(handle, clusterID)
	return clusterID, nil
}

type ClusterCache interface {
	GetGitRepoID(url string) (string, error)
	GetClusterID(handle string) (string, error)
	Wipe()
}

func (u *clusterCache) Wipe() {
	u.gitRepoMap.Clear()
	u.clusterMap.Clear()
	klog.V(log.LogLevelDefault).InfoS("wiped user cluster cache")
}
