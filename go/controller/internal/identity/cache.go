package identity

import (
	"context"

	cmap "github.com/orcaman/concurrent-map/v2"
	"github.com/pluralsh/console/go/controller/cmd/args"
	"github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/log"
	"k8s.io/apimachinery/pkg/util/wait"
	"k8s.io/klog/v2"
)

var cache *identityCache

func Cache() IdentityCache {
	if cache == nil {
		klog.V(log.LogLevelDefault).InfoS("initializing user group cache")

		cache = &identityCache{
			consoleClient: client.New(args.ConsoleUrl(), args.ConsoleToken()),
			userMap:       cmap.New[string](),
			groupMap:      cmap.New[string](),
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

type IdentityCache interface {
	GetGroupID(name string) (string, error)
	GetUserID(email string) (string, error)
	Wipe()
}

type identityCache struct {
	consoleClient client.ConsoleClient
	userMap       cmap.ConcurrentMap[string, string]
	groupMap      cmap.ConcurrentMap[string, string]
}

func (u *identityCache) GetUserID(email string) (string, error) {
	userID, ok := u.userMap.Get(email)
	if ok {
		return userID, nil
	}

	user, err := u.consoleClient.GetUser(email)
	if err != nil {
		return "", err
	}

	u.userMap.Set(email, user.ID)
	return user.ID, nil
}

func (u *identityCache) GetGroupID(name string) (string, error) {
	groupID, ok := u.groupMap.Get(name)
	if ok {
		return groupID, nil
	}

	group, err := u.consoleClient.GetGroup(name)
	if err != nil {
		return "", err
	}

	u.groupMap.Set(name, group.ID)
	return group.ID, nil
}

func (u *identityCache) Wipe() {
	u.userMap.Clear()
	u.groupMap.Clear()

	klog.V(log.LogLevelDefault).InfoS("wiped user group cache")

}
