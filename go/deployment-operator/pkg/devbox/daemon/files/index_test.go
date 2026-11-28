package files

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"slices"
	"testing"
	"time"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/internal/gittest"
)

const (
	typeFile = devboxv1.FileType_FILE_TYPE_FILE
	typeDir  = devboxv1.FileType_FILE_TYPE_DIRECTORY
)

func paths(entries []*devboxv1.FileEntry) []string {
	out := make([]string, len(entries))
	for i, e := range entries {
		out[i] = e.GetPath()
	}
	return out
}

// best is an index search's results in order
func best(idx *FileIndex, root, q string, hidden bool, limit int) ([]*devboxv1.FileEntry, bool) {
	found, more := idx.search(root, q, hidden, limit)
	m := &matches{limit: limit, seen: map[string]bool{}}
	for _, f := range found {
		m.offer(f)
	}
	return m.response().GetEntries(), more
}

func TestFileIndexSearch(t *testing.T) {
	idx := newFileIndex(MaxIndexEntries)
	idx.addRepo("/home/api")
	for _, p := range []string{
		"/home/api/src", "/home/api/src/components", "/home/api/src/components/Button.tsx",
		"/home/api/src/components/ButtonGroup.tsx", "/home/api/src/utils", "/home/api/src/utils/bundle.ts",
		"/home/api/docs", "/home/api/docs/buttons.md", "/home/api/.github", "/home/api/.github/button.yml",
	} {
		typ := typeFile
		if filepath.Ext(p) == "" {
			typ = typeDir
		}
		idx.add(p, typ)
	}
	search := func(root, q string, hidden bool, limit int) []string {
		found, _ := best(idx, root, q, hidden, limit)
		return paths(found)
	}

	want := []string{
		"/home/api/src/components/Button.tsx", "/home/api/docs/buttons.md", "/home/api/src/components/ButtonGroup.tsx",
	}
	if got := search("/home/api/src", "button", false, 10); !slices.Equal(got, []string{want[0], want[2]}) {
		t.Fatalf("name prefixes, shortest first: %v", got)
	}
	if got := search("/home", "button", false, 10); !slices.Contains(got, "/home/api/.github/button.yml") {
		t.Fatalf("a checkout's dot paths are searched: %v", got)
	}
	if kids, _ := idx.children("/home/api", false, 10); !slices.ContainsFunc(kids, func(e *devboxv1.FileEntry) bool {
		return e.GetName() == ".github"
	}) {
		t.Fatalf("a checkout's dot directories are listed: %v", kids)
	}
	if got := search("/home/api", "btn", false, 10); !slices.Contains(got, "/home/api/src/components/Button.tsx") ||
		slices.Contains(got, "/home/api/src/utils/bundle.ts") {
		t.Fatalf("subsequence: %v", got)
	}
	if got := search("/home/api", "compbut", false, 10); len(got) == 0 || got[0] != "/home/api/src/components/Button.tsx" {
		t.Fatalf("across directories: %v", got)
	}
	if got := search("/home/api", "button", true, 10); !slices.Contains(got, "/home/api/.github/button.yml") {
		t.Fatalf("hidden: %v", got)
	}
	if got := search("/home/api/src/utils", "button", false, 10); len(got) != 0 {
		t.Fatalf("scoped to root: %v", got)
	}
	if got, more := best(idx, "/home/api/src", "button", false, 1); len(got) != 1 || got[0].GetPath() != want[0] || !more {
		t.Fatalf("limit keeps the best and says there's more: %v %t", paths(got), more)
	}
	if _, more := best(idx, "/home", "button", false, 4); more {
		t.Fatal("exactly the limit isn't more")
	}
	found, _ := best(idx, "/home", "components", false, 1)
	if e := found[0]; e.GetType() != typeDir || e.GetRepository() != "api" || e.GetName() != "components" {
		t.Fatalf("entry %v", e)
	}

	before := idx.Len()
	idx.remove("/home/api/src/components")
	if idx.Len() != before-3 {
		t.Fatalf("size %d after removing 3 of %d", idx.Len(), before)
	}
	if got := search("/home/api/docs", "button", false, 10); !slices.Equal(got, []string{"/home/api/docs/buttons.md"}) ||
		slices.Contains(search("/home", "button", false, 10), "/home/api/src/components/Button.tsx") {
		t.Fatalf("after remove: %v", got)
	}
	// the removed names no longer count toward the subtree's characters
	if src := idx.lookup("/home/api/src"); src.sub&charBit('c') != 0 {
		t.Fatal("stale subtree mask")
	}

	// a rebuilt checkout replaces what was there, characters and count included
	fresh := newFileIndex(MaxIndexEntries)
	fresh.addRepo("/home/api")
	fresh.add("/home/api/lib", typeDir)
	fresh.add("/home/api/lib/zebra.go", typeFile)
	if !idx.graft("/home/api", fresh) || idx.Len() != 3 {
		t.Fatalf("graft: %d entries", idx.Len())
	}
	if got := search("/home", "button", false, 10); len(got) != 0 {
		t.Fatalf("old paths survived the graft: %v", got)
	}
	if got := search("/home", "zebra", false, 10); !slices.Equal(got, []string{"/home/api/lib/zebra.go"}) {
		t.Fatalf("grafted paths: %v", got)
	}
	small := newFileIndex(2)
	if small.graft("/home/api", fresh) {
		t.Fatal("graft overfilled the index")
	}
}

