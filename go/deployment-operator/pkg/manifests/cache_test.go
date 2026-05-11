package manifests

import (
	"testing"

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
