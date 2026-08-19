package manifests

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestBuildTarballURL(t *testing.T) {
	t.Run("valid URL, no SHA", func(t *testing.T) {
		u, err := buildTarballURL("https://example.com/foo/bar?serviceId=some-id", "")
		require.NoError(t, err)
		require.Equal(t, "https://example.com/foo/bar?serviceId=some-id", u.String())
	})

	t.Run("valid URL with SHA", func(t *testing.T) {
		u, err := buildTarballURL("https://example.com/foo/bar?serviceId=some-id", "abc123")
		require.NoError(t, err)
		require.Equal(t, "https://example.com/foo/bar?digest=abc123&serviceId=some-id", u.String())
	})

	t.Run("invalid URL", func(t *testing.T) {
		_, err := buildTarballURL(" http://a b c", "")
		require.Error(t, err)
		require.Contains(t, err.Error(), "invalid tarball URL")
	})
}

func TestExpiryWithJitterIsCenteredOnCacheTTL(t *testing.T) {
	cache := NewCache(time.Hour, "", "")

	expiry := cache.ExpiryWithJitter()

	require.GreaterOrEqual(t, expiry, 30*time.Minute)
	require.Less(t, expiry, 90*time.Minute)
}
