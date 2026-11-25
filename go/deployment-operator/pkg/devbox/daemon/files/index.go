package files

import (
	"bytes"
	"container/heap"
	"io/fs"
	"path/filepath"
	"slices"
	"sort"
	"strings"
	"sync"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
)

const (
	// MaxIndexEntries caps the paths the file index holds across all checkouts.
	MaxIndexEntries = 250_000
	// DefaultSearchLimit is a search's default result count.
	DefaultSearchLimit = 50
)

// indexNode is one path segment. Nodes on the way to a checkout (the home directory, say) are structural:
// only entries are searched for.
type indexNode struct {
	name, lower string
	parent      *indexNode
	// children are sorted by name
	children []*indexNode
	typ      devboxv1.FileType
	entry    bool
	repo     bool
	// own is the character mask of the name, sub of every name beneath it: a search skips a subtree whose
	// path and sub together lack a character it needs.
	own, sub uint64
}

// FileIndex is an in-memory trie of the paths in watched checkouts, for fuzzy search without touching disk.
type FileIndex struct {
	mu   sync.RWMutex
	root *indexNode
	size int
	// max caps size
	max int
}

func newFileIndex(max int) *FileIndex {
	return &FileIndex{root: &indexNode{typ: devboxv1.FileType_FILE_TYPE_DIRECTORY}, max: max}
}

// fileType is a walked entry's type, as the disk listing reports it.
func fileType(mode fs.FileMode) devboxv1.FileType {
	switch {
	case mode&fs.ModeSymlink != 0:
		return devboxv1.FileType_FILE_TYPE_SYMLINK
	case mode.IsDir():
		return devboxv1.FileType_FILE_TYPE_DIRECTORY
	case mode.IsRegular():
		return devboxv1.FileType_FILE_TYPE_FILE
	default:
		return devboxv1.FileType_FILE_TYPE_OTHER
	}
}

// charBit maps a lowercase byte to one of 64 bits: letters and digits get their own, the rest share.
func charBit(c byte) uint64 {
	switch {
	case c >= 'a' && c <= 'z':
		return 1 << (c - 'a')
	case c >= '0' && c <= '9':
		return 1 << (26 + c - '0')
	default:
		return 1 << (36 + c%28)
	}
}

func maskOf(s string) uint64 {
	var m uint64
	for i := 0; i < len(s); i++ {
		m |= charBit(s[i])
	}
	return m
}

func segments(p string) []string {
	return strings.FieldsFunc(filepath.Clean(p), func(r rune) bool { return r == filepath.Separator })
}

func (n *indexNode) child(name string) (int, *indexNode) {
	i := sort.Search(len(n.children), func(i int) bool { return n.children[i].name >= name })
	if i < len(n.children) && n.children[i].name == name {
		return i, n.children[i]
	}
	return i, nil
}

func (n *indexNode) path() string {
	var parts []string
	for c := n; c.parent != nil; c = c.parent {
		parts = append(parts, c.name)
	}
	var b strings.Builder
	for i := len(parts) - 1; i >= 0; i-- {
		b.WriteByte(filepath.Separator)
		b.WriteString(parts[i])
	}
	return b.String()
}

func (idx *FileIndex) lookup(p string) *indexNode {
	n := idx.root
	for _, seg := range segments(p) {
		if _, n = n.child(seg); n == nil {
			return nil
		}
	}
	return n
}

// add indexes a path, reporting false when the index is full.
func (idx *FileIndex) add(p string, typ devboxv1.FileType) bool {
	return idx.insert(p, typ, false)
}

// addRepo indexes a checkout's root.
func (idx *FileIndex) addRepo(p string) bool {
	return idx.insert(p, devboxv1.FileType_FILE_TYPE_DIRECTORY, true)
}

