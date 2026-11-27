package files

import (
	"container/heap"
	"context"
	"os"
	"path/filepath"
	"sort"
	"strings"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/gitutil"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/internal/fsutil"
)

// MaxSearchVisits bounds the entries a search reads from disk outside any checkout.
const MaxSearchVisits = 20_000

type match struct {
	entry *devboxv1.FileEntry
	score int
}

type matchHeap []match

func (h matchHeap) Len() int           { return len(h) }
func (h matchHeap) Less(i, j int) bool { return h[i].score < h[j].score }
func (h matchHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }
func (h *matchHeap) Push(x any)        { *h = append(*h, x.(match)) }
func (h *matchHeap) Pop() any {
	old := *h
	x := old[len(old)-1]
	*h = old[:len(old)-1]
	return x
}

// matches keeps a search's best limit matches, scored by their paths relative to its root.
type matches struct {
	root, q string
	hidden  bool
	limit   int
	top     matchHeap
	seen    map[string]bool
	more    bool
}

func (m *matches) offer(e match) {
	if m.seen[e.entry.GetPath()] {
		return
	}
	m.seen[e.entry.GetPath()] = true
	switch {
	case m.top.Len() < m.limit:
		heap.Push(&m.top, e)
	case e.score > m.top[0].score:
		heap.Pop(&m.top)
		heap.Push(&m.top, e)
		m.more = true
	default:
		m.more = true
	}
}

// offerPath scores a path beneath the root, statting it only if it makes the cut.
func (m *matches) offerPath(abs string, typ devboxv1.FileType, repository string) {
	rel, err := filepath.Rel(m.root, abs)
	if err != nil || m.seen[abs] {
		return
	}
	rel = strings.ToLower(filepath.ToSlash(rel))
	// A checkout's dot paths git doesn't ignore, like .github, are part of the project.
	if !m.hidden && repository == "" && (strings.HasPrefix(rel, ".") || strings.Contains(rel, "/.")) {
		return
	}
	score := matchScore([]byte(rel), strings.LastIndex(rel, "/")+1, m.q)
	if score < 0 || (m.top.Len() >= m.limit && score <= m.top[0].score) {
		if score >= 0 {
			m.more = true
		}
		return
	}
	if typ == devboxv1.FileType_FILE_TYPE_UNSPECIFIED {
		info, err := os.Lstat(abs)
		if err != nil {
			return
		}
		typ = fileType(info.Mode())
	}
	m.offer(match{entry: &devboxv1.FileEntry{Path: abs, Name: filepath.Base(abs), Type: typ, Repository: repository}, score: score})
}

func (m *matches) response() *devboxv1.ListFilesResponse {
	found := []match(m.top)
	sort.Slice(found, func(i, j int) bool {
		if found[i].score != found[j].score {
			return found[i].score > found[j].score
		}
		return found[i].entry.GetPath() < found[j].entry.GetPath()
	})
	entries := make([]*devboxv1.FileEntry, len(found))
	for i, f := range found {
		entries[i] = f.entry
	}
	return &devboxv1.ListFilesResponse{Entries: entries, Truncated: m.more}
}

// search answers a ListFiles query: from the file index where it covers root, and beyond that from git's own
// listing of a checkout's paths it doesn't ignore, or a bounded walk outside any checkout.
func (s *Service) search(ctx context.Context, root, q string, hidden bool, limit int) *devboxv1.ListFilesResponse {
	switch {
	case limit <= 0:
		limit = DefaultSearchLimit
	case limit > MaxListEntries:
		limit = MaxListEntries
	}
	m := &matches{root: root, q: strings.ToLower(q), hidden: hidden || strings.HasPrefix(q, "."), limit: limit,
		seen: map[string]bool{}}
	if s.ChangesCache != nil {
		found, more := s.ChangesCache.index.search(root, m.q, m.hidden, limit)
		for _, f := range found {
			m.offer(f)
		}
		m.more = m.more || more
		if s.ChangesCache.covers(root) {
			return m.response()
		}
	}
	if repo := s.checkoutAt(ctx, root); repo != "" {
		s.searchCheckout(ctx, m, repo, root)
	} else {
		s.searchDisk(ctx, m, root)
	}
	return m.response()
}

// checkoutAt is the work tree containing dir, if any.
func (s *Service) checkoutAt(ctx context.Context, dir string) string {
	if repo := s.repoOf(dir); repo != "" {
		return repo
	}
	out, err := gitutil.Run(ctx, dir, "rev-parse", "--show-toplevel")
	if err != nil {
		return ""
	}
	return filepath.Clean(strings.TrimSpace(string(out)))
}

// searchCheckout offers the paths beneath dir in a checkout that git doesn't ignore: its tracked and untracked
// files and the directories holding them.
func (s *Service) searchCheckout(ctx context.Context, m *matches, repo, dir string) {
	rel, err := filepath.Rel(repo, dir)
	if err != nil {
		return
	}
	out, err := gitutil.Run(ctx, repo, "ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", rel)
	if err != nil {
		s.searchDisk(ctx, m, dir)
		return
	}
	name := filepath.Base(repo)
	dirs := map[string]bool{}
	for _, p := range strings.Split(string(out), "\x00") {
		if p == "" {
			continue
		}
		abs := filepath.Join(repo, p)
		if _, inTree := workTreePath(repo, abs); !inTree {
			continue
		}
		m.offerPath(abs, devboxv1.FileType_FILE_TYPE_UNSPECIFIED, name)
		for d := filepath.Dir(abs); d != dir && fsutil.Within(dir, d) && !dirs[d]; d = filepath.Dir(d) {
			dirs[d] = true
			m.offerPath(d, devboxv1.FileType_FILE_TYPE_DIRECTORY, name)
		}
	}
}

// searchDisk walks dir breadth first, shallowest paths first, handing each checkout it meets to the index or git,
// and reports the result truncated if it gives up before reading everything.
func (s *Service) searchDisk(ctx context.Context, m *matches, dir string) {
	queue, visits := []string{dir}, 0
	for len(queue) > 0 {
		d := queue[0]
		queue = queue[1:]
		des, err := os.ReadDir(d)
		if err != nil {
			continue
		}
		if d != dir && hasGitDir(des) {
			if s.ChangesCache == nil || !s.ChangesCache.covers(d) {
				s.searchCheckout(ctx, m, d, d)
			}
			continue
		}
		for _, de := range des {
			if visits++; visits > MaxSearchVisits {
				m.more = true
				return
			}
			if skipDirs[de.Name()] || (!m.hidden && strings.HasPrefix(de.Name(), ".")) {
				continue
			}
			abs := filepath.Join(d, de.Name())
			m.offerPath(abs, fileType(de.Type()), "")
			if de.IsDir() {
				queue = append(queue, abs)
			}
		}
	}
}

func hasGitDir(des []os.DirEntry) bool {
	for _, de := range des {
		if de.Name() == gitDir {
			return true
		}
	}
	return false
}
