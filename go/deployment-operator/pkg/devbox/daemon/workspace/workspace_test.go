package workspace

import (
	"context"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"testing"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/internal/gittest"
)

func repo(name, remote string) RepoInfo {
	return RepoInfo{Checkout: &devboxv1.Checkout{Name: name, Path: "/home/dev/" + name, RemoteUrl: remote,
		DefaultBranch: "main", Branch: "main", HeadSha: "0123456789abcdef"}}
}

func TestProjectMDBlockAndStubs(t *testing.T) {
	user := "# Checkout service\n\nOur notes, written by hand.\n\n## Repositories\n\n### api\nThe API. Keep this text.\n\n## Runbook\nDon't touch.\n"
	doc := UpdateProjectMD(user, []RepoInfo{repo("api", "https://github.com/acme/api.git"), repo("web", "git@github.com:acme/web.git")})

	if strings.Count(doc, BlockEnd) != 1 || !strings.Contains(doc, BlockStart) {
		t.Fatalf("managed block missing:\n%s", doc)
	}
	if strings.Index(doc, BlockStart) < strings.Index(doc, "# Checkout service") {
		t.Fatal("block inserted above the H1")
	}
	for _, keep := range []string{"Our notes, written by hand.", "The API. Keep this text.", "## Runbook\nDon't touch.\n"} {
		if !strings.Contains(doc, keep) {
			t.Fatalf("user content %q lost:\n%s", keep, doc)
		}
	}
	if strings.Count(doc, "### api") != 1 {
		t.Fatalf("existing stub duplicated:\n%s", doc)
	}
	webStub := strings.Index(doc, "### web")
	if webStub < 0 || webStub > strings.Index(doc, "## Runbook") || webStub < strings.Index(doc, "### api") {
		t.Fatalf("web stub not appended at the end of ## Repositories:\n%s", doc)
	}
	if !strings.Contains(doc, "github.com/acme/web") || !strings.Contains(doc, "main @ 0123456") {
		t.Fatalf("table rows:\n%s", doc)
	}

	// Regeneration replaces only the block; a repo going away doesn't remove its prose.
	again := UpdateProjectMD(doc, []RepoInfo{repo("api", "https://github.com/acme/api.git")})
	if strings.Contains(between(again, BlockStart, BlockEnd), "web") {
		t.Fatalf("stale row kept:\n%s", again)
	}
	if !strings.Contains(again, "### web") || strings.Count(again, "### api") != 1 {
		t.Fatalf("stubs changed on regeneration:\n%s", again)
	}
	if UpdateProjectMD(again, []RepoInfo{repo("api", "https://github.com/acme/api.git")}) != again {
		t.Fatal("regeneration is not idempotent")
	}

	// No ## Repositories section: one is created.
	bare := UpdateProjectMD("# P\n\nhello\n", []RepoInfo{repo("api", "")})
	if !strings.Contains(bare, "\n## Repositories\n") || !strings.Contains(bare, "### api") {
		t.Fatalf("section not created:\n%s", bare)
	}
}

func between(s, a, b string) string {
	i, j := strings.Index(s, a), strings.Index(s, b)
	if i < 0 || j < i {
		return ""
	}
	return s[i:j]
}

func newWorkspace(t *testing.T) (*Manager, string) {
	t.Helper()
	t.Setenv("GIT_CONFIG_GLOBAL", "/dev/null")
	home := t.TempDir()
	skel := t.TempDir()
	gittest.Write(t, skel, map[string]string{".bashrc": "# skel\n"})
	m, err := New(Options{Home: home, StateDir: filepath.Join(home, ".plural"), SkelDir: skel,
		Log: slog.New(slog.NewTextHandler(io.Discard, nil))})
	if err != nil {
		t.Fatal(err)
	}
	return m, home
}

