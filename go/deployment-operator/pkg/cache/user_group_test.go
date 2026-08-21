package cache

import (
	"testing"
	"time"

	pollycache "github.com/pluralsh/console/go/polly/cache"
	"github.com/samber/lo"
	"github.com/stretchr/testify/require"
)

func TestUserGroupCacheExportImportSkipsExpired(t *testing.T) {
	ug := &userGroupCache{
		userCache: pollycache.NewCache[string](time.Hour, func(id string) (*string, error) {
			t.Fatalf("unexpected user fetch %s", id)
			return nil, nil
		}),
		groupCache: pollycache.NewCache[string](time.Hour, func(id string) (*string, error) {
			t.Fatalf("unexpected group fetch %s", id)
			return nil, nil
		}),
	}

	ug.userCache.Add("a@example.com", lo.ToPtr("user-1"))
	ug.groupCache.Add("admins", lo.ToPtr("group-1"))
	ug.userCache.Import(map[string]pollycache.ExportedLine[string]{
		"old@example.com": {Resource: "user-old", Created: time.Now().Add(-2 * time.Hour)},
	})

	users, groups := ug.Export()
	require.Equal(t, "user-1", users["a@example.com"].Value)
	require.Equal(t, "group-1", groups["admins"].Value)
	require.NotContains(t, users, "old@example.com")

	restored := &userGroupCache{
		userCache: pollycache.NewCache[string](time.Hour, func(id string) (*string, error) {
			t.Fatalf("unexpected user fetch %s", id)
			return nil, nil
		}),
		groupCache: pollycache.NewCache[string](time.Hour, func(id string) (*string, error) {
			t.Fatalf("unexpected group fetch %s", id)
			return nil, nil
		}),
	}
	restored.Import(users, groups)

	userID, err := restored.GetUserID("a@example.com")
	require.NoError(t, err)
	require.Equal(t, "user-1", userID)

	groupID, err := restored.GetGroupID("admins")
	require.NoError(t, err)
	require.Equal(t, "group-1", groupID)
}
