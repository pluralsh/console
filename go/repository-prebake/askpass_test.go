package prebake

import (
	"os"
	"os/exec"
	"strings"
	"testing"
)

func TestGitCredential(t *testing.T) {
	t.Setenv("GIT_ACCESS_TOKEN", "")
	t.Setenv("GIT_PASSWORD", "")
	t.Setenv("GIT_USERNAME", "")
	token, user := gitCredential()
	if token != "" || user != defaultGitUsername {
		t.Fatalf("gitCredential() = %q %q, want empty token and %q", token, user, defaultGitUsername)
	}

	t.Setenv("GIT_PASSWORD", "from-password")
	token, user = gitCredential()
	if token != "from-password" || user != defaultGitUsername {
		t.Fatalf("GIT_PASSWORD: got %q %q", token, user)
	}

	t.Setenv("GIT_ACCESS_TOKEN", "from-token")
	token, _ = gitCredential()
	if token != "from-token" {
		t.Fatalf("GIT_ACCESS_TOKEN should win, got %q", token)
	}

	t.Setenv("GIT_USERNAME", "ci-bot")
	_, user = gitCredential()
	if user != "ci-bot" {
		t.Fatalf("username = %q, want ci-bot", user)
	}
}

func TestPrepareGitAuthAskpass(t *testing.T) {
	t.Setenv("GIT_ACCESS_TOKEN", "")
	t.Setenv("GIT_PASSWORD", "s3cret")
	t.Setenv("GIT_USERNAME", "ci-bot")

	auth, cleanup, err := prepareGitAuth()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(cleanup)
	if auth == nil {
		t.Fatal("expected gitAuth")
	}
	if auth.token != "s3cret" || auth.username != "ci-bot" {
		t.Fatalf("auth = %+v", auth)
	}

	env := append(os.Environ(),
		"GIT_ACCESS_TOKEN="+auth.token,
		"GIT_USERNAME="+auth.username,
	)
	cmd := exec.Command(auth.askpassPath, "Username for 'https://github.com': ")
	cmd.Env = env
	out, err := cmd.Output()
	if err != nil {
		t.Fatal(err)
	}
	if got := string(out); got != "ci-bot\n" {
		t.Fatalf("username prompt: got %q", got)
	}

	cmd = exec.Command(auth.askpassPath, "Password for 'https://github.com': ")
	cmd.Env = env
	out, err = cmd.Output()
	if err != nil {
		t.Fatal(err)
	}
	if got := string(out); got != "s3cret\n" {
		t.Fatalf("password prompt: got %q", got)
	}
}

func TestPrepareGitAuthNone(t *testing.T) {
	t.Setenv("GIT_ACCESS_TOKEN", "")
	t.Setenv("GIT_PASSWORD", "")
	auth, cleanup, err := prepareGitAuth()
	if err != nil {
		t.Fatal(err)
	}
	cleanup()
	if auth != nil {
		t.Fatalf("got %+v, want nil", auth)
	}
}

func TestGitEnvAskpass(t *testing.T) {
	t.Setenv("GIT_ACCESS_TOKEN", "")
	auth := &gitAuth{token: "t", username: "u", askpassPath: "/tmp/askpass"}
	env := gitEnv(false, auth)
	got := map[string]string{}
	for _, kv := range env {
		k, v, ok := splitEnv(kv)
		if ok {
			got[k] = v
		}
	}
	if got["GIT_ASKPASS"] != "/tmp/askpass" {
		t.Errorf("GIT_ASKPASS = %q", got["GIT_ASKPASS"])
	}
	if got["GIT_TERMINAL_PROMPT"] != "0" {
		t.Errorf("GIT_TERMINAL_PROMPT = %q", got["GIT_TERMINAL_PROMPT"])
	}
	if got["GIT_ACCESS_TOKEN"] != "t" || got["GIT_USERNAME"] != "u" {
		t.Errorf("token/user = %q %q", got["GIT_ACCESS_TOKEN"], got["GIT_USERNAME"])
	}
	if got["GIT_LFS_SKIP_SMUDGE"] != "1" {
		t.Errorf("GIT_LFS_SKIP_SMUDGE = %q", got["GIT_LFS_SKIP_SMUDGE"])
	}
}

func splitEnv(kv string) (k, v string, ok bool) {
	k, v, ok = strings.Cut(kv, "=")
	return
}