func TestHydrationCollision(t *testing.T) {
	m, home := newWorkspace(t)
	src := t.TempDir()
	acmeAPI := gittest.Repo(t, filepath.Join(src, "acme", "api"), map[string]string{"main.go": "package main\n"})
	otherAPI := gittest.Repo(t, filepath.Join(src, "other", "api"), map[string]string{"lib.go": "package lib\n"})
	acmeWeb := gittest.Repo(t, filepath.Join(src, "acme", "web"), map[string]string{"index.html": "<html>\n"})
	if err := os.MkdirAll(filepath.Join(home, "web"), 0o755); err != nil { // a plain directory, not a checkout
		t.Fatal(err)
	}

	err := m.Hydrate(context.Background(), []*devboxv1.RepositorySpec{{Url: acmeAPI}, {Url: otherAPI}, {Url: acmeWeb, Description: "The frontend"}})
	if err != nil {
		t.Fatal(err)
	}
	for dir, file := range map[string]string{"api": "main.go", "other-api": "lib.go", "acme-web": "index.html"} {
		if _, err := os.Stat(filepath.Join(home, dir, file)); err != nil {
			t.Errorf("%s not cloned into ~/%s: %v", file, dir, err)
		}
	}
	// Same remote again resolves to the existing checkout.
	if d, _ := m.DirFor(&devboxv1.RepositorySpec{Url: acmeAPI}); d != filepath.Join(home, "api") {
		t.Fatalf("same remote resolved to %s", d)
	}
	// A third repository named api gets a numbered directory.
	if d, _ := m.DirFor(&devboxv1.RepositorySpec{Url: "https://github.com/acme/api-fork/api"}); d != filepath.Join(home, "api-fork-api") {
		t.Fatalf("third api resolved to %s", d)
	}

	pm, err := os.ReadFile(m.ProjectMDPath())
	if err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{"~/api", "~/other-api", "~/acme-web", "### other-api", "The frontend"} {
		if !strings.Contains(string(pm), name) {
			t.Errorf("Project.md missing %q:\n%s", name, pm)
		}
	}
	agents, err := os.ReadFile(filepath.Join(home, "AGENTS.md"))
	if err != nil || !strings.HasPrefix(string(agents), "# Plural DevBox") {
		t.Fatalf("AGENTS.md: %v", err)
	}
	for _, link := range []string{"CLAUDE.md", "GEMINI.md"} {
		if target, err := os.Readlink(filepath.Join(home, link)); err != nil || target != "AGENTS.md" {
			t.Errorf("%s -> %q (%v)", link, target, err)
		}
	}
	if b, _ := os.ReadFile(filepath.Join(home, ".bashrc")); string(b) != "# skel\n" {
		t.Error("skeleton not applied")
	}

	// A restarted daemon doesn't clone again, and user edits to Project.md survive a refresh.
	edited := strings.Replace(string(pm), "### api\n", "### api\nHand-written notes.\n", 1)
	if err := os.WriteFile(m.ProjectMDPath(), []byte(edited), 0o644); err != nil {
		t.Fatal(err)
	}
	m2, err := New(Options{Home: home, StateDir: filepath.Join(home, ".plural"), Log: slog.New(slog.NewTextHandler(io.Discard, nil))})
	if err != nil {
		t.Fatal(err)
	}
	if err := m2.Hydrate(context.Background(), []*devboxv1.RepositorySpec{{Url: "/does/not/exist"}}); err != nil {
		t.Fatalf("second hydration cloned again: %v", err)
	}
	if pm2, _ := os.ReadFile(m.ProjectMDPath()); !strings.Contains(string(pm2), "Hand-written notes.") {
		t.Fatal("user edit lost on refresh")
	}
}

func TestWorktrees(t *testing.T) {
	m, home := newWorkspace(t)
	src := t.TempDir()
	a := gittest.Repo(t, filepath.Join(src, "acme", "api"), map[string]string{"a": "1\n"})
	b := gittest.Repo(t, filepath.Join(src, "acme", "web"), map[string]string{"b": "1\n"})
	if err := m.Hydrate(context.Background(), []*devboxv1.RepositorySpec{{Url: a}, {Url: b}}); err != nil {
		t.Fatal(err)
	}
	cwd, err := m.Worktrees("t1", []string{"api", "web"})
	if err != nil {
		t.Fatal(err)
	}
	if cwd != filepath.Join(home, ".threads", "t1") {
		t.Fatalf("cwd %s", cwd)
	}
	for _, r := range []string{"api", "web"} {
		out := gittest.Git(t, filepath.Join(cwd, r), "rev-parse", "--abbrev-ref", "HEAD")
		if strings.TrimSpace(out) != "devbox/t1" {
			t.Errorf("%s worktree on %q", r, out)
		}
	}
	if _, err := os.Lstat(filepath.Join(cwd, "Project.md")); err != nil {
		t.Error("Project.md not linked into the thread dir")
	}
	if got := m.ThreadWorktrees("t1"); len(got) != 2 {
		t.Fatalf("thread worktrees %v", got)
	}
	single, err := m.Worktrees("t2", []string{"api"})
	if err != nil || single != filepath.Join(home, ".threads", "t2", "api") {
		t.Fatalf("single-repo worktree cwd %s %v", single, err)
	}
}

// A box restored from a snapshot can hydrate before its network is back: clones that couldn't reach the remote
// aren't recorded as done, so the next boot retries them and clears the condition.
func TestHydrationRetriesUnreachableClones(t *testing.T) {
	t.Setenv("GIT_CONFIG_GLOBAL", "/dev/null")
	home := t.TempDir()
	remote := filepath.Join(t.TempDir(), "acme", "api")
	type cond struct {
		msg    string
		active bool
	}
	var conds []cond
	open := func() *Manager {
		m, err := New(Options{Home: home, StateDir: filepath.Join(home, ".plural"), CloneRetry: -1,
			Log:       slog.New(slog.NewTextHandler(io.Discard, nil)),
			Condition: func(_, _, msg string, active bool) { conds = append(conds, cond{msg, active}) }})
		if err != nil {
			t.Fatal(err)
		}
		return m
	}
	repos := []*devboxv1.RepositorySpec{{Url: remote}}

	if err := open().Hydrate(context.Background(), repos); err == nil {
		t.Fatal("hydrating from a missing remote should fail")
	}
	if len(conds) != 1 || !conds[0].active {
		t.Fatalf("conditions = %v, want one active failure", conds)
	}
	m := open()
	if m.Hydrated() {
		t.Fatal("a failed clone was recorded as hydrated")
	}

	gittest.Repo(t, remote, map[string]string{"main.go": "package main\n"})
	if err := m.Hydrate(context.Background(), repos); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(home, "api", "main.go")); err != nil {
		t.Fatalf("not cloned on the next boot: %v", err)
	}
	if last := conds[len(conds)-1]; last.active {
		t.Errorf("conditions = %v, want the failure cleared", conds)
	}
	if !open().Hydrated() {
		t.Error("a finished hydration wasn't recorded")
	}
}
