package cache

import (
	cmap "github.com/orcaman/concurrent-map/v2"
	"github.com/pluralsh/console/controller/internal/client"
)

type userGroupCache struct {
	consoleClient client.ConsoleClient
	userMap       cmap.ConcurrentMap[string, string]
	groupMap      cmap.ConcurrentMap[string, string]
}

type UserGroupCache interface {
	GetGroupID(name string) (string, error)
	GetUserID(email string) (string, error)
}

func NewUserGroupCache(consoleClient client.ConsoleClient) UserGroupCache {
	return &userGroupCache{
		consoleClient: consoleClient,
		userMap:       cmap.New[string](),
		groupMap:      cmap.New[string](),
	}
}

func (u *userGroupCache) GetUserID(email string) (string, error) {
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

func (u *userGroupCache) GetGroupID(name string) (string, error) {
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
