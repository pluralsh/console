package creds

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// sdkCaches are cloud SDK credential caches derived from the OIDC tokens (removed before snapshots).
var sdkCaches = []string{
	".aws/cli/cache",
	".aws/sso/cache",
	".config/gcloud",
	".azure",
}

// inBoxLogins are files a vendor or cloud login made inside the box leaves on the workspace volume.
var inBoxLogins = map[string]string{
	".claude/.credentials.json": "claude /login",
	".aws/credentials":          "aws configure",
	".config/gh/hosts.yml":      "gh auth login",
}

// Scrub deletes every credential that must not be captured in a snapshot: tmpfs subscription credentials, OIDC
// token files and SDK caches. It returns the removed paths. Config files (profiles, external_account JSON) stay:
// they hold no secrets.
func (m *Manager) Scrub() []string {
	var removed []string
	rm := func(p string) {
		if _, err := os.Lstat(p); err == nil {
			if err := os.RemoveAll(p); err == nil {
				removed = append(removed, p)
			} else {
				m.log.Warn("scrub", "path", p, "err", err)
			}
		}
	}
	if m.opts.AgentAuthDir != "" {
		entries, _ := os.ReadDir(m.opts.AgentAuthDir)
		for _, e := range entries {
			rm(filepath.Join(m.opts.AgentAuthDir, e.Name()))
		}
	}
	if m.opts.IdentityDir != "" {
		entries, _ := os.ReadDir(m.opts.IdentityDir)
		for _, e := range entries {
			if e.IsDir() {
				rm(filepath.Join(m.opts.IdentityDir, e.Name(), "token"))
			}
		}
	}
	if m.opts.Home != "" {
		for _, c := range sdkCaches {
			rm(filepath.Join(m.opts.Home, c))
		}
	}
	m.mu.Lock()
	m.codex = nil
	m.tokens = map[string]time.Time{}
	m.mu.Unlock()
	return removed
}

// Restore refetches credentials after a resume or restore (Scrub removed them).
func (m *Manager) Restore(ctx context.Context, codex bool) error {
	m.kick()
	if codex {
		return m.FetchCodex(ctx)
	}
	return nil
}

// DetectInBoxLogins reports vendor logins made inside the box (they land on the workspace volume and in
// snapshots).
func (m *Manager) DetectInBoxLogins() []string {
	if m.opts.Home == "" {
		return nil
	}
	var found []string
	for rel, how := range inBoxLogins {
		if fi, err := os.Lstat(filepath.Join(m.opts.Home, rel)); err == nil && fi.Mode().IsRegular() {
			found = append(found, "~/"+rel+" ("+how+")")
		}
	}
	link := m.codexHomeLink()
	if fi, err := os.Lstat(link); err == nil && fi.Mode().IsRegular() {
		found = append(found, "~/.codex/auth.json (codex login)")
	}
	if len(found) > 0 {
		m.condition("in_box_login_detected", "warning", "credentials from a login inside the box are on the workspace volume and will be captured in snapshots: "+strings.Join(found, ", "), true)
	} else {
		m.condition("in_box_login_detected", "warning", "", false)
	}
	return found
}
