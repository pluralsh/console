package creds

import (
	"bytes"
	"context"
	"crypto/sha256"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/fsnotify/fsnotify"
	"google.golang.org/protobuf/types/known/timestamppb"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/internal/fsutil"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/proc"
)

// codexState is the installed Codex subscription credential.
type codexState struct {
	credentialID string
	version      int64
	mode         devboxv1.CodexCredentialMode
	leaseHolder  bool
	leaseExpires time.Time
	// written is the sha256 of the bundle the daemon last wrote (or wrote back), so the watch can tell Codex's own
	// refreshes from the daemon's writes.
	written [32]byte
}

// CodexAuthDir is the tmpfs CODEX_HOME holding auth.json.
func (m *Manager) CodexAuthDir() string { return filepath.Join(m.opts.AgentAuthDir, "codex") }

// CodexAuthFile is the tmpfs auth.json.
func (m *Manager) CodexAuthFile() string { return filepath.Join(m.CodexAuthDir(), "auth.json") }

// codexHomeLink is ~/.codex/auth.json, a symlink to the tmpfs file.
func (m *Manager) codexHomeLink() string { return filepath.Join(m.opts.Home, ".codex", "auth.json") }

// FetchCodex fetches the owner's Codex credential and installs it (harness start for subscription billing).
func (m *Manager) FetchCodex(ctx context.Context) error {
	c := m.client()
	if c == nil {
		return errors.New("sandbox credentials endpoint not configured")
	}
	resp, err := c.GetSandboxCredential(ctx, &devboxv1.GetSandboxCredentialRequest{Selector: &devboxv1.CredentialSelector{Kind: devboxv1.CredentialKind_CREDENTIAL_KIND_CODEX}})
	if err != nil {
		return err
	}
	for _, cred := range resp.GetCredentials() {
		if cred.GetKind() == devboxv1.CredentialKind_CREDENTIAL_KIND_CODEX || cred.GetKind() == devboxv1.CredentialKind_CREDENTIAL_KIND_UNSPECIFIED {
			_, err := m.InstallCodex(ctx, cred)
			return err
		}
	}
	return errors.New("no codex credential for this instance")
}

// InstallCodex writes a Codex credential to tmpfs. Bundles older than the installed version are ignored. It
// reports whether the credential was applied.
func (m *Manager) InstallCodex(ctx context.Context, cred *devboxv1.InstanceCredential) (bool, error) {
	m.mu.Lock()
	cur := m.codex
	if cur != nil && cur.credentialID == cred.GetCredentialId() && cred.GetVersion() < cur.version {
		m.mu.Unlock()
		return false, nil
	}
	m.mu.Unlock()
	if err := os.MkdirAll(m.CodexAuthDir(), 0o700); err != nil {
		return false, err
	}
	st := &codexState{
		credentialID: cred.GetCredentialId(), version: cred.GetVersion(), mode: cred.GetCodexMode(),
		leaseHolder: cred.GetRefreshLeaseHolder(),
	}
	if t := cred.GetLeaseExpiresAt(); t != nil {
		st.leaseExpires = t.AsTime()
	}
	switch cred.GetCodexMode() {
	case devboxv1.CodexCredentialMode_CODEX_CREDENTIAL_MODE_ACCESS_TOKEN:
		if err := m.opts.CodexLogin(ctx, m.CodexAuthDir(), cred.GetToken()); err != nil {
			return false, fmt.Errorf("codex login --with-access-token: %w", err)
		}
		if data, err := os.ReadFile(m.CodexAuthFile()); err == nil {
			st.written = sha256.Sum256(data)
		}
	default:
		if len(cred.GetBundleJson()) == 0 {
			return false, errors.New("codex credential has no bundle")
		}
		st.written = sha256.Sum256(cred.GetBundleJson())
		m.mu.Lock()
		m.codex = st
		m.mu.Unlock()
		if err := fsutil.WriteFileAtomic(m.CodexAuthFile(), cred.GetBundleJson(), 0o600); err != nil {
			return false, err
		}
	}
	m.mu.Lock()
	m.codex = st
	m.mu.Unlock()
	if err := m.linkCodexHome(); err != nil {
		return true, err
	}
	m.log.Info("installed codex credential", "version", st.version, "mode", st.mode.String(), "leaseHolder", st.leaseHolder)
	return true, nil
}

// linkCodexHome points ~/.codex/auth.json at the tmpfs file so the bundle never lands on the workspace volume.
func (m *Manager) linkCodexHome() error {
	link := m.codexHomeLink()
	if err := os.MkdirAll(filepath.Dir(link), 0o700); err != nil {
		return err
	}
	if fi, err := os.Lstat(link); err == nil {
		if fi.Mode()&os.ModeSymlink != 0 {
			if t, _ := os.Readlink(link); t == m.CodexAuthFile() {
				return nil
			}
		} else {
			m.condition("in_box_login_detected", "warning",
				"~/.codex/auth.json is a regular file (a `codex login` inside the box?); it was replaced by the linked ChatGPT plan", true)
		}
		if err := os.Remove(link); err != nil {
			return err
		}
	}
	return os.Symlink(m.CodexAuthFile(), link)
}

