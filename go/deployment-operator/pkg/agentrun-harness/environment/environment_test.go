package environment

import (
	"encoding/json"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"strings"
	"testing"

	console "github.com/pluralsh/console/go/client"
	v1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/prebake"
)

func TestConfigureCodebaseMemoryGitExclude(t *testing.T) {
	repoDir := t.TempDir()
	excludePath := path.Join(repoDir, ".git", "info", "exclude")

	if err := configureCodebaseMemoryGitExclude(repoDir); err != nil {
		t.Fatalf("configureCodebaseMemoryGitExclude() failed: %v", err)
	}
	if err := configureCodebaseMemoryGitExclude(repoDir); err != nil {
		t.Fatalf("configureCodebaseMemoryGitExclude() second call failed: %v", err)
	}

	contents, err := os.ReadFile(excludePath)
	if err != nil {
		t.Fatalf("failed to read exclude file: %v", err)
	}

	if count := strings.Count(string(contents), codebaseMemoryGitExcludePattern); count != 1 {
		t.Fatalf("expected one %q entry, got %d in %q", codebaseMemoryGitExcludePattern, count, contents)
	}
}

func TestCommitIdentityPrefersInitiatingUser(t *testing.T) {
	env := &environment{
		agentRun: &v1.AgentRun{
			User: &v1.AgentUser{
				Name:  "Ada Lovelace",
				Email: "ada@example.com",
			},
			ScmCreds: &console.ScmCredentialFragment{Username: "scm-bot"},
		},
	}

	name, email := env.commitIdentity()

	if name != "Ada Lovelace" {
		t.Fatalf("expected initiating user's name, got %q", name)
	}
	if email != "ada@example.com" {
		t.Fatalf("expected initiating user's email, got %q", email)
	}
}

func TestCommitIdentityFallsBackToScmCredentials(t *testing.T) {
	env := &environment{
		agentRun: &v1.AgentRun{
			ScmCreds: &console.ScmCredentialFragment{Username: "scm-bot"},
		},
	}

	name, email := env.commitIdentity()

	if name != "scm-bot" {
		t.Fatalf("expected SCM username, got %q", name)
	}
	if email != "agent@plural.sh" {
		t.Fatalf("expected fallback email, got %q", email)
	}
}

func TestCloneRepositoryCopiesPrebakeMatch(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)
	t.Setenv("GIT_CONFIG_NOSYSTEM", "1")
	t.Setenv("TMPDIR", t.TempDir())
	runGit(t, home, "config", "--global", "--add", "safe.directory", "*")

	src := initGitRepo(t, "prebaked")
	prebakeDir := t.TempDir()
	prebakedCopy := filepath.Join(prebakeDir, "console")
	if out, err := exec.Command("cp", "-a", src, prebakedCopy).CombinedOutput(); err != nil {
		t.Fatalf("cp prebake fixture: %v: %s", err, out)
	}
	writePrebakeManifest(t, prebakeDir, prebake.Manifest{
		Version: 1,
		Repositories: []prebake.ManifestRepo{{
			URL:  "https://github.com/pluralsh/console.git",
			Path: "console",
		}},
	})
	t.Setenv(prebake.EnvDir, prebakeDir)

	workDir := t.TempDir()
	runURL := "git@" + "github.com" + ":pluralsh/console.git"
	env := &environment{
		agentRun: &v1.AgentRun{Repository: runURL},
		dir:      workDir,
	}
	if err := env.cloneRepository(); err != nil {
		t.Fatalf("cloneRepository() failed: %v", err)
	}

	dest := filepath.Join(workDir, "repository")
	if _, err := os.Stat(filepath.Join(dest, ".git")); err != nil {
		t.Fatalf("expected copied repository at %s: %v", dest, err)
	}
	contents, err := os.ReadFile(filepath.Join(dest, "README"))
	if err != nil {
		t.Fatal(err)
	}
	if string(contents) != "prebaked\n" {
		t.Fatalf("copied README = %q, want prebaked", contents)
	}
	origin, err := exec.Command("git", "-C", dest, "remote", "get-url", "origin").Output()
	if err != nil {
		t.Fatal(err)
	}
	if got := strings.TrimSpace(string(origin)); got != runURL {
		t.Fatalf("origin = %q, want agent run repository URL", got)
	}
}

func TestCloneRepositoryFallsBackToGitClone(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)
	t.Setenv("GIT_CONFIG_NOSYSTEM", "1")
	t.Setenv("TMPDIR", t.TempDir())
	runGit(t, home, "config", "--global", "--add", "safe.directory", "*")

	prebakeDir := t.TempDir()
	writePrebakeManifest(t, prebakeDir, prebake.Manifest{
		Version: 1,
		Repositories: []prebake.ManifestRepo{{
			URL:  "https://github.com/pluralsh/console.git",
			Path: "console",
		}},
	})
	t.Setenv(prebake.EnvDir, prebakeDir)

	src := initGitRepo(t, "network")
	workDir := t.TempDir()
	env := &environment{
		agentRun: &v1.AgentRun{Repository: src},
		dir:      workDir,
	}
	if err := env.cloneRepository(); err != nil {
		t.Fatalf("cloneRepository() failed: %v", err)
	}

	contents, err := os.ReadFile(filepath.Join(workDir, "repository", "README"))
	if err != nil {
		t.Fatal(err)
	}
	if string(contents) != "network\n" {
		t.Fatalf("cloned README = %q, want network", contents)
	}
}

func initGitRepo(t *testing.T, contents string) string {
	t.Helper()
	dir := t.TempDir()
	runGit(t, dir, "init", "-b", "main")
	runGit(t, dir, "config", "user.email", "test@example.com")
	runGit(t, dir, "config", "user.name", "test")
	if err := os.WriteFile(filepath.Join(dir, "README"), []byte(contents+"\n"), 0644); err != nil {
		t.Fatal(err)
	}
	runGit(t, dir, "add", "README")
	runGit(t, dir, "commit", "-m", "init")
	return dir
}

func runGit(t *testing.T, dir string, args ...string) {
	t.Helper()
	cmd := exec.Command("git", args...)
	cmd.Dir = dir
	cmd.Env = append(os.Environ(), "GIT_CONFIG_NOSYSTEM=1")
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("git %v: %v: %s", args, err, out)
	}
}

func writePrebakeManifest(t *testing.T, dir string, manifest prebake.Manifest) {
	t.Helper()
	data, err := json.Marshal(manifest)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path.Join(dir, prebake.ManifestFileName), data, 0644); err != nil {
		t.Fatal(err)
	}
}
