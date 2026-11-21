package daemon

import (
	"maps"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/harness"
)

func TestSkelAndGitAuthPlaceholders(t *testing.T) {
	root := t.TempDir()
	cfg := testConfig(t, root)
	cfg.SkelDir = filepath.Join(root, "skel")
	if err := os.MkdirAll(cfg.SkelDir, 0o755); err != nil {
		t.Fatal(err)
	}
	skelGit := "[user]\n\tname = Dev\n"
	if err := os.WriteFile(filepath.Join(cfg.SkelDir, ".gitconfig"), []byte(skelGit), 0o644); err != nil {
		t.Fatal(err)
	}
	// An existing home file must survive the skeleton copy.
	if err := os.WriteFile(filepath.Join(cfg.Home, ".bashrc"), []byte("mine\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(cfg.SkelDir, ".bashrc"), []byte("skel\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	d := start(t, cfg).d
	if b, _ := os.ReadFile(filepath.Join(cfg.Home, ".bashrc")); string(b) != "mine\n" {
		t.Fatalf("skel overwrote .bashrc: %q", b)
	}

	d.mu.Lock()
	d.req = &devboxv1.InitializeRequest{Owner: &devboxv1.Principal{Name: "Jane Doe", Email: "jane@example.com"}, Repositories: []*devboxv1.RepositorySpec{
		{Url: "https://GitHub.com/acme/api.git"}, {Url: "https://github.com/acme/web"},
		{Url: "git@gitlab.com:acme/x.git"}, {Url: "ssh://git@GitLab.com/acme/y.git"},
		{Url: "https://git.corp.example:8443/team/repo"}, {Url: "ssh://git@ssh.example:7999/z.git"},
	}}
	d.mu.Unlock()
	d.writeGitAuth("https://bitbucket.org/acme/new")
	d.writeGitAuth()

	inc, err := os.ReadFile(filepath.Join(cfg.Home, gitAuthInclude))
	if err != nil {
		t.Fatal(err)
	}
	for _, h := range []string{"https://github.com/", "https://git.corp.example:8443/", "https://gitlab.com/"} {
		if !strings.Contains(string(inc), `[http "`+h+`"]`+"\n\textraHeader = "+GitAuthPlaceholder) {
			t.Fatalf("no placeholder for %s:\n%s", h, inc)
		}
	}
	if !strings.Contains(string(inc), "[url \"https://gitlab.com/\"]\n\tinsteadOf = git@gitlab.com:\n\tinsteadOf = ssh://git@GitLab.com/\n") {
		t.Fatalf("ssh remotes on gitlab.com should be rewritten to https:\n%s", inc)
	}
	if strings.Contains(string(inc), "bitbucket") || strings.Contains(string(inc), "ssh.example") {
		t.Fatalf("unexpected host (extra URLs are per call; ssh on a custom port can't map to https):\n%s", inc)
	}
	if n := strings.Count(string(inc), "github.com"); n != 1 {
		t.Fatalf("github.com listed %d times", n)
	}

	gc, _ := os.ReadFile(filepath.Join(cfg.Home, ".gitconfig"))
	if !strings.HasPrefix(string(gc), skelGit) || strings.Count(string(gc), "path = "+gitAuthInclude) != 1 {
		t.Fatalf("~/.gitconfig should be the skel file plus one include:\n%s", gc)
	}

	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git not installed")
	}
	git := func(stdin string, args ...string) string {
		t.Helper()
		cmd := exec.Command("git", args...)
		cmd.Env = append(os.Environ(), "HOME="+cfg.Home, "GIT_CONFIG_NOSYSTEM=1", "GIT_TERMINAL_PROMPT=0")
		cmd.Stdin = strings.NewReader(stdin)
		out, err := cmd.CombinedOutput()
		if err != nil {
			t.Fatalf("git %v: %v\n%s", args, err, out)
		}
		return string(out)
	}
	if out := git("protocol=https\nhost=new-host.example\n\n", "credential", "fill"); !strings.Contains(out, "username=x-access-token\npassword="+harness.PlaceholderKey+"\n") {
		t.Fatalf("credential helper should answer any https host with the placeholder:\n%s", out)
	}
	if out := git("", "ls-remote", "--get-url", "git@gitlab.com:acme/x.git"); strings.TrimSpace(out) != "https://gitlab.com/acme/x.git" {
		t.Fatalf("ssh remote resolved to %q, want the https rewrite", out)
	}
	// commits as the owner, without overriding the name the skeleton already set; --global doesn't follow
	// includes, so the identity has to be visible there too
	if out := git("", "config", "--global", "--get", "user.email"); strings.TrimSpace(out) != "jane@example.com" {
		t.Fatalf("user.email = %q", out)
	}
	if out := git("", "config", "--get", "user.name"); strings.TrimSpace(out) != "Dev" {
		t.Fatalf("user.name = %q, want the skeleton's", out)
	}
}

func TestGitIdentity(t *testing.T) {
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git not installed")
	}
	get := func(gitconfig, key string) string {
		t.Helper()
		out, _ := exec.Command("git", "config", "--file", gitconfig, "--get", key).Output()
		return strings.TrimSpace(string(out))
	}
	gitconfig := filepath.Join(t.TempDir(), ".gitconfig")
	if err := ensureGitIdentity(&devboxv1.Principal{Name: `Jane "JD" Doe; \ops`, Email: "jane@example.com"}, gitconfig); err != nil {
		t.Fatal(err)
	}
	if got := get(gitconfig, "user.name"); got != `Jane "JD" Doe; \ops` {
		t.Fatalf("user.name round trip: %q", got)
	}
	if got := get(gitconfig, "user.email"); got != "jane@example.com" {
		t.Fatalf("user.email: %q", got)
	}
	if err := ensureGitIdentity(&devboxv1.Principal{Name: "Other", Email: "o@example.com"}, gitconfig); err != nil {
		t.Fatal(err)
	}
	if got := get(gitconfig, "user.email"); got != "jane@example.com" {
		t.Fatalf("set fields should be left alone: %q", got)
	}

	bare := filepath.Join(t.TempDir(), ".gitconfig")
	if err := ensureGitIdentity(&devboxv1.Principal{Email: "sam@example.com"}, bare); err != nil {
		t.Fatal(err)
	}
	if got := get(bare, "user.name"); got != "sam" {
		t.Fatalf("name should fall back to the email's local part: %q", got)
	}
	none := filepath.Join(t.TempDir(), ".gitconfig")
	if err := ensureGitIdentity(nil, none); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(none); !os.IsNotExist(err) {
		t.Fatalf("no owner should write nothing: %v", err)
	}
}