// codexAccessTokenLogin pipes an Enterprise access token to `codex login --with-access-token`.
func codexAccessTokenLogin(ctx context.Context, codexHome, token string) error {
	cmd := exec.CommandContext(ctx, "codex", "login", "--with-access-token")
	cmd.Env = append(os.Environ(), "CODEX_HOME="+codexHome)
	cmd.Stdin = strings.NewReader(token)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := proc.Run(cmd); err != nil {
		return fmt.Errorf("%w: %s", err, strings.TrimSpace(stderr.String()))
	}
	return nil
}

// PushCredential applies a credential pushed by the gateway (refreshed Codex bundles, OIDC tokens).
func (m *Manager) PushCredential(ctx context.Context, cred *devboxv1.InstanceCredential) (bool, error) {
	switch cred.GetKind() {
	case devboxv1.CredentialKind_CREDENTIAL_KIND_CODEX:
		return m.InstallCodex(ctx, cred)
	case devboxv1.CredentialKind_CREDENTIAL_KIND_OIDC:
		if err := m.applyOIDC(cred); err != nil {
			return false, err
		}
		return true, nil
	}
	return false, nil
}

// onCodexFileChanged writes back a bundle Codex refreshed (compare-and-swap on the credential version). A stale
// write installs the newer bundle console returns.
func (m *Manager) onCodexFileChanged(ctx context.Context) error {
	data, err := os.ReadFile(m.CodexAuthFile())
	if err != nil || len(bytes.TrimSpace(data)) == 0 {
		return nil
	}
	sum := sha256.Sum256(data)
	m.mu.Lock()
	st := m.codex
	if st == nil || st.written == sum || st.mode == devboxv1.CodexCredentialMode_CODEX_CREDENTIAL_MODE_ACCESS_TOKEN {
		m.mu.Unlock()
		return nil
	}
	credID, version := st.credentialID, st.version
	m.mu.Unlock()
	c := m.client()
	if c == nil {
		return errors.New("sandbox credentials endpoint not configured")
	}
	resp, err := c.UpdateCodexBundle(ctx, &devboxv1.UpdateCodexBundleRequest{
		CredentialId: credID, ExpectedVersion: version, BundleJson: data, RefreshedAt: timestamppb.New(m.opts.Clock.Now()),
	})
	if err != nil {
		return err
	}
	if resp.GetApplied() {
		m.mu.Lock()
		if m.codex == st {
			st.version = version + 1
			st.written = sum
		}
		m.mu.Unlock()
		m.log.Info("wrote back refreshed codex bundle", "version", version+1)
		return nil
	}
	if cur := resp.GetCurrent(); cur != nil {
		m.log.Warn("codex bundle write-back was stale; installing the current bundle", "version", cur.GetVersion())
		_, err := m.InstallCodex(ctx, cur)
		return err
	}
	return nil
}

// WatchCodex watches the tmpfs auth.json for Codex's refreshes and renews the refresh lease before it expires.
func (m *Manager) WatchCodex(ctx context.Context) {
	if err := os.MkdirAll(m.CodexAuthDir(), 0o700); err != nil {
		m.log.Warn("codex auth dir", "err", err)
		return
	}
	w, err := fsnotify.NewWatcher()
	if err != nil {
		m.log.Warn("codex watch unavailable", "err", err)
		return
	}
	defer w.Close()
	if err := w.Add(m.CodexAuthDir()); err != nil {
		m.log.Warn("codex watch unavailable", "err", err)
		return
	}
	var fire <-chan time.Time
	tick := time.NewTicker(time.Minute)
	defer tick.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case ev, ok := <-w.Events:
			if !ok {
				return
			}
			if filepath.Base(ev.Name) == "auth.json" && (ev.Has(fsnotify.Write) || ev.Has(fsnotify.Create) || ev.Has(fsnotify.Rename)) {
				fire = time.After(500 * time.Millisecond)
			}
		case <-fire:
			fire = nil
			if err := m.onCodexFileChanged(ctx); err != nil {
				m.log.Warn("codex write-back", "err", err)
			}
		case <-tick.C:
			m.mu.Lock()
			st := m.codex
			renew := st != nil && st.leaseHolder && !st.leaseExpires.IsZero() && m.opts.Clock.Now().After(st.leaseExpires.Add(-2*time.Minute))
			m.mu.Unlock()
			if renew {
				if err := m.FetchCodex(ctx); err != nil {
					m.log.Warn("renew codex refresh lease", "err", err)
				}
			}
		}
	}
}

// CodexInstalled reports whether a Codex credential is installed.
func (m *Manager) CodexInstalled() bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.codex != nil
}
