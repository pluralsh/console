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
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/internal/fsutil"
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
	// indexed is whether every path the watch sees is in the file index
	indexed bool
}

// ChangesCache keeps each checkout's changes current in the background: a watch on the work tree and git
// directory marks a checkout stale as it changes, and a debounced recompute refreshes what was last asked for,
// so GetChanges is usually served without running git. The same watch keeps a file index of the work trees'
// paths for search.
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

	index *FileIndex
	// created holds files created since the last refresh, by checkout, for indexing once git says they aren't ignored
	created map[string][]string
	// ignoresChanged holds the checkouts whose .gitignore changed since the last refresh, to rebuild in the index
	ignoresChanged map[string]bool
	// rewatching holds the checkouts being walked again, true when another walk was asked for meanwhile
	rewatching map[string]bool
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
		index:   newFileIndex(MaxIndexEntries),
		created: map[string][]string{},

		ignoresChanged: map[string]bool{},
		rewatching:     map[string]bool{},
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
			c.indexChanges(ctx)
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

// watch adds a checkout's work tree (minus git-ignored directories) and git directories to the watch, and
// rebuilds its part of the file index from the work tree's paths that aren't git-ignored.
func (c *ChangesCache) watch(ctx context.Context, repo string) {
	fresh := newFileIndex(MaxIndexEntries)
	fresh.addRepo(repo)
	full, indexed := c.walkTree(ctx, repo, repo, fresh)
	for _, dir := range gitDirs(ctx, repo) {
		if !c.add(dir, repo) {
			full = false
		}
	}
	if !c.index.graft(repo, fresh) {
		c.index.remove(repo)
		indexed = false
	}
	c.mu.Lock()
	if st := c.repos[repo]; st != nil {
		st.indexed = full && indexed
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

// walkTree watches dir and the directories beneath it that git doesn't ignore, adding to idx, when it's set (dir
// is in the work tree), every path it doesn't ignore. It reports whether it watched every directory and indexed
// every path.
func (c *ChangesCache) walkTree(ctx context.Context, repo, dir string, idx *FileIndex) (watched, indexed bool) {
	watched, indexed = true, true
	var skip map[string]bool
	if idx != nil {
		skip = ignoredPaths(ctx, repo, dir)
	}
	_ = filepath.WalkDir(dir, func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if p != dir && (skip[p] || (d.IsDir() && skipDirs[d.Name()])) {
			if d.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}
		if idx != nil && p != repo {
			indexed = indexed && idx.add(p, fileType(d.Type()))
		}
		if d.IsDir() && !c.add(p, repo) {
			watched = false
			return filepath.SkipAll
		}
		return nil
	})
	return watched, indexed && watched
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

// handle marks the checkouts an event belongs to stale and keeps the file index current, reporting whether
// anything needs the debounced refresh.
func (c *ChangesCache) handle(ctx context.Context, ev fsnotify.Event) bool {
	// git's own reads surface as attribute changes on some platforms, which would recompute in a loop
	if ev.Op == fsnotify.Chmod {
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
	trees := map[string]string{}
	refresh := false
	for repo := range owners {
		rel, inTree := workTreePath(repo, ev.Name)
		if inTree {
			trees[repo] = rel
			if filepath.Base(ev.Name) == ".gitignore" {
				c.ignoresChanged[repo] = true
			}
		} else if strings.HasSuffix(ev.Name, ".lock") {
			// git takes lock files in its own directory as it works, which would recompute in a loop
			continue
		}
		if st := c.repos[repo]; st != nil {
			st.gen++
		}
		c.pending[repo] = true
		refresh = true
	}
	c.mu.Unlock()
	if ev.Has(fsnotify.Remove) || ev.Has(fsnotify.Rename) {
		c.index.remove(ev.Name)
	}
	if !ev.Has(fsnotify.Create) || len(owners) == 0 {
		return refresh
	}
	info, err := os.Lstat(ev.Name)
	if err != nil {
		return refresh
	}
	for repo := range owners {
		rel, inTree := trees[repo]
		switch {
		case info.IsDir() && skipDirs[filepath.Base(ev.Name)]:
		case info.IsDir() && !inTree:
			c.addTree(ctx, repo, ev.Name, nil)
		case info.IsDir():
			if !gitutil.IgnoredFilter(ctx, repo, []string{rel})[rel] {
				c.addTree(ctx, repo, ev.Name, c.index)
			}
		case inTree:
			c.mu.Lock()
			c.created[repo] = append(c.created[repo], rel)
			c.mu.Unlock()
			refresh = true
		}
	}
	return refresh
}

// workTreePath is p relative to the checkout, if it's in its work tree rather than outside it or in a skipped
// directory like .git.
func workTreePath(repo, p string) (string, bool) {
	rel, err := filepath.Rel(repo, p)
	if err != nil || rel == "." || rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) {
		return "", false
	}
	for _, seg := range strings.Split(rel, string(filepath.Separator)) {
		if skipDirs[seg] {
			return "", false
		}
	}
	return rel, true
}

// addTree watches (and with idx, indexes) a directory that appeared, as the checkout's first walk would have.
func (c *ChangesCache) addTree(ctx context.Context, repo, dir string, idx *FileIndex) {
	watched, indexed := c.walkTree(ctx, repo, dir, idx)
	if watched && (idx == nil || indexed) {
		return
	}
	c.mu.Lock()
	if st := c.repos[repo]; st != nil {
		st.watched = st.watched && watched
		st.indexed = false
	}
	c.mu.Unlock()
}

// indexChanges brings the file index up to date with what the watch saw since the last refresh: the files created
// that git doesn't ignore, and the checkouts whose ignore rules changed, which are rebuilt.
func (c *ChangesCache) indexChanges(ctx context.Context) {
	c.mu.Lock()
	created, rebuild := c.created, c.ignoresChanged
	c.created, c.ignoresChanged = map[string][]string{}, map[string]bool{}
	c.mu.Unlock()
	for repo := range rebuild {
		c.rewatch(ctx, repo)
	}
	for repo, rels := range created {
		if rebuild[repo] {
			continue
		}
		ignored := gitutil.IgnoredFilter(ctx, repo, rels)
		for _, rel := range rels {
			p := filepath.Join(repo, rel)
			if info, err := os.Lstat(p); err != nil || ignored[rel] || info.IsDir() {
				continue
			} else if !c.index.add(p, fileType(info.Mode())) {
				c.mu.Lock()
				if st := c.repos[repo]; st != nil {
					st.indexed = false
				}
				c.mu.Unlock()
				break
			}
		}
	}
}

// rewatch walks a checkout again in the background, and once more if asked again meanwhile.
func (c *ChangesCache) rewatch(ctx context.Context, repo string) {
	c.mu.Lock()
	if _, running := c.rewatching[repo]; running {
		c.rewatching[repo] = true
		c.mu.Unlock()
		return
	}
	c.rewatching[repo] = false
	c.mu.Unlock()
	go func() {
		for {
			c.watch(ctx, repo)
			c.mu.Lock()
			if !c.rewatching[repo] {
				delete(c.rewatching, repo)
				c.mu.Unlock()
				return
			}
			c.rewatching[repo] = false
			c.mu.Unlock()
		}
	}()
}

// Children lists dir from the index, when the index covers it.
func (c *ChangesCache) Children(dir string, hidden bool, limit int) ([]*devboxv1.FileEntry, bool, bool) {
	if !c.covers(dir) {
		return nil, false, false
	}
	entries, truncated := c.index.children(dir, hidden, limit)
	return entries, truncated, true
}

// covers is whether p is inside a checkout whose every path is indexed.
func (c *ChangesCache) covers(p string) bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	for repo, st := range c.repos {
		if st.indexed && fsutil.Within(repo, p) {
			return true
		}
	}
	return false
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

// ignoredPaths are the checkout's git-ignored paths beneath dir (build output, dependencies), which never affect
// changes and aren't searched; a wholly ignored directory is listed rather than its contents.
func ignoredPaths(ctx context.Context, repo, dir string) map[string]bool {
	res := map[string]bool{}
	rel, err := filepath.Rel(repo, dir)
	if err != nil {
		return res
	}
	out, err := gitutil.Run(ctx, repo, "ls-files", "-z", "--others", "--ignored", "--exclude-standard", "--directory", "--", rel)
	if err != nil {
		return res
	}
	for _, p := range strings.Split(string(out), "\x00") {
		if p != "" {
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
