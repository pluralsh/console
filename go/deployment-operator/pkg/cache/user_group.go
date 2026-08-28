package cache

import (
	"time"

	pollycache "github.com/pluralsh/console/go/polly/cache"
	"github.com/samber/lo"

	console "github.com/pluralsh/console/go/deployment-operator/pkg/client"
)

const defaultWipeCacheInterval = 30 * time.Minute

type IdentityLine struct {
	Value   string
	Created time.Time
}

type userGroupCache struct {
	consoleClient console.Client
	userCache     *pollycache.Cache[string]
	groupCache    *pollycache.Cache[string]
}

type UserGroupCache interface {
	GetGroupID(name string) (string, error)
	GetUserID(email string) (string, error)
	Export() (users, groups map[string]IdentityLine)
	Import(users, groups map[string]IdentityLine)
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

func (u *userGroupCache) Export() (map[string]IdentityLine, map[string]IdentityLine) {
	return identityLinesFrom(u.userCache.Export()), identityLinesFrom(u.groupCache.Export())
}

func (u *userGroupCache) Import(users, groups map[string]IdentityLine) {
	u.userCache.Import(pollyLinesFrom(users))
	u.groupCache.Import(pollyLinesFrom(groups))
}

func identityLinesFrom(items map[string]pollycache.ExportedLine[string]) map[string]IdentityLine {
	lines := make(map[string]IdentityLine, len(items))
	for id, line := range items {
		lines[id] = IdentityLine{Value: line.Resource, Created: line.Created}
	}
	return lines
}

func pollyLinesFrom(items map[string]IdentityLine) map[string]pollycache.ExportedLine[string] {
	lines := make(map[string]pollycache.ExportedLine[string], len(items))
	for id, line := range items {
		lines[id] = pollycache.ExportedLine[string]{Resource: line.Value, Created: line.Created}
	}
	return lines
}
