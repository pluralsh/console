package files

import (
	"context"
	"fmt"
	"io/fs"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
	"golang.org/x/sync/singleflight"
	"google.golang.org/protobuf/proto"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/gitutil"
)

const (
	// MaxCacheWatches caps the directories the changes cache watches across all checkouts.
	MaxCacheWatches = 65536
	// refreshDebounce is how long a checkout must be quiet before its changes are recomputed in the background.
	refreshDebounce = 750 * time.Millisecond
	// unwatchedTTL bounds how stale a checkout that couldn't be fully watched may be served.
	unwatchedTTL = 5 * time.Second
	// refreshConcurrency bounds background recomputes.
	refreshConcurrency = 4
)

// changesKey is one checkout's GetChanges result for a base and diff setting.
type changesKey struct {
	repo    string
	base    devboxv1.ChangesBase
	diff    bool
	maxDiff int
}

type changesEntry struct {
	rc  *devboxv1.RepositoryChanges
	gen uint64
	at  time.Time
}

type repoWatch struct {
	// gen advances on every change under the checkout or its git directory; entries from older gens are stale.
	gen     uint64
	watched bool
}

// ChangesCache keeps each checkout's changes current in the background: a watch on the work tree and git
// directory marks a checkout stale as it changes, and a debounced recompute refreshes what was last asked for,
// so GetChanges is usually served without running git.
type ChangesCache struct {
	log *slog.Logger
	// compute is gitutil.Changes (swappable in tests).
	compute func(ctx context.Context, dir string, opts gitutil.ChangesOptions) (*devboxv1.RepositoryChanges, error)
	now     func() time.Time

	mu      sync.Mutex
	w       *fsnotify.Watcher
	watches int
	repos   map[string]*repoWatch
	// dirs maps each watched directory to the checkouts it belongs to (a git common dir is shared by worktrees).
	dirs    map[string]map[string]bool
	entries map[changesKey]*changesEntry
	pending map[string]bool
	sf      singleflight.Group
	refresh chan struct{}
}

// NewChangesCache returns a cache; Run starts its watch.
func NewChangesCache(log *slog.Logger) *ChangesCache {
	return &ChangesCache{
		log:     log,
		compute: gitutil.Changes,
		now:     time.Now,
		repos:   map[string]*repoWatch{},
		dirs:    map[string]map[string]bool{},
		entries: map[changesKey]*changesEntry{},
		pending: map[string]bool{},
		refresh: make(chan struct{}, 1),
	}
}

// Run watches registered checkouts and refreshes stale ones until ctx ends.
func (c *ChangesCache) Run(ctx context.Context) {
	w, err := fsnotify.NewWatcher()
	if err != nil {
		c.log.Warn("changes watch unavailable", "err", err)
		return
	}
	defer w.Close()
	c.mu.Lock()
	c.w = w
	repos := make([]string, 0, len(c.repos))
	for repo := range c.repos {
		repos = append(repos, repo)
	}
	c.mu.Unlock()
	for _, repo := range repos {
		c.watch(ctx, repo)
	}

	var fire <-chan time.Time
	for {
		select {
		case <-ctx.Done():
			return
		case _, ok := <-w.Errors:
			if !ok {
				return
			}
		case ev, ok := <-w.Events:
			if !ok {
				return
			}
			if c.handle(ctx, ev) {
				fire = time.After(refreshDebounce)
			}
		case <-c.refresh:
			fire = time.After(refreshDebounce)
		case <-fire:
			fire = nil
			c.refreshPending(ctx)
		}
	}
}

// Warm computes the default view (against HEAD, with diffs) of each checkout in the background.
func (c *ChangesCache) Warm(ctx context.Context, repos []string) {
	go func() {
		sem := make(chan struct{}, refreshConcurrency)
		var wg sync.WaitGroup
		for _, repo := range repos {
			wg.Add(1)
			sem <- struct{}{}
			go func() {
				defer func() { <-sem; wg.Done() }()
				_, _ = c.Get(ctx, changesKey{repo: repo, diff: true})
			}()
		}
		wg.Wait()
	}()
}

