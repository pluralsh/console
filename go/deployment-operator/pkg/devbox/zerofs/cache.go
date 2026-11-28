package zerofs

import (
	"errors"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"syscall"
	"time"
)

// cachesDir, under the state root, holds every volume's disk cache, staged here or not. Ids can't start with a
// dot, so it's never taken for a volume's state. Reusing a cache on another stage relies on ZeroFS caching only
// immutable objects, under a directory per bucket identity, which it recovers when it starts.
const cachesDir = ".caches"

func (m *Manager) cacheDir(id string) string { return filepath.Join(m.StateRoot, cachesDir, id) }

// claimCache creates a volume's state, which keeps its cache from eviction, then the cache if it has none parked.
func (m *Manager) claimCache(id string) error {
	m.caches.Lock()
	defer m.caches.Unlock()
	for _, dir := range []string{m.stateDir(id), m.cacheDir(id)} {
		if err := os.MkdirAll(dir, 0o700); err != nil {
			return err
		}
	}
	return nil
}

// removeState ends a volume's stage here once its writer has stopped. Its cache is parked as the most recently
// used, and the oldest parked caches are evicted to the budget.
func (m *Manager) removeState(id string) error {
	now := time.Now()
	if err := os.Chtimes(m.cacheDir(id), now, now); err != nil && !errors.Is(err, fs.ErrNotExist) {
		m.Log.Error(err, "parking the volume's cache", "volume", id)
	}
	if err := os.RemoveAll(m.stateDir(id)); err != nil {
		return err
	}
	m.evictCaches()
	return nil
}

// evictCaches removes the caches of volumes not staged here, least recently parked first, until the rest fit in
// ParkedCacheBytes.
func (m *Manager) evictCaches() {
	m.caches.Lock()
	defer m.caches.Unlock()
	root := filepath.Join(m.StateRoot, cachesDir)
	entries, err := os.ReadDir(root)
	if err != nil {
		if !errors.Is(err, fs.ErrNotExist) {
			m.Log.Error(err, "listing parked caches")
		}
		return
	}
	type parked struct {
		id     string
		parked time.Time
		bytes  int64
	}
	var caches []parked
	var total int64
	for _, e := range entries {
		id := e.Name()
		if !e.IsDir() || !validID(id) || exists(m.stateDir(id)) {
			continue
		}
		info, err := e.Info()
		if err != nil {
			continue
		}
		c := parked{id: id, parked: info.ModTime(), bytes: diskUsage(filepath.Join(root, id))}
		caches = append(caches, c)
		total += c.bytes
	}
	sort.Slice(caches, func(i, j int) bool { return caches[i].parked.Before(caches[j].parked) })
	for _, c := range caches {
		if total <= m.ParkedCacheBytes {
			return
		}
		if err := os.RemoveAll(filepath.Join(root, c.id)); err != nil {
			m.Log.Error(err, "evicting a parked cache", "volume", c.id)
			continue
		}
		total -= c.bytes
		m.Log.Info("evicted a parked cache", "volume", c.id, "bytes", c.bytes, "remaining", total)
	}
}

// diskUsage is what the files under dir occupy on disk. ZeroFS's cache files are sparse, so their sizes overstate
// it several times over.
func diskUsage(dir string) int64 {
	var n int64
	_ = filepath.WalkDir(dir, func(_ string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return nil
		}
		info, err := d.Info()
		if err != nil {
			return nil
		}
		if st, ok := info.Sys().(*syscall.Stat_t); ok {
			n += int64(st.Blocks) * 512
		} else {
			n += info.Size()
		}
		return nil
	})
	return n
}
