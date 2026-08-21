package manifests

import (
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	cmap "github.com/orcaman/concurrent-map/v2"
	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/internal/utils"
	"github.com/pluralsh/console/go/deployment-operator/pkg/cache/persist"
	"k8s.io/klog/v2/textlogger"
)

var (
	log = textlogger.NewLogger(textlogger.NewConfig())
)

type cacheLine struct {
	dir     string
	sha     string
	created time.Time
	expiry  time.Duration
}

type ManifestCache struct {
	cache      cmap.ConcurrentMap[string, *cacheLine]
	token      string
	consoleURL string
	expiry     time.Duration
	cacheDir   string
}

func NewCache(expiry time.Duration, token, consoleURL, cacheDir string) *ManifestCache {
	return &ManifestCache{
		cache:      cmap.New[*cacheLine](),
		token:      token,
		expiry:     expiry,
		consoleURL: consoleURL,
		cacheDir:   cacheDir,
	}
}

func (c *ManifestCache) Fetch(svc *console.ServiceDeploymentForAgent) (string, error) {
	sha, err := fetchSha(c.consoleURL, c.token, svc.ID)
	if err != nil {
		return "", err
	}
	if line, ok := c.cache.Get(svc.ID); ok {
		if line.live() && line.sha == sha {
			return line.dir, nil
		}
		line.wipe()
	}

	if svc.Tarball == nil {
		return "", fmt.Errorf("could not fetch tarball url for service")
	}

	log.V(1).Info("fetching tarball", "url", *svc.Tarball, "sha", sha)

	tarballURL, err := buildTarballURL(*svc.Tarball, sha)
	if err != nil {
		return "", err
	}

	dir, err := c.prepareDir(svc.ID, sha)
	if err != nil {
		return "", err
	}

	log.V(2).Info("fetching fresh tarball", "url", tarballURL.String(), "sha", sha)
	if err := fetch(tarballURL.String(), c.token, sha, dir); err != nil {
		os.RemoveAll(dir)
		return "", err
	}
	log.V(2).Info("using cache dir", "dir", dir)

	c.cache.Set(svc.ID, &cacheLine{dir: dir, sha: sha, created: time.Now(), expiry: c.ExpiryWithJitter()})
	return dir, nil
}

func (c *ManifestCache) prepareDir(id, sha string) (string, error) {
	if c.cacheDir == "" {
		return os.MkdirTemp("", "manifests")
	}

	dir, err := c.manifestDir(id, sha)
	if err != nil {
		return "", err
	}
	if err := os.RemoveAll(dir); err != nil {
		return "", err
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	return dir, nil
}

func (c *ManifestCache) manifestDir(id, sha string) (string, error) {
	if err := safePathComponent(id); err != nil {
		return "", err
	}
	if err := safePathComponent(sha); err != nil {
		return "", err
	}
	return filepath.Join(c.cacheDir, persist.ManifestsDir, id, sha), nil
}

func safePathComponent(name string) error {
	if name == "" || name == "." || name == ".." {
		return fmt.Errorf("invalid cache path component %q", name)
	}
	if strings.ContainsRune(name, '/') || strings.ContainsRune(name, '\\') || strings.ContainsRune(name, filepath.Separator) {
		return fmt.Errorf("invalid cache path component %q", name)
	}
	if strings.ContainsRune(name, 0) {
		return fmt.Errorf("invalid cache path component %q", name)
	}
	return nil
}

func sameDir(a, b string) bool {
	absA, err := filepath.Abs(a)
	if err != nil {
		return false
	}
	absB, err := filepath.Abs(b)
	if err != nil {
		return false
	}
	return absA == absB
}

func buildTarballURL(tarball, sha string) (*url.URL, error) {
	u, err := url.Parse(tarball)
	if err != nil {
		return nil, fmt.Errorf("invalid tarball URL: %w", err)
	}

	if sha != "" {
		q := u.Query()
		q.Set("digest", sha)
		u.RawQuery = q.Encode()
	}

	return u, nil
}

func (c *ManifestCache) Wipe() {
	for _, line := range c.cache.Items() {
		line.wipe()
	}
	c.cache.Clear()
}

func (c *ManifestCache) Expire(id string) {
	if line, ok := c.cache.Get(id); ok {
		line.wipe()
	}
	c.cache.Remove(id)
}

func (c *ManifestCache) ExpiryWithJitter() time.Duration {
	return utils.WithJitterFactor(c.expiry, 0.5)
}

func (c *ManifestCache) Export() map[string]persist.ManifestRecord {
	items := make(map[string]persist.ManifestRecord)
	for id, line := range c.cache.Items() {
		if line == nil || !line.live() {
			continue
		}
		items[id] = persist.ManifestRecord{
			Dir:     line.dir,
			SHA:     line.sha,
			Created: line.created,
			Expiry:  line.expiry,
		}
	}
	log.V(1).Info("exported manifest cache", "count", len(items))
	return items
}

func (c *ManifestCache) Import(items map[string]persist.ManifestRecord) {
	if c.cacheDir == "" {
		log.V(1).Info("skipped manifest cache import, cache dir not set")
		return
	}

	imported, skippedPath, skippedExpired, skippedMissing := 0, 0, 0, 0
	for id, rec := range items {
		expected, err := c.manifestDir(id, rec.SHA)
		if err != nil || !sameDir(expected, rec.Dir) {
			skippedPath++
			continue
		}
		line := &cacheLine{
			dir:     expected,
			sha:     rec.SHA,
			created: rec.Created,
			expiry:  rec.Expiry,
		}
		if !line.live() {
			skippedExpired++
			continue
		}
		if _, err := os.Stat(expected); err != nil {
			skippedMissing++
			continue
		}
		c.cache.Set(id, line)
		imported++
	}
	log.Info("imported manifest cache",
		"imported", imported,
		"skippedPath", skippedPath,
		"skippedExpired", skippedExpired,
		"skippedMissing", skippedMissing,
		"source", len(items),
	)
}

func (l *cacheLine) live() bool {
	return l.created.After(time.Now().Add(-l.expiry))
}

func (l *cacheLine) wipe() {
	os.RemoveAll(l.dir)
}