func BenchmarkFileIndexSearch(b *testing.B) {
	idx := newFileIndex(MaxIndexEntries)
	idx.addRepo("/home/mono")
	words := []string{"api", "core", "billing", "deploy", "agent", "router", "store", "view", "graph", "util"}
	for i := range 200_000 {
		dir := fmt.Sprintf("/home/mono/%s/%s/%s", words[i%10], words[i/10%10], words[i/100%10])
		idx.add(dir, typeDir)
		idx.add(fmt.Sprintf("%s/%s_%d.go", dir, words[i/1000%10], i), typeFile)
	}
	b.ResetTimer()
	for range b.N {
		idx.search("/home", "routstore", false, DefaultSearchLimit)
	}
}

func eventually(t *testing.T, what string, ok func() bool) {
	t.Helper()
	deadline := time.Now().Add(5 * time.Second)
	for !ok() {
		if time.Now().After(deadline) {
			t.Fatal(what)
		}
		time.Sleep(20 * time.Millisecond)
	}
}

func searchOf(t *testing.T, s *Service, path, q string, limit int) *devboxv1.ListFilesResponse {
	t.Helper()
	resp, err := s.List(context.Background(), &devboxv1.ListFilesRequest{Path: path, Query: q, Limit: int32(limit)})
	if err != nil {
		t.Fatal(err)
	}
	return resp
}