func (idx *FileIndex) insert(p string, typ devboxv1.FileType, repo bool) bool {
	idx.mu.Lock()
	defer idx.mu.Unlock()
	n := idx.root
	for _, seg := range segments(p) {
		i, c := n.child(seg)
		if c == nil {
			lower := strings.ToLower(seg)
			c = &indexNode{name: seg, lower: lower, parent: n, typ: devboxv1.FileType_FILE_TYPE_DIRECTORY, own: maskOf(lower)}
			n.children = slices.Insert(n.children, i, c)
			for a, m := n, c.own; a != nil && a.sub|m != a.sub; a = a.parent {
				a.sub |= m
			}
		}
		n = c
	}
	if !n.entry {
		if idx.size >= idx.max {
			return false
		}
		idx.size++
		n.entry = true
	}
	if len(n.children) == 0 {
		n.typ = typ
	}
	n.repo = n.repo || repo
	return true
}

// graft replaces the subtree at p with the one from, which holds p and nothing outside it, reporting false when
// that would overfill the index.
func (idx *FileIndex) graft(p string, from *FileIndex) bool {
	from.mu.RLock()
	defer from.mu.RUnlock()
	fresh := from.lookup(p)
	if fresh == nil {
		return false
	}
	idx.mu.Lock()
	defer idx.mu.Unlock()
	if old := idx.lookup(p); old != nil {
		if idx.size-old.entries()+from.size > idx.max {
			return false
		}
		idx.detach(old)
	} else if idx.size+from.size > idx.max {
		return false
	}
	idx.size += from.size
	n := idx.root
	segs := segments(p)
	for _, seg := range segs[:len(segs)-1] {
		i, c := n.child(seg)
		if c == nil {
			lower := strings.ToLower(seg)
			c = &indexNode{name: seg, lower: lower, parent: n, typ: devboxv1.FileType_FILE_TYPE_DIRECTORY, own: maskOf(lower)}
			n.children = slices.Insert(n.children, i, c)
		}
		n = c
	}
	i, _ := n.child(fresh.name)
	n.children = slices.Insert(n.children, i, fresh)
	fresh.parent = n
	for a, m := n, fresh.own|fresh.sub; a != nil && a.sub|m != a.sub; a = a.parent {
		a.sub |= m
	}
	return true
}

// remove drops a path and everything beneath it.
func (idx *FileIndex) remove(p string) {
	idx.mu.Lock()
	defer idx.mu.Unlock()
	if n := idx.lookup(p); n != nil && n.parent != nil {
		idx.detach(n)
	}
}

// detach unlinks a node, its now-empty structural ancestors and their characters.
func (idx *FileIndex) detach(n *indexNode) {
	idx.size -= n.entries()
	parent := n.parent
	i, _ := parent.child(n.name)
	parent.children = append(parent.children[:i], parent.children[i+1:]...)
	// structural ancestors left without children go too
	for parent.parent != nil && !parent.entry && len(parent.children) == 0 {
		gp := parent.parent
		i, _ := gp.child(parent.name)
		gp.children = append(gp.children[:i], gp.children[i+1:]...)
		parent = gp
	}
	for a := parent; a != nil; a = a.parent {
		var m uint64
		for _, c := range a.children {
			m |= c.own | c.sub
		}
		if m == a.sub {
			break
		}
		a.sub = m
	}
}

func (n *indexNode) entries() int {
	count := 0
	if n.entry {
		count++
	}
	for _, c := range n.children {
		count += c.entries()
	}
	return count
}

// Len is how many paths are indexed.
func (idx *FileIndex) Len() int {
	idx.mu.RLock()
	defer idx.mu.RUnlock()
	return idx.size
}

type hit struct {
	score int
	node  *indexNode
}

type hits []hit

func (h hits) Len() int           { return len(h) }
func (h hits) Less(i, j int) bool { return h[i].score < h[j].score }
func (h hits) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }
func (h *hits) Push(x any)        { *h = append(*h, x.(hit)) }
func (h *hits) Pop() any {
	old := *h
	x := old[len(old)-1]
	*h = old[:len(old)-1]
	return x
}

