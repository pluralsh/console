package prebake

import (
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func TestRunCloneAndSeed(t *testing.T) {
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git not installed")
	}

	remote := initTestRepo(t, "source")
	dest := t.TempDir()
	cfgPath := filepath.Join(t.TempDir(), "repos.yaml")
	yaml := "repositories:\n  - url: " + remote + "\n    path: console\n    branch: master\n"
	if err := os.WriteFile(cfgPath, []byte(yaml), 0o644); err != nil {
		t.Fatal(err)
	}

	if err := Run(Options{Config: cfgPath, Dest: dest}); err != nil {
		t.Fatalf("Run() clone: %v", err)
	}
	assertManifest(t, dest, remote, "console", "master")
	origin := gitRemote(t, filepath.Join(dest, "console"))
	if origin != remote {
		t.Errorf("origin = %q, want %q", origin, remote)
	}

	marker := filepath.Join(dest, "console", "SEED")
	if err := os.WriteFile(marker, []byte("keep"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := Run(Options{Config: cfgPath, Dest: dest}); err != nil {
		t.Fatalf("Run() seed: %v", err)
	}
	if _, err := os.Stat(marker); err != nil {
		t.Fatal("existing checkout was replaced")
	}
}

func TestRunStripsOriginUserinfo(t *testing.T) {
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git not installed")
	}

	remote := initTestRepo(t, "source")
	dest := t.TempDir()
	if err := gitClone(remote, filepath.Join(dest, "console"), "master", false, false, nil); err != nil {
		t.Fatal(err)
	}

	cfgPath := filepath.Join(t.TempDir(), "repos.yaml")
	yaml := "repositories:\n  - url: https://user:token@github.com/org/repo.git\n    path: console\n"
	if err := os.WriteFile(cfgPath, []byte(yaml), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := Run(Options{Config: cfgPath, Dest: dest}); err != nil {
		t.Fatal(err)
	}

	want := "https://github.com/org/repo.git"
	origin := gitRemote(t, filepath.Join(dest, "console"))
	if origin != want {
		t.Errorf("origin = %q, want %q", origin, want)
	}
	assertManifest(t, dest, want, "console", "master")
}

func TestRunKeepsDetachedCheckout(t *testing.T) {
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git not installed")
	}

	remote := initTestRepo(t, "source")
	dest := t.TempDir()
	clone := filepath.Join(dest, "console")
	if err := gitClone(remote, clone, "master", false, false, nil); err != nil {
		t.Fatal(err)
	}
	runGitChecked(t, clone, "checkout", "--detach", "HEAD")

	cfgPath := filepath.Join(t.TempDir(), "repos.yaml")
	yaml := "repositories:\n  - url: " + remote + "\n    path: console\n"
	if err := os.WriteFile(cfgPath, []byte(yaml), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := Run(Options{Config: cfgPath, Dest: dest}); err != nil {
		t.Fatalf("Run() = %v", err)
	}
	assertManifest(t, dest, remote, "console", "HEAD")
}

func TestRunNonRepoDest(t *testing.T) {
	dir := t.TempDir()
	dest := t.TempDir()
	notGit := filepath.Join(dest, "console")
	if err := os.MkdirAll(notGit, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(notGit, "file"), []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	cfgPath := filepath.Join(dir, "repos.yaml")
	if err := os.WriteFile(cfgPath, []byte("repositories:\n  - url: https://github.com/a/b.git\n    path: console\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	err := Run(Options{Config: cfgPath, Dest: dest})
	if err == nil || !strings.Contains(err.Error(), "not a git repository") {
		t.Fatalf("Run() err = %v, want not a git repository", err)
	}
}

func TestRunWithGitPasswordLeavesDestClean(t *testing.T) {
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git not installed")
	}

	t.Setenv("GIT_PASSWORD", "s3cret")
	t.Setenv("GIT_ACCESS_TOKEN", "")
	t.Setenv("GIT_USERNAME", "ci-bot")

	remote := initTestRepo(t, "source")
	dest := t.TempDir()
	cfgPath := filepath.Join(t.TempDir(), "repos.yaml")
	yaml := "repositories:\n  - url: " + remote + "\n    path: console\n    branch: master\n"
	if err := os.WriteFile(cfgPath, []byte(yaml), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := Run(Options{Config: cfgPath, Dest: dest}); err != nil {
		t.Fatalf("Run() = %v", err)
	}
	assertManifest(t, dest, remote, "console", "master")
	if err := filepath.WalkDir(dest, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.Name() == "askpass" {
			t.Errorf("askpass helper copied into dest: %s", path)
		}
		return nil
	}); err != nil {
		t.Fatal(err)
	}
}

func TestMainRequiresConfig(t *testing.T) {
	err := Main(nil)
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestManifestJSONMatchesHarnessContract(t *testing.T) {
	t.Parallel()
	dir := t.TempDir()
	repos := []ManifestRepo{{
		URL:           "https://github.com/pluralsh/console.git",
		Path:          "console",
		DefaultBranch: "master",
	}}
	if err := writeManifest(dir, repos); err != nil {
		t.Fatal(err)
	}
	data, err := os.ReadFile(filepath.Join(dir, ManifestFileName))
	if err != nil {
		t.Fatal(err)
	}

	// Mirrors go/deployment-operator/pkg/agentrun-harness/prebake.Manifest.
	var harness struct {
		Version      int `json:"version"`
		Repositories []struct {
			URL           string `json:"url"`
			Path          string `json:"path"`
			DefaultBranch string `json:"defaultBranch,omitempty"`
		} `json:"repositories"`
	}
	if err := json.Unmarshal(data, &harness); err != nil {
		t.Fatal(err)
	}
	if harness.Version != 1 {
		t.Errorf("version = %d, want 1", harness.Version)
	}
	if len(harness.Repositories) != 1 || harness.Repositories[0].Path != "console" {
		t.Fatalf("repositories = %+v", harness.Repositories)
	}
	if harness.Repositories[0].DefaultBranch != "master" {
		t.Errorf("defaultBranch = %q", harness.Repositories[0].DefaultBranch)
	}
}

func initTestRepo(t *testing.T, name string) string {
	t.Helper()
	dir := filepath.Join(t.TempDir(), name)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	runGitChecked(t, dir, "init", "-b", "master")
	runGitChecked(t, dir, "config", "user.email", "prebake@example.com")
	runGitChecked(t, dir, "config", "user.name", "prebake")
	if err := os.WriteFile(filepath.Join(dir, "README"), []byte("hi\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	runGitChecked(t, dir, "add", ".")
	runGitChecked(t, dir, "commit", "-m", "init")
	return dir
}

func runGitChecked(t *testing.T, dir string, args ...string) {
	t.Helper()
	cmd := exec.Command("git", append([]string{"-C", dir}, args...)...)
	cmd.Env = append(os.Environ(), "GIT_AUTHOR_DATE=2020-01-01T00:00:00Z", "GIT_COMMITTER_DATE=2020-01-01T00:00:00Z")
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("git %v: %v\n%s", args, err, out)
	}
}

func gitRemote(t *testing.T, dir string) string {
	t.Helper()
	cmd := exec.Command("git", "-C", dir, "remote", "get-url", "origin")
	out, err := cmd.Output()
	if err != nil {
		t.Fatal(err)
	}
	return strings.TrimSpace(string(out))
}

func assertManifest(t *testing.T, dest, url, path, branch string) {
	t.Helper()
	data, err := os.ReadFile(filepath.Join(dest, ManifestFileName))
	if err != nil {
		t.Fatal(err)
	}
	var m Manifest
	if err := json.Unmarshal(data, &m); err != nil {
		t.Fatal(err)
	}
	if m.Version != 1 || len(m.Repositories) != 1 {
		t.Fatalf("manifest = %+v", m)
	}
	got := m.Repositories[0]
	if got.URL != url || got.Path != path || got.DefaultBranch != branch {
		t.Fatalf("repo = %+v, want url=%s path=%s branch=%s", got, url, path, branch)
	}
	if _, err := os.Stat(filepath.Join(dest, path, ".git")); err != nil {
		t.Fatal(err)
	}
}
