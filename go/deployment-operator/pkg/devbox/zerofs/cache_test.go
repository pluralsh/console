package zerofs

import (
	"bytes"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/go-logr/logr/testr"
)

func cacheManager(t *testing.T, budget int64) *Manager {
	return &Manager{StateRoot: t.TempDir(), ParkedCacheBytes: budget, Log: testr.New(t)}
}

func writeCache(t *testing.T, m *Manager, id string, size int, used time.Time) {
	t.Helper()
	dir := filepath.Join(m.cacheDir(id), "bucket_1", "hybrid_cache")
	if err := os.MkdirAll(dir, 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "block"), bytes.Repeat([]byte{1}, size), 0o600); err != nil {
		t.Fatal(err)
	}
	if err := os.Chtimes(m.cacheDir(id), used, used); err != nil {
		t.Fatal(err)
	}
}

func TestCacheIsReusedOnRestage(t *testing.T) {
	m := cacheManager(t, 1<<30)
	if err := m.claimCache("home"); err != nil {
		t.Fatal(err)
	}
	writeCache(t, m, "home", 4096, time.Now().Add(-time.Hour))
	if err := m.removeState("home"); err != nil {
		t.Fatal(err)
	}
	if exists(m.stateDir("home")) {
		t.Fatal("the state is left behind")
	}
	info, err := os.Stat(m.cacheDir("home"))
	if err != nil {
		t.Fatalf("the cache wasn't parked: %v", err)
	}
	if time.Since(info.ModTime()) > time.Minute {
		t.Fatalf("the parked cache is dated %s, not now", info.ModTime())
	}
	if err := m.claimCache("home"); err != nil {
		t.Fatal(err)
	}
	if !exists(filepath.Join(m.cacheDir("home"), "bucket_1", "hybrid_cache", "block")) {
		t.Fatal("restaging lost the parked cache")
	}
}

func TestEvictCachesOldestFirstSparingStaged(t *testing.T) {
	const size = 1 << 20
	m := cacheManager(t, size+size/2)
	now := time.Now()
	writeCache(t, m, "oldest", size, now.Add(-3*time.Hour))
	writeCache(t, m, "older", size, now.Add(-2*time.Hour))
	writeCache(t, m, "newest", size, now.Add(-time.Hour))
	// A staged volume's cache is older still, but in use.
	if err := m.claimCache("staged"); err != nil {
		t.Fatal(err)
	}
	writeCache(t, m, "staged", size, now.Add(-4*time.Hour))

	m.evictCaches()
	for id, want := range map[string]bool{"oldest": false, "older": false, "newest": true, "staged": true} {
		if got := exists(m.cacheDir(id)); got != want {
			t.Errorf("cache %s kept = %v, want %v", id, got, want)
		}
	}
}

func TestZeroBudgetKeepsNoCache(t *testing.T) {
	m := cacheManager(t, 0)
	if err := m.claimCache("home"); err != nil {
		t.Fatal(err)
	}
	writeCache(t, m, "home", 4096, time.Now())
	if err := m.removeState("home"); err != nil {
		t.Fatal(err)
	}
	if exists(m.cacheDir("home")) {
		t.Fatal("kept a cache with no budget")
	}
}

func TestDiskUsageCountsAllocatedBlocks(t *testing.T) {
	dir := t.TempDir()
	f, err := os.Create(filepath.Join(dir, "sparse"))
	if err != nil {
		t.Fatal(err)
	}
	if err := f.Truncate(64 << 20); err != nil {
		t.Fatal(err)
	}
	if _, err := f.WriteAt(bytes.Repeat([]byte{1}, 4096), 0); err != nil {
		t.Fatal(err)
	}
	f.Close()
	if n := diskUsage(dir); n == 0 || n >= 1<<20 {
		t.Fatalf("a 64MiB file with 4KiB written uses %d bytes", n)
	}
}