// Get returns a checkout's changes, from the cache when nothing has changed since they were computed.
func (c *ChangesCache) Get(ctx context.Context, key changesKey) (*devboxv1.RepositoryChanges, error) {
	c.register(ctx, key.repo)
	c.mu.Lock()
	st := c.repos[key.repo]
	gen := st.gen
	if e := c.entries[key]; e != nil && e.gen == gen && (st.watched || c.now().Sub(e.at) < unwatchedTTL) {
		c.mu.Unlock()
		return proto.Clone(e.rc).(*devboxv1.RepositoryChanges), nil
	}
	c.mu.Unlock()

	v, err, _ := c.sf.Do(fmt.Sprintf("%s\x00%d\x00%t\x00%d\x00%d", key.repo, key.base, key.diff, key.maxDiff, gen), func() (any, error) {
		rc, err := c.compute(context.WithoutCancel(ctx), key.repo, gitutil.ChangesOptions{Base: key.base, IncludeDiff: key.diff, MaxDiffBytes: key.maxDiff})
		c.mu.Lock()
		defer c.mu.Unlock()
		if err != nil {
			delete(c.entries, key)
			return nil, err
		}
		if e := c.entries[key]; e == nil || e.gen <= gen {
			c.entries[key] = &changesEntry{rc: rc, gen: gen, at: c.now()}
		}
		// the checkout changed while this ran: keep the key so the background refresh recomputes it
		if c.repos[key.repo].gen != gen {
			c.pending[key.repo] = true
			c.kick()
		}
		return rc, nil
	})
	if err != nil {
		return nil, err
	}
	return proto.Clone(v.(*devboxv1.RepositoryChanges)).(*devboxv1.RepositoryChanges), nil
}

// register starts tracking a checkout, watching it if the watch is running.
func (c *ChangesCache) register(ctx context.Context, repo string) {
	c.mu.Lock()
	_, known := c.repos[repo]
	if !known {
		c.repos[repo] = &repoWatch{}
	}
	running := c.w != nil
	c.mu.Unlock()
	if !known && running {
		c.watch(ctx, repo)
	}
}

// watch adds a checkout's work tree (minus git-ignored directories) and git directories to the watch.
func (c *ChangesCache) watch(ctx context.Context, repo string) {
	full := true
	skip := ignoredDirs(ctx, repo)
	_ = filepath.WalkDir(repo, func(p string, d fs.DirEntry, err error) error {
		if err != nil || !d.IsDir() {
			return nil
		}
		if p != repo && (skipDirs[d.Name()] || skip[p]) {
			return filepath.SkipDir
		}
		if !c.add(p, repo) {
			full = false
			return filepath.SkipAll
		}
		return nil
	})
	for _, dir := range gitDirs(ctx, repo) {
		if !c.add(dir, repo) {
			full = false
		}
	}
	c.mu.Lock()
	if st := c.repos[repo]; st != nil {
		st.watched = full
		// anything computed before the watch existed may have missed a change
		st.gen++
		c.pending[repo] = true
	}
	c.mu.Unlock()
	c.kick()
	if !full {
		c.log.Warn("changes watch incomplete; serving with a short ttl", "repo", repo)
	}
}

func (c *ChangesCache) add(dir, repo string) bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	if owners, ok := c.dirs[dir]; ok {
		owners[repo] = true
		return true
	}
	if c.w == nil || c.watches >= MaxCacheWatches || c.w.Add(dir) != nil {
		return false
	}
	c.watches++
	c.dirs[dir] = map[string]bool{repo: true}
	return true
}

