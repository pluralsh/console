package identity

import (
	"github.com/pluralsh/console/go/controller/cmd/args"
	"github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/log"
	pollycache "github.com/pluralsh/polly/cache"
	"github.com/samber/lo"
	"k8s.io/klog/v2"
)

var cache *identityCache

func Cache() IdentityCache {
	if cache == nil {
		klog.V(log.LogLevelDefault).InfoS("initializing user group cache")
		consoleClient := client.New(args.ConsoleUrl(), args.ConsoleToken(), args.DatadogEnabled())
		cache = &identityCache{
			consoleClient: consoleClient,
			userCache: pollycache.NewCache[string](args.WipeCacheInterval(), func(email string) (*string, error) {
				id, err := consoleClient.GetUserId(email)
				if err != nil {
					return nil, err
				}
				return lo.ToPtr(id), err
			}),
			groupCache: pollycache.NewCache[string](args.WipeCacheInterval(), func(group string) (*string, error) {
				id, err := consoleClient.GetGroupId(group)
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

type IdentityCache interface {
	GetGroupID(name string) (string, error)
	GetUserID(email string) (string, error)
}

type identityCache struct {
	consoleClient client.ConsoleClient
	userCache     *pollycache.Cache[string]
	groupCache    *pollycache.Cache[string]
}

func (u *identityCache) GetUserID(email string) (string, error) {
	id, err := u.userCache.Get(email)
	if err != nil {
		return "", err
	}
	return lo.FromPtr(id), nil
}

func (u *identityCache) GetGroupID(name string) (string, error) {
	id, err := u.groupCache.Get(name)
	if err != nil {
		return "", err
	}
	return lo.FromPtr(id), nil
}