func TestSearchServedFromWatchIndex(t *testing.T) {
	t.Setenv("GIT_CONFIG_GLOBAL", "/dev/null")
	home := t.TempDir()
	repo := gittest.Repo(t, filepath.Join(home, "api"), map[string]string{
		".gitignore": "build/\n*.log\n", "src/handler.go": "package src\n", "debug.log": "x",
		"build/handler.bin": "x", "node_modules/handler/index.js": "x", "yarn.lock": "x", "docs/guide.md": "x",
	})
	if err := os.WriteFile(filepath.Join(home, "handler-notes.md"), []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink("src/handler.go", filepath.Join(repo, "handler-link")); err != nil {
		t.Fatal(err)
	}

	cache := NewChangesCache(slog.New(slog.NewTextHandler(io.Discard, nil)))
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	cache.register(ctx, repo)
	go cache.Run(ctx)
	s := &Service{Home: home, Checkouts: checkouts{repo}, ChangesCache: cache}
	search := func(path, q string) []string {
		t.Helper()
		return paths(searchOf(t, s, path, q, 0).GetEntries())
	}
	eventually(t, "never indexed", func() bool {
		cache.mu.Lock()
		defer cache.mu.Unlock()
		return cache.repos[repo].indexed
	})

	if got := search(repo, "handler"); !slices.Equal(got, []string{filepath.Join(repo, "src/handler.go"), filepath.Join(repo, "handler-link")}) {
		t.Fatalf("ignored and dependency paths searched: %v", got)
	}
	if got := searchOf(t, s, repo, "handler-link", 0).GetEntries(); len(got) != 1 || got[0].GetType() != devboxv1.FileType_FILE_TYPE_SYMLINK {
		t.Fatalf("symlink: %v", got)
	}
	if resp := searchOf(t, s, repo, "handler", 1); len(resp.GetEntries()) != 1 || !resp.GetTruncated() {
		t.Fatalf("limit: %v", resp)
	}
	// the home directory around its checkouts is walked from disk
	if got := search("", "handler"); !slices.Contains(got, filepath.Join(home, "handler-notes.md")) ||
		!slices.Contains(got, filepath.Join(repo, "src/handler.go")) {
		t.Fatalf("home: %v", got)
	}
	if got := search(repo, "debug"); len(got) != 0 {
		t.Fatalf("ignored file: %v", got)
	}

	// a brief listing comes from the index, which never held what's ignored
	brief, err := s.List(ctx, &devboxv1.ListFilesRequest{Path: repo, Brief: true})
	if err != nil {
		t.Fatal(err)
	}
	if got := paths(brief.GetEntries()); !slices.Equal(got, []string{filepath.Join(repo, ".gitignore"), filepath.Join(repo, "docs"),
		filepath.Join(repo, "handler-link"), filepath.Join(repo, "src"), filepath.Join(repo, "yarn.lock")}) {
		t.Fatalf("brief listing: %v", got)
	}
	// hidden from the index but still on disk, so only a disk read would find it
	handler := filepath.Join(repo, "src/handler.go")
	cache.index.remove(handler)
	inSrc, err := s.List(ctx, &devboxv1.ListFilesRequest{Path: filepath.Join(repo, "src"), Brief: true})
	if err != nil {
		t.Fatal(err)
	}
	if len(inSrc.GetEntries()) != 0 {
		t.Fatalf("brief listing read disk: %v", paths(inSrc.GetEntries()))
	}
	cache.index.add(handler, typeFile)

	gittest.Write(t, repo, map[string]string{"src/routes/handler_test.go": "x", "src/trace.log": "x", "src/handlers.go": "x"})
	eventually(t, "new files never indexed", func() bool {
		got := search(repo, "handler")
		return slices.Contains(got, filepath.Join(repo, "src/handlers.go")) && slices.Contains(got, filepath.Join(repo, "src/routes/handler_test.go"))
	})
	if got := search(repo, "trace"); len(got) != 0 {
		t.Fatalf("new ignored file indexed: %v", got)
	}

	// lock files in the work tree are files like any other
	if err := os.Remove(filepath.Join(repo, "yarn.lock")); err != nil {
		t.Fatal(err)
	}
	gittest.Write(t, repo, map[string]string{"poetry.lock": "x"})
	eventually(t, "lock files not tracked", func() bool {
		got := search(repo, "lock")
		return slices.Equal(got, []string{filepath.Join(repo, "poetry.lock")})
	})

	// a populated directory moved in is filtered as the first walk would
	outside := t.TempDir()
	gittest.Write(t, outside, map[string]string{"moved/notes.txt": "x", "moved/run.log": "x"})
	if err := os.Rename(filepath.Join(outside, "moved"), filepath.Join(repo, "moved")); err != nil {
		t.Fatal(err)
	}
	eventually(t, "moved directory not indexed", func() bool { return slices.Contains(search(repo, "notes"), filepath.Join(repo, "moved/notes.txt")) })
	if got := search(repo, "run"); slices.Contains(got, filepath.Join(repo, "moved/run.log")) {
		t.Fatalf("moved directory's ignored file indexed: %v", got)
	}

	// ignore rules changing rebuild the checkout's index (tracked files are never ignored)
	gittest.Write(t, repo, map[string]string{"scratch.tmp": "x"})
	eventually(t, "untracked file never indexed", func() bool { return len(search(repo, "scratch")) == 1 })
	gittest.Write(t, repo, map[string]string{".gitignore": "build/\n*.tmp\n*.md\n"})
	eventually(t, "newly ignored file still searched", func() bool { return len(search(repo, "scratch")) == 0 })
	if got := search(repo, "guide"); len(got) != 1 {
		t.Fatalf("tracked file ignored: %v", got)
	}
	eventually(t, "newly unignored file never searched", func() bool { return len(search(repo, "debug")) == 1 })

	if err := os.RemoveAll(filepath.Join(repo, "src/routes")); err != nil {
		t.Fatal(err)
	}
	eventually(t, "removed directory still indexed", func() bool {
		return !slices.Contains(search(repo, "handler"), filepath.Join(repo, "src/routes/handler_test.go"))
	})
}

// without a complete index, search still reaches everything git doesn't ignore
func TestSearchBeyondTheIndex(t *testing.T) {
	t.Setenv("GIT_CONFIG_GLOBAL", "/dev/null")
	home := t.TempDir()
	repo := gittest.Repo(t, filepath.Join(home, "api"), map[string]string{
		".gitignore": "*.log\n", "src/deep/nested/handler.go": "x", "src/debug.log": "x",
		".github/workflows/ci.yml": "x",
	})
	gittest.Write(t, home, map[string]string{"notes/2026/handler-plan.md": "x", ".hidden/handler.txt": "x"})
	gittest.Write(t, repo, map[string]string{"src/untracked_handler.go": "x"})
	s := &Service{Home: home, Checkouts: checkouts{repo}}

	if got := paths(searchOf(t, s, repo, "handler", 0).GetEntries()); !slices.Equal(got, []string{
		filepath.Join(repo, "src/deep/nested/handler.go"), filepath.Join(repo, "src/untracked_handler.go"),
	}) {
		t.Fatalf("checkout: %v", got)
	}
	if got := paths(searchOf(t, s, "", "ci.yml", 0).GetEntries()); !slices.Contains(got, filepath.Join(repo, ".github/workflows/ci.yml")) {
		t.Fatalf("a checkout's dot paths: %v", got)
	}
	if got := paths(searchOf(t, s, filepath.Join(repo, "src"), "debug", 0).GetEntries()); len(got) != 0 {
		t.Fatalf("ignored file: %v", got)
	}
	if got := searchOf(t, s, repo, "nested", 0).GetEntries(); len(got) == 0 || got[0].GetPath() != filepath.Join(repo, "src/deep/nested") ||
		got[0].GetType() != typeDir {
		t.Fatalf("directories: %v", got)
	}
	got := paths(searchOf(t, s, "", "handler", 0).GetEntries())
	if !slices.Contains(got, filepath.Join(home, "notes/2026/handler-plan.md")) || !slices.Contains(got, filepath.Join(repo, "src/deep/nested/handler.go")) ||
		slices.Contains(got, filepath.Join(home, ".hidden/handler.txt")) {
		t.Fatalf("home: %v", got)
	}
	if resp := searchOf(t, s, "", "handler", 1); len(resp.GetEntries()) != 1 || !resp.GetTruncated() {
		t.Fatalf("limit: %v", resp)
	}
}