// handle marks the checkouts an event belongs to stale, reporting whether any were.
func (c *ChangesCache) handle(ctx context.Context, ev fsnotify.Event) bool {
	// git's own reads surface as attribute changes on some platforms, which would recompute in a loop
	if ev.Op == fsnotify.Chmod || strings.HasSuffix(ev.Name, ".lock") {
		return false
	}
	c.mu.Lock()
	if ev.Has(fsnotify.Remove) || ev.Has(fsnotify.Rename) {
		// the kernel drops a removed directory's watch
		if _, ok := c.dirs[ev.Name]; ok {
			delete(c.dirs, ev.Name)
			c.watches--
		}
	}
	owners := c.dirs[filepath.Dir(ev.Name)]
	repos := make([]string, 0, len(owners))
	for repo := range owners {
		repos = append(repos, repo)
		if st := c.repos[repo]; st != nil {
			st.gen++
		}
		c.pending[repo] = true
	}
	c.mu.Unlock()
	if ev.Has(fsnotify.Create) && len(repos) > 0 {
		if info, err := os.Lstat(ev.Name); err == nil && info.IsDir() && !skipDirs[filepath.Base(ev.Name)] {
			for _, repo := range repos {
				if rel, err := filepath.Rel(repo, ev.Name); err == nil && !strings.HasPrefix(rel, "..") &&
					gitutil.IgnoredFilter(ctx, repo, []string{rel})[rel] {
					continue
				}
				c.addTree(ev.Name, repo)
			}
		}
	}
	return len(repos) > 0
}

func (c *ChangesCache) addTree(dir, repo string) {
	_ = filepath.WalkDir(dir, func(p string, d fs.DirEntry, err error) error {
		if err != nil || !d.IsDir() {
			return nil
		}
		if p != dir && skipDirs[d.Name()] {
			return filepath.SkipDir
		}
		if !c.add(p, repo) {
			c.mu.Lock()
			if st := c.repos[repo]; st != nil {
				st.watched = false
			}
			c.mu.Unlock()
			return filepath.SkipAll
		}
		return nil
	})
}

// Invalidate marks checkouts stale, for changes the watch can't see.
func (c *ChangesCache) Invalidate(repos ...string) {
	c.mu.Lock()
	for _, repo := range repos {
		if st := c.repos[repo]; st != nil {
			st.gen++
			c.pending[repo] = true
		}
	}
	c.mu.Unlock()
	c.kick()
}

func (c *ChangesCache) kick() {
	select {
	case c.refresh <- struct{}{}:
	default:
	}
}

// refreshPending recomputes every cached view of the checkouts that changed.
func (c *ChangesCache) refreshPending(ctx context.Context) {
	c.mu.Lock()
	var keys []changesKey
	for key := range c.entries {
		if c.pending[key.repo] {
			keys = append(keys, key)
		}
	}
	c.pending = map[string]bool{}
	c.mu.Unlock()
	if len(keys) == 0 {
		return
	}
	go func() {
		sem := make(chan struct{}, refreshConcurrency)
		for _, key := range keys {
			sem <- struct{}{}
			go func() {
				defer func() { <-sem }()
				if _, err := c.Get(ctx, key); err != nil {
					c.log.Debug("refresh changes", "repo", key.repo, "err", err)
				}
			}()
		}
	}()
}

// ignoredDirs are the checkout's git-ignored directories (build output, dependencies), which never affect changes.
func ignoredDirs(ctx context.Context, repo string) map[string]bool {
	out, err := gitutil.Run(ctx, repo, "ls-files", "-z", "--others", "--ignored", "--exclude-standard", "--directory")
	res := map[string]bool{}
	if err != nil {
		return res
	}
	for _, p := range strings.Split(string(out), "\x00") {
		if strings.HasSuffix(p, "/") {
			res[filepath.Join(repo, p)] = true
		}
	}
	return res
}

// gitDirs are where git records HEAD, the index and refs for a checkout: its git dir, plus the common dir and its
// refs for a linked worktree.
func gitDirs(ctx context.Context, repo string) []string {
	out, err := gitutil.Run(ctx, repo, "rev-parse", "--absolute-git-dir", "--git-common-dir")
	if err != nil {
		return nil
	}
	lines := strings.Fields(string(out))
	if len(lines) != 2 {
		return nil
	}
	gitDir, common := lines[0], lines[1]
	if !filepath.IsAbs(common) {
		common = filepath.Join(repo, common)
	}
	common = filepath.Clean(common)
	dirs := []string{gitDir}
	if common != gitDir {
		dirs = append(dirs, common)
	}
	_ = filepath.WalkDir(filepath.Join(common, "refs"), func(p string, d fs.DirEntry, err error) error {
		if err == nil && d.IsDir() {
			dirs = append(dirs, p)
		}
		return nil
	})
	return dirs
}
