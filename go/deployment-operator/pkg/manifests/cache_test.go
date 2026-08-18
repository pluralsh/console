package manifests

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"sync/atomic"
	"testing"
	"time"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/cache/persist"
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
	cache := NewCache(time.Hour, "", "", "")

	expiry := cache.ExpiryWithJitter()

	require.GreaterOrEqual(t, expiry, 30*time.Minute)
	require.Less(t, expiry, 90*time.Minute)
}

func TestManifestCachePersistsAndReusesDir(t *testing.T) {
	cacheDir := t.TempDir()
	const sha = "abc123"
	tarGzData := createTestTarGz(t)

	var tarballHits atomic.Int32
	tarballServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tarballHits.Add(1)
		_, err := w.Write(tarGzData)
		require.NoError(t, err)
	}))
	t.Cleanup(tarballServer.Close)

	digestServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, err := w.Write([]byte(sha))
		require.NoError(t, err)
	}))
	t.Cleanup(digestServer.Close)

	tarball := tarballServer.URL
	svc := &console.ServiceDeploymentForAgent{ID: "svc-1", Tarball: &tarball}

	first := NewCache(time.Hour, "token", digestServer.URL, cacheDir)
	dir, err := first.Fetch(svc)
	require.NoError(t, err)
	require.Equal(t, filepath.Join(cacheDir, persist.ManifestsDir, "svc-1", sha), dir)
	require.Equal(t, int32(1), tarballHits.Load())

	store, err := persist.Open(cacheDir)
	require.NoError(t, err)
	t.Cleanup(func() { _ = store.Close() })
	require.NoError(t, store.Save(persist.Snapshot{Manifests: first.Export()}))

	second := NewCache(time.Hour, "token", digestServer.URL, cacheDir)
	snap, err := store.Load()
	require.NoError(t, err)
	second.Import(snap.Manifests)

	reused, err := second.Fetch(svc)
	require.NoError(t, err)
	require.Equal(t, dir, reused)
	require.Equal(t, int32(1), tarballHits.Load())
}

func TestManifestCacheImportSkipsExpiredAndMissingDirs(t *testing.T) {
	cacheDir := t.TempDir()
	liveDir := filepath.Join(cacheDir, persist.ManifestsDir, "live", "sha")
	require.NoError(t, os.MkdirAll(liveDir, 0o755))

	c := NewCache(time.Hour, "", "", cacheDir)
	c.Import(map[string]persist.ManifestRecord{
		"live": {
			Dir:     liveDir,
			SHA:     "sha",
			Created: time.Now(),
			Expiry:  time.Hour,
		},
		"expired": {
			Dir:     liveDir,
			SHA:     "old",
			Created: time.Now().Add(-2 * time.Hour),
			Expiry:  time.Hour,
		},
		"missing": {
			Dir:     filepath.Join(cacheDir, "does-not-exist"),
			SHA:     "gone",
			Created: time.Now(),
			Expiry:  time.Hour,
		},
	})

	exported := c.Export()
	require.Contains(t, exported, "live")
	require.NotContains(t, exported, "expired")
	require.NotContains(t, exported, "missing")
}