// search returns the best limit entries under root matching q (lowercase), unordered, skipping dot-named paths
// below root unless hidden, and whether more matched.
func (idx *FileIndex) search(root, q string, hidden bool, limit int) ([]match, bool) {
	idx.mu.RLock()
	defer idx.mu.RUnlock()
	start := idx.lookup(root)
	if start == nil {
		return nil, false
	}
	qm := maskOf(q)
	top, more := &hits{}, false
	var rel []byte
	var walk func(n *indexNode, pm uint64)
	walk = func(n *indexNode, pm uint64) {
		for _, c := range n.children {
			if !hidden && strings.HasPrefix(c.name, ".") {
				continue
			}
			cm := pm | c.own
			if (cm|c.sub)&qm != qm {
				continue
			}
			mark := len(rel)
			if mark > 0 {
				rel = append(rel, '/')
			}
			base := len(rel)
			rel = append(rel, c.lower...)
			if c.entry && cm&qm == qm {
				if s := matchScore(rel, base, q); s >= 0 {
					switch {
					case top.Len() < limit:
						heap.Push(top, hit{s, c})
					case s > (*top)[0].score:
						heap.Pop(top)
						heap.Push(top, hit{s, c})
						more = true
					default:
						more = true
					}
				}
			}
			if len(c.children) > 0 {
				walk(c, cm)
			}
			rel = rel[:mark]
		}
	}
	walk(start, 0)

	out := make([]match, top.Len())
	for i, h := range *top {
		out[i] = match{entry: indexEntry(h.node, h.node.path()), score: h.score}
	}
	return out, more
}

// children lists the indexed entries directly in dir, by name, skipping dot-named ones unless hidden.
func (idx *FileIndex) children(dir string, hidden bool, limit int) (entries []*devboxv1.FileEntry, truncated bool) {
	idx.mu.RLock()
	defer idx.mu.RUnlock()
	n := idx.lookup(dir)
	if n == nil {
		return nil, false
	}
	prefix := n.path()
	for _, c := range n.children {
		if !c.entry || (!hidden && strings.HasPrefix(c.name, ".")) {
			continue
		}
		if len(entries) >= limit {
			return entries, true
		}
		entries = append(entries, indexEntry(c, prefix+string(filepath.Separator)+c.name))
	}
	return entries, false
}

func indexEntry(n *indexNode, p string) *devboxv1.FileEntry {
	e := &devboxv1.FileEntry{Path: p, Name: n.name, Type: n.typ}
	for a := n; a != nil; a = a.parent {
		if a.repo {
			e.Repository = a.name
			break
		}
	}
	return e
}

// match tiers, worst first (an exact match is the name or its stem before an extension); within a tier, boundary and contiguous matches score higher, then shorter paths
const (
	tierPath = iota
	tierPathSubstring
	tierName
	tierNameSubstring
	tierNamePrefix
	tierNameExact
)

// matchScore scores a lowercase query against a lowercase relative path whose last segment starts at base,
// favouring the name over its directories; -1 is no match.
func matchScore(rel []byte, base int, q string) int {
	name := rel[base:]
	tier, bonus := -1, 0
	if i := bytes.Index(name, []byte(q)); i >= 0 {
		switch {
		case i == 0 && (len(name) == len(q) || name[len(q)] == '.'):
			tier = tierNameExact
		case i == 0:
			tier = tierNamePrefix
		default:
			tier = tierNameSubstring
			if boundary(name[i-1]) {
				bonus = 64
			}
		}
	} else if b, ok := subsequence(name, q); ok {
		tier, bonus = tierName, b
	} else if i := bytes.Index(rel, []byte(q)); i >= 0 {
		tier = tierPathSubstring
		if i == 0 || boundary(rel[i-1]) {
			bonus = 64
		}
	} else if b, ok := subsequence(rel, q); ok {
		tier, bonus = tierPath, b
	}
	if tier < 0 {
		return -1
	}
	return tier<<20 | min(bonus, 1023)<<10 | (1023 - min(len(rel), 1023))
}

func boundary(c byte) bool {
	return c == '/' || c == '-' || c == '_' || c == '.' || c == ' '
}

// subsequence matches q's characters in order through s, earliest first, scoring each one that starts a word or
// follows the last.
func subsequence(s []byte, q string) (int, bool) {
	bonus, j, last := 0, 0, -2
	for i := 0; i < len(s) && j < len(q); i++ {
		if s[i] != q[j] {
			continue
		}
		if i == 0 || boundary(s[i-1]) {
			bonus += 8
		}
		if i == last+1 {
			bonus += 4
		}
		last = i
		j++
	}
	return bonus, j == len(q)
}
