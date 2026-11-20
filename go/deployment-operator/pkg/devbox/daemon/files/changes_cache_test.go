package files

import (
	"context"
	"io"
	"log/slog"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/gitutil"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/internal/gittest"
)

func TestChangesCacheTracksEditsAndCommits(t *testing.T) {
	t.Setenv("GIT_CONFIG_GLOBAL", "/dev/null")
	home := t.TempDir()
	repo := gittest.Repo(t, filepath.Join(home, "api"), map[string]string{
		"README.md": "one\n", ".gitignore": "build/\n", "src/main.go": "package main\n",
	})

	cache := NewChangesCache(slog.New(slog.NewTextHandler(io.Discard, nil)))
	var computes atomic.Int32
	cache.compute = func(ctx context.Context, dir string, opts gitutil.ChangesOptions) (*devboxv1.RepositoryChanges, error) {
		computes.Add(1)
		return gitutil.Changes(ctx, dir, opts)
	}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go cache.Run(ctx)
	s := &Service{Home: home, Checkouts: checkouts{repo}, ChangesCache: cache}
	get := func() map[string]*devboxv1.FileChange {
		t.Helper()
		resp, err := s.Changes(ctx, &devboxv1.GetChangesRequest{IncludeDiff: true})
		if err != nil {
			t.Fatal(err)
		}
		files := map[string]*devboxv1.FileChange{}
		for _, f := range resp.GetRepositories()[0].GetFiles() {
			files[f.GetPath()] = f
		}
		return files
	}
	// the background refresh lands without anyone asking
	eventually := func(what string, ok func() bool) {
		t.Helper()
		deadline := time.Now().Add(5 * time.Second)
		for !ok() {
			if time.Now().After(deadline) {
				t.Fatal(what)
			}
			time.Sleep(20 * time.Millisecond)
		}
	}
	// waits out background refreshes: no computes for longer than a debounce
	quiet := func() {
		t.Helper()
		last := computes.Load()
		for {
			time.Sleep(refreshDebounce + 300*time.Millisecond)
			if n := computes.Load(); n == last {
				return
			} else {
				last = n
			}
		}
	}
	settled := func() {
		t.Helper()
		eventually("watch never registered", func() bool {
			cache.mu.Lock()
			defer cache.mu.Unlock()
			st := cache.repos[repo]
			return st != nil && st.watched
		})
		quiet()
	}

	if len(get()) != 0 {
		t.Fatal("clean checkout reported changes")
	}
	settled()
	before := computes.Load()
	get()
	get()
	if computes.Load() != before {
		t.Fatal("unchanged checkout recomputed")
	}

	gittest.Write(t, repo, map[string]string{"src/main.go": "package main\n\nfunc main() {}\n", "notes with space.md": "a\nb"})
	eventually("edit not refreshed in the background", func() bool { return computes.Load() > before })
	files := get()
	if f := files["src/main.go"]; f == nil || !strings.Contains(f.GetDiff(), "+func main() {}") {
		t.Fatalf("edit %v", f)
	}
	untracked := files["notes with space.md"]
	if untracked == nil || untracked.GetAdditions() != 2 ||
		untracked.GetDiff() != "diff --git a/notes with space.md b/notes with space.md\nnew file mode 100644\n--- /dev/null\n+++ b/notes with space.md\n@@ -0,0 +1,2 @@\n+a\n+b\n\\ No newline at end of file\n" {
		t.Fatalf("untracked %q", untracked.GetDiff())
	}

	// build output is ignored and never invalidates
	gittest.Write(t, repo, map[string]string{"build/out.bin": "x"})
	quiet()
	steady := computes.Load()
	gittest.Write(t, repo, map[string]string{"build/out.bin": "y"})
	time.Sleep(refreshDebounce + 200*time.Millisecond)
	if computes.Load() != steady {
		t.Fatal("ignored directory invalidated the cache")
	}

	// a commit only touches the git directory
	gittest.Git(t, repo, "add", "-A")
	gittest.Git(t, repo, "commit", "-qm", "edit")
	eventually("commit not seen", func() bool { return len(get()) == 0 })
}

func TestSplitPatchMatchesNameStatus(t *testing.T) {
	t.Setenv("GIT_CONFIG_GLOBAL", "/dev/null")
	repo := gittest.Repo(t, filepath.Join(t.TempDir(), "r"), map[string]string{"a.txt": "1\n", "b.txt": "2\n", "gone.txt": "3\n"})
	gittest.Write(t, repo, map[string]string{"a.txt": "1\n1\n", "b.txt": "2\n2\n"})
	gittest.Git(t, repo, "mv", "gone.txt", "moved.txt")
	rc, err := gitutil.Changes(context.Background(), repo, gitutil.ChangesOptions{IncludeDiff: true})
	if err != nil {
		t.Fatal(err)
	}
	if len(rc.GetFiles()) != 3 {
		t.Fatalf("files %v", rc.GetFiles())
	}
	for _, f := range rc.GetFiles() {
		header, _, _ := strings.Cut(f.GetDiff(), "\n")
		if !strings.HasSuffix(header, " b/"+f.GetPath()) {
			t.Fatalf("%s got %q", f.GetPath(), header)
		}
	}
}
