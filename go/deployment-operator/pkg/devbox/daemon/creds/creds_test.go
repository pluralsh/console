package creds

import (
	"context"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"sync"
	"testing"

	"google.golang.org/grpc"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
)

// fakeConsole is the console side of the Codex bundle store: a versioned bundle with compare-and-swap writes.
type fakeConsole struct {
	devboxv1.SandboxCredentialsClient

	mu      sync.Mutex
	version int64
	bundle  []byte
	updates []*devboxv1.UpdateCodexBundleRequest
}

func (f *fakeConsole) cred() *devboxv1.InstanceCredential {
	return &devboxv1.InstanceCredential{Kind: devboxv1.CredentialKind_CREDENTIAL_KIND_CODEX, CredentialId: "cred-1",
		CodexMode: devboxv1.CodexCredentialMode_CODEX_CREDENTIAL_MODE_CHATGPT_AUTH, Version: f.version, BundleJson: f.bundle}
}

func (f *fakeConsole) GetSandboxCredential(context.Context, *devboxv1.GetSandboxCredentialRequest, ...grpc.CallOption) (*devboxv1.GetSandboxCredentialResponse, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	return &devboxv1.GetSandboxCredentialResponse{Credentials: []*devboxv1.InstanceCredential{f.cred()}}, nil
}

func (f *fakeConsole) UpdateCodexBundle(_ context.Context, req *devboxv1.UpdateCodexBundleRequest, _ ...grpc.CallOption) (*devboxv1.UpdateCodexBundleResponse, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.updates = append(f.updates, req)
	if req.GetExpectedVersion() != f.version {
		return &devboxv1.UpdateCodexBundleResponse{Current: f.cred()}, nil
	}
	f.version++
	f.bundle = req.GetBundleJson()
	return &devboxv1.UpdateCodexBundleResponse{Applied: true}, nil
}

func newManager(t *testing.T, client devboxv1.SandboxCredentialsClient) (*Manager, string) {
	t.Helper()
	root := t.TempDir()
	home := filepath.Join(root, "home")
	_ = os.MkdirAll(home, 0o755)
	m := New(Options{Home: home, IdentityDir: filepath.Join(root, "identity"), AgentAuthDir: filepath.Join(root, "agent-auth"),
		Client: func() devboxv1.SandboxCredentialsClient { return client }, InstanceID: func() string { return "inst-1" },
		Log: slog.New(slog.NewTextHandler(io.Discard, nil))})
	return m, home
}

func TestCodexBundleWriteBackCAS(t *testing.T) {
	console := &fakeConsole{version: 3, bundle: []byte(`{"tokens":{"refresh_token":"A"}}`)}
	m, home := newManager(t, console)
	ctx := context.Background()
	if err := m.FetchCodex(ctx); err != nil {
		t.Fatal(err)
	}
	if target, err := os.Readlink(filepath.Join(home, ".codex", "auth.json")); err != nil || target != m.CodexAuthFile() {
		t.Fatalf("~/.codex/auth.json -> %q (%v)", target, err)
	}
	if fi, _ := os.Stat(m.CodexAuthFile()); fi.Mode().Perm() != 0o600 {
		t.Fatalf("bundle mode %v", fi.Mode())
	}

	// The daemon's own write is not written back.
	if err := m.onCodexFileChanged(ctx); err != nil || len(console.updates) != 0 {
		t.Fatalf("own write echoed back: %v %v", console.updates, err)
	}

	// Codex refreshes the token: written back against version 3.
	write := func(s string) {
		if err := os.WriteFile(m.CodexAuthFile(), []byte(s), 0o600); err != nil {
			t.Fatal(err)
		}
	}
	write(`{"tokens":{"refresh_token":"B"}}`)
	if err := m.onCodexFileChanged(ctx); err != nil {
		t.Fatal(err)
	}
	if len(console.updates) != 1 || console.updates[0].GetExpectedVersion() != 3 || console.version != 4 {
		t.Fatalf("first write-back: %v version=%d", console.updates, console.version)
	}
	write(`{"tokens":{"refresh_token":"C"}}`)
	_ = m.onCodexFileChanged(ctx)
	if console.updates[1].GetExpectedVersion() != 4 || console.version != 5 {
		t.Fatalf("second write-back expected %d, console at %d", console.updates[1].GetExpectedVersion(), console.version)
	}

	// Another box refreshed first: the stale write loses and the newer bundle is installed.
	console.mu.Lock()
	console.version, console.bundle = 7, []byte(`{"tokens":{"refresh_token":"FROM-OTHER-BOX"}}`)
	console.mu.Unlock()
	write(`{"tokens":{"refresh_token":"D"}}`)
	if err := m.onCodexFileChanged(ctx); err != nil {
		t.Fatal(err)
	}
	if got, _ := os.ReadFile(m.CodexAuthFile()); string(got) != `{"tokens":{"refresh_token":"FROM-OTHER-BOX"}}` {
		t.Fatalf("stale write didn't install the current bundle: %s", got)
	}
	if console.version != 7 {
		t.Fatalf("stale write applied: version %d", console.version)
	}
	n := len(console.updates)
	_ = m.onCodexFileChanged(ctx)
	if len(console.updates) != n {
		t.Fatal("installed bundle written back")
	}

	// A push of an older version is ignored; a newer one is installed.
	if applied, _ := m.PushCredential(ctx, &devboxv1.InstanceCredential{Kind: devboxv1.CredentialKind_CREDENTIAL_KIND_CODEX,
		CredentialId: "cred-1", Version: 2, BundleJson: []byte(`{"old":true}`)}); applied {
		t.Fatal("older bundle applied")
	}
	if applied, _ := m.PushCredential(ctx, &devboxv1.InstanceCredential{Kind: devboxv1.CredentialKind_CREDENTIAL_KIND_CODEX,
		CredentialId: "cred-1", Version: 8, BundleJson: []byte(`{"new":true}`)}); !applied {
		t.Fatal("newer bundle not applied")
	}
}