func TestGitIdentityEnv(t *testing.T) {
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git not installed")
	}
	owner := &devboxv1.Principal{Name: "Jane Doe", Email: "jane@example.com"}
	gitconfig := filepath.Join(t.TempDir(), ".gitconfig")
	want := map[string]string{
		"GIT_AUTHOR_NAME": "Jane Doe", "GIT_AUTHOR_EMAIL": "jane@example.com",
		"GIT_COMMITTER_NAME": "Jane Doe", "GIT_COMMITTER_EMAIL": "jane@example.com",
	}
	if got := gitIdentityEnv(owner, gitconfig); !maps.Equal(got, want) {
		t.Fatalf("without a gitconfig: %v", got)
	}
	if err := ensureGitIdentity(owner, gitconfig); err != nil {
		t.Fatal(err)
	}
	if got := gitIdentityEnv(owner, gitconfig); !maps.Equal(got, want) {
		t.Fatalf("with the owner's identity seeded: %v", got)
	}
	if out, err := exec.Command("git", "config", "--file", gitconfig, "user.email", "me@personal.dev").CombinedOutput(); err != nil {
		t.Fatalf("%v: %s", err, out)
	}
	if got := gitIdentityEnv(owner, gitconfig); got != nil {
		t.Fatalf("an identity the user set should win: %v", got)
	}
	if got := gitIdentityEnv(nil, filepath.Join(t.TempDir(), ".gitconfig")); got != nil {
		t.Fatalf("no owner: %v", got)
	}
}
