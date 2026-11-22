package prs

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
)

func git(t *testing.T, dir string, args ...string) string {
	t.Helper()
	cmd := exec.Command("git", args...)
	cmd.Dir = dir
	cmd.Env = append(os.Environ(), identity...)
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("git %v: %v\n%s", args, err, out)
	}
	return strings.TrimSpace(string(out))
}

var identity = []string{"GIT_AUTHOR_NAME=Dev", "GIT_AUTHOR_EMAIL=dev@example.com", "GIT_COMMITTER_NAME=Dev",
	"GIT_COMMITTER_EMAIL=dev@example.com", "GIT_CONFIG_GLOBAL=/dev/null"}

// checkout is a clone of a bare origin with one commit on main.
func checkout(t *testing.T) (dir, origin string) {
	t.Helper()
	root := t.TempDir()
	origin = filepath.Join(root, "origin.git")
	git(t, root, "init", "--quiet", "--bare", "-b", "main", origin)
	dir = filepath.Join(root, "api")
	git(t, root, "clone", "--quiet", origin, dir)
	git(t, dir, "checkout", "--quiet", "-b", "main")
	if err := os.WriteFile(filepath.Join(dir, "main.go"), []byte("package main\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	git(t, dir, "add", "-A")
	git(t, dir, "commit", "--quiet", "-m", "init")
	git(t, dir, "push", "--quiet", "-u", "origin", "main")
	git(t, dir, "remote", "set-head", "origin", "main")
	return dir, origin
}

func preparer(dir, proxy string) *Preparer {
	return New(Options{
		Checkouts: func(context.Context) []*devboxv1.Checkout {
			return []*devboxv1.Checkout{{Path: dir, Name: filepath.Base(dir)}}
		},
		Env:           func() []string { return identity },
		Endpoints:     func() *devboxv1.HarnessEndpoints { return &devboxv1.HarnessEndpoints{AiProxyUrl: proxy} },
		Client:        http.DefaultClient,
		RecentPrompts: func(string) []string { return []string{"add a health endpoint"} },
	})
}

func TestPrepareWritesCommitsAndPushes(t *testing.T) {
	dir, origin := checkout(t)
	if err := os.WriteFile(filepath.Join(dir, "health.go"), []byte("package main\n\nfunc health() {}\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	var asked chatRequest
	proxy := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/ai/v1/chat/completions" || r.Header.Get("Authorization") == "" {
			http.Error(w, "unexpected "+r.URL.Path, http.StatusNotFound)
			return
		}
		_ = json.NewDecoder(r.Body).Decode(&asked)
		answer := "```json\n" + `{"branch":"Add Health","commit_message":"feat: add health check","title":"Add a health check","body":"Adds health()."}` + "\n```"
		_ = json.NewEncoder(w).Encode(map[string]any{"choices": []any{map[string]any{"message": map[string]any{"role": "assistant", "content": answer}}}})
	}))
	defer proxy.Close()

	resp, err := preparer(dir, proxy.URL+"/ai/").Prepare(context.Background(), &devboxv1.PreparePullRequestRequest{
		Repository: "api", Model: "anthropic/claude-sonnet", ThreadId: "t1",
	})
	if err != nil {
		t.Fatal(err)
	}
	if asked.Model != "anthropic/claude-sonnet" || !strings.Contains(asked.Messages[1].Content, "health.go") ||
		!strings.Contains(asked.Messages[1].Content, "add a health endpoint") {
		t.Fatalf("writer got %+v", asked)
	}
	if resp.GetWriter() != WriterAIProxy || resp.GetHeadBranch() != "devbox/add-health" || resp.GetBaseBranch() != "main" ||
		resp.GetTitle() != "Add a health check" || !resp.GetCommitted() || resp.GetAdditions() != 3 || resp.GetHeadSha() == "" {
		t.Fatalf("unexpected response %+v", resp)
	}
	if msg := git(t, origin, "log", "-1", "--format=%s %ae", "devbox/add-health"); msg != "feat: add health check dev@example.com" {
		t.Fatalf("pushed commit %q", msg)
	}
	if git(t, dir, "status", "--porcelain") != "" {
		t.Fatal("checkout left dirty")
	}
}

func TestPrepareFallsBackToTheTemplate(t *testing.T) {
	dir, _ := checkout(t)
	git(t, dir, "checkout", "--quiet", "-b", "feature")
	if err := os.WriteFile(filepath.Join(dir, "a.go"), []byte("package main\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	git(t, dir, "add", "-A")
	git(t, dir, "commit", "--quiet", "-m", "add a")

	// a failing proxy leaves the template's text; the existing feature branch is reused and nothing is committed
	proxy := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		http.Error(w, "no provider", http.StatusServiceUnavailable)
	}))
	defer proxy.Close()
	resp, err := preparer(dir, proxy.URL).Prepare(context.Background(), &devboxv1.PreparePullRequestRequest{Repository: dir, Model: "m"})
	if err != nil {
		t.Fatal(err)
	}
	if resp.GetWriter() != WriterTemplate || resp.GetHeadBranch() != "feature" || resp.GetCommitted() ||
		resp.GetTitle() != "add a" || !strings.Contains(resp.GetBody(), "- add a") {
		t.Fatalf("unexpected response %+v", resp)
	}
}

func TestPrepareRefusesWithoutChanges(t *testing.T) {
	dir, _ := checkout(t)
	_, err := preparer(dir, "").Prepare(context.Background(), &devboxv1.PreparePullRequestRequest{Repository: "api"})
	if err == nil || !strings.Contains(err.Error(), "no changes") {
		t.Fatalf("want a no-changes error, got %v", err)
	}
	if _, err := preparer(dir, "").Prepare(context.Background(), &devboxv1.PreparePullRequestRequest{Repository: "web"}); err == nil {
		t.Fatal("want an error for an unknown checkout")
	}
}

func TestSlugBranch(t *testing.T) {
	for in, want := range map[[2]string]string{
		{"Fix: Login Bug!", ""}:         "devbox/fix-login-bug",
		{"", "Add a health check"}:      "devbox/add-a-health-check",
		{"devbox/already-prefixed", ""}: "devbox/already-prefixed",
		{"", "!!!"}:                     "devbox/changes",
		{"feat/..sneaky..", ""}:         "devbox/feat/.sneaky",
	} {
		if got := slugBranch(in[0], in[1]); got != want {
			t.Errorf("slugBranch(%q, %q) = %q, want %q", in[0], in[1], got, want)
		}
	}
}
