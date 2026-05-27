package v1

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/environment"
)

func TestWritePatchCreatesApplyablePatchFromBaseCommit(t *testing.T) {
	repo := initTestRepo(t)
	baseCommit := gitOutputString(t, repo, "rev-parse", "HEAD")
	writeEnvironmentConfig(t, baseCommit)

	if err := os.WriteFile(filepath.Join(repo, "tracked.txt"), []byte("committed\n"), 0644); err != nil {
		t.Fatal(err)
	}
	gitRun(t, repo, "add", "tracked.txt")
	gitRun(t, repo, "commit", "-m", "committed")
	if err := os.WriteFile(filepath.Join(repo, "tracked.txt"), []byte("worktree\n"), 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(repo, "new.txt"), []byte("new\n"), 0644); err != nil {
		t.Fatal(err)
	}

	patchPath := filepath.Join(t.TempDir(), "changes.patch")
	tool := DefaultTool{Config: Config{RepositoryDir: repo}}
	if err := tool.writePatch(patchPath); err != nil {
		t.Fatalf("writePatch() failed: %v", err)
	}

	applyRepo := cloneTestRepoAt(t, repo, baseCommit)
	gitRun(t, applyRepo, "apply", "--check", patchPath)
	gitRun(t, applyRepo, "apply", patchPath)

	if got := readFile(t, filepath.Join(applyRepo, "tracked.txt")); got != "worktree\n" {
		t.Fatalf("expected tracked file final contents, got %q", got)
	}
	if got := readFile(t, filepath.Join(applyRepo, "new.txt")); got != "new\n" {
		t.Fatalf("expected new file contents, got %q", got)
	}
}

func initTestRepo(t *testing.T) string {
	t.Helper()

	repo := t.TempDir()
	gitRun(t, repo, "init")
	gitRun(t, repo, "config", "user.name", "Plural Test")
	gitRun(t, repo, "config", "user.email", "test@plural.sh")
	gitRun(t, repo, "config", "commit.gpgSign", "false")
	if err := os.WriteFile(filepath.Join(repo, "tracked.txt"), []byte("base\n"), 0644); err != nil {
		t.Fatal(err)
	}
	gitRun(t, repo, "add", "tracked.txt")
	gitRun(t, repo, "commit", "-m", "base")

	return repo
}

func cloneTestRepoAt(t *testing.T, source, commit string) string {
	t.Helper()

	target := t.TempDir()
	gitRun(t, "", "clone", source, target)
	gitRun(t, target, "checkout", "--detach", commit)

	return target
}

func writeEnvironmentConfig(t *testing.T, baseCommit string) {
	t.Helper()

	configPath := filepath.Join(os.TempDir(), ".plrl.json")
	previous, readErr := os.ReadFile(configPath)
	t.Cleanup(func() {
		if readErr == nil {
			_ = os.WriteFile(configPath, previous, 0644)
			return
		}
		_ = os.Remove(configPath)
	})

	if err := (&environment.Config{BaseCommit: baseCommit}).Save(); err != nil {
		t.Fatalf("failed to write environment config: %v", err)
	}
}

func gitOutputString(t *testing.T, dir string, args ...string) string {
	t.Helper()

	out := gitRunOutput(t, dir, args...)
	return strings.TrimSpace(string(out))
}

func gitRun(t *testing.T, dir string, args ...string) {
	t.Helper()
	_ = gitRunOutput(t, dir, args...)
}

func gitRunOutput(t *testing.T, dir string, args ...string) []byte {
	t.Helper()

	cmd := exec.Command("git", args...)
	if dir != "" {
		cmd.Dir = dir
	}
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("git %v failed: %v\n%s", args, err, out)
	}

	return out
}

func readFile(t *testing.T, path string) string {
	t.Helper()

	contents, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}

	return string(contents)
}
