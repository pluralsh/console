package cache

import (
	"time"

	pollycache "github.com/pluralsh/console/go/polly/cache"
	"github.com/samber/lo"

	console "github.com/pluralsh/deployment-operator/pkg/client"
)

const defaultWipeCacheInterval = 30 * time.Minute

type userGroupCache struct {
	consoleClient console.Client
	userCache     *pollycache.Cache[string]
	groupCache    *pollycache.Cache[string]
}

type UserGroupCache interface {
	GetGroupID(name string) (string, error)
	GetUserID(email string) (string, error)
}

func NewUserGroupCache(consoleClient console.Client) UserGroupCache {
	return &userGroupCache{
		consoleClient: consoleClient,
		userCache: pollycache.NewCache[string](defaultWipeCacheInterval, func(email string) (*string, error) {
			id, err := consoleClient.GetUserId(email)
			if err != nil {
				return nil, err
			}
			return lo.ToPtr(id), err
		}),
		groupCache: pollycache.NewCache[string](defaultWipeCacheInterval, func(group string) (*string, error) {
			id, err := consoleClient.GetGroupId(group)
			if err != nil {
				return nil, err
			}
			return lo.ToPtr(id), err
		}),
	}
}

func (u *userGroupCache) GetUserID(email string) (string, error) {
	id, err := u.userCache.Get(email)
	if err != nil {
		return "", err
	}
	return lo.FromPtr(id), nil
}

func (u *userGroupCache) GetGroupID(name string) (string, error) {
	id, err := u.groupCache.Get(name)
	if err != nil {
		return "", err
	}
	return lo.FromPtr(id), nil
}