func TestInBoxLoginReplacedAndReported(t *testing.T) {
	console := &fakeConsole{version: 1, bundle: []byte(`{"tokens":{}}`)}
	m, home := newManager(t, console)
	var conditions []string
	m.opts.Condition = func(typ, _, _ string, _ bool) { conditions = append(conditions, typ) }
	_ = os.MkdirAll(filepath.Join(home, ".codex"), 0o700)
	_ = os.WriteFile(filepath.Join(home, ".codex", "auth.json"), []byte(`{"from":"codex login"}`), 0o600)
	if err := m.FetchCodex(context.Background()); err != nil {
		t.Fatal(err)
	}
	if fi, _ := os.Lstat(filepath.Join(home, ".codex", "auth.json")); fi.Mode()&os.ModeSymlink == 0 {
		t.Fatal("in-box login file not replaced by the tmpfs link")
	}
	if len(conditions) == 0 || conditions[0] != "in_box_login_detected" {
		t.Fatalf("conditions %v", conditions)
	}
	_ = os.MkdirAll(filepath.Join(home, ".claude"), 0o700)
	_ = os.WriteFile(filepath.Join(home, ".claude", ".credentials.json"), []byte("{}"), 0o600)
	if found := m.DetectInBoxLogins(); len(found) != 1 {
		t.Fatalf("claude login not detected: %v", found)
	}
}

func TestScrub(t *testing.T) {
	m, home := newManager(t, &fakeConsole{})
	files := map[string]bool{
		filepath.Join(m.opts.AgentAuthDir, "codex", "auth.json"):         true,
		filepath.Join(m.opts.IdentityDir, "aws-prod", "token"):           true,
		filepath.Join(m.opts.IdentityDir, "gcp", "token"):                true,
		filepath.Join(home, ".aws", "cli", "cache", "abc.json"):          true,
		filepath.Join(home, ".config", "gcloud", "credentials.db"):       true,
		filepath.Join(home, ".azure", "msal_token_cache.json"):           true,
		filepath.Join(m.opts.IdentityDir, "gcp", "gcp-credentials.json"): false,
		filepath.Join(home, ".aws", "config"):                            false,
		filepath.Join(home, "project", "notes.md"):                       false,
	}
	for p := range files {
		_ = os.MkdirAll(filepath.Dir(p), 0o700)
		if err := os.WriteFile(p, []byte("secret"), 0o600); err != nil {
			t.Fatal(err)
		}
	}
	removed := m.Scrub()
	if len(removed) == 0 {
		t.Fatal("nothing removed")
	}
	for p, gone := range files {
		_, err := os.Stat(p)
		if gone && err == nil {
			t.Errorf("%s survived the scrub", p)
		}
		if !gone && err != nil {
			t.Errorf("%s removed: %v", p, err)
		}
	}
	if m.CodexInstalled() {
		t.Fatal("codex still reported installed after scrub")
	}
}
