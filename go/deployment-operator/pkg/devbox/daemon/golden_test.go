package daemon

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/internal/gittest"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/guest"
)

func readyz(t *testing.T, addr string) int {
	t.Helper()
	resp, err := http.Get("http://" + addr + "/readyz")
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	return resp.StatusCode
}

func TestGoldenBoot(t *testing.T) {
	t.Setenv("GIT_CONFIG_GLOBAL", "/dev/null")
	root := t.TempDir()
	cfg := testConfig(t, root)
	src := gittest.Repo(t, filepath.Join(root, "src", "acme", "api"), map[string]string{"main.go": "package main\n"})
	cfg.Guest = &guest.Config{
		Repositories:    []guest.Repository{{URL: src, Description: "The API"}},
		BootstrapScript: "sleep 1\necho built > \"$HOME/api/built.txt\"\necho bootstrapped\n",
	}
	r := start(t, cfg)
	ctx := ctxT(t)

	if code := readyz(t, r.addr); code != http.StatusServiceUnavailable {
		t.Fatalf("/readyz during the golden boot = %d, want 503", code)
	}
	eventually(t, "golden boot", func() bool { return readyz(t, r.addr) == http.StatusOK })
	h, err := r.client.Health(ctx, &devboxv1.HealthRequest{})
	if err != nil || h.GetStatus() != StatusBooting || h.GetWorkspaceHydrated() {
		t.Fatalf("health after the golden boot: %v %v", h, err)
	}
	if b, err := os.ReadFile(filepath.Join(cfg.Home, "api", "built.txt")); err != nil || string(b) != "built\n" {
		t.Fatalf("the bootstrap script didn't run after the clone: %q %v", b, err)
	}
	if b, _ := os.ReadFile(filepath.Join(cfg.StateDir, "golden.log")); !strings.Contains(string(b), "bootstrapped") {
		t.Errorf("golden.log = %q", b)
	}
	r.stop()

	// a daemon booting from the golden home (a cold-booted instance) doesn't redo the work
	if err := os.Remove(filepath.Join(cfg.Home, "api", "built.txt")); err != nil {
		t.Fatal(err)
	}
	r = start(t, cfg)
	if code := readyz(t, r.addr); code != http.StatusOK {
		t.Fatalf("/readyz after a finished golden boot = %d", code)
	}
	if _, err := os.Stat(filepath.Join(cfg.Home, "api", "built.txt")); !os.IsNotExist(err) {
		t.Fatal("the golden boot ran again")
	}
}

func TestGoldenBootFailure(t *testing.T) {
	root := t.TempDir()
	cfg := testConfig(t, root)
	cfg.Guest = &guest.Config{BootstrapScript: "echo broken >&2\nexit 3\necho unreachable\n"}
	r := start(t, cfg)
	ctx := ctxT(t)

	eventually(t, "golden boot failure", func() bool {
		h, err := r.client.Health(ctx, &devboxv1.HealthRequest{})
		return err == nil && h.GetStatus() == StatusBootstrapFailed
	})
	if code := readyz(t, r.addr); code != http.StatusServiceUnavailable {
		t.Fatalf("/readyz after a failed golden boot = %d, want 503 so the revision fails", code)
	}
	if _, err := os.Stat(filepath.Join(cfg.StateDir, "golden.json")); !os.IsNotExist(err) {
		t.Fatal("a failed golden boot was recorded as finished")
	}
}
