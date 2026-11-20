package daemon

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"maps"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"slices"
	"sort"
	"strings"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/harness"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/internal/fsutil"
)

// gitAuthInclude is the daemon-managed git config, relative to ~ (and to ~/.gitconfig, which includes it).
const gitAuthInclude = ".plural/gitconfig"

// GitAuthPlaceholder is the Authorization header git sends to SCM hosts. atenet-egress only replaces headers that
// are present, so git must send one; the real token never enters the sandbox.
var GitAuthPlaceholder = "Authorization: Basic " + base64.StdEncoding.EncodeToString([]byte("x-access-token:"+harness.PlaceholderKey))

// gitCredentialHelper answers every https credential request with the placeholder, so git retries a 401 from a
// host it has no extraHeader for with Basic auth that egress can replace. Quoted: ';' starts a git config comment.
var gitCredentialHelper = `"!f() { test $1 = get && echo username=x-access-token && echo password=` + harness.PlaceholderKey + `; }; f"`

// scmTokenEnv are the token variables SCM CLIs read; they get the placeholder so gh sends Authorization and glab
// sends PRIVATE-TOKEN, both of which egress replaces on SCM hosts.
var scmTokenEnv = []string{"GH_TOKEN", "GH_ENTERPRISE_TOKEN", "GITLAB_TOKEN"}

// scpLikeURL matches git's scp-like ssh syntax, user@host:path.
var scpLikeURL = regexp.MustCompile(`^([A-Za-z0-9._-]+)@([A-Za-z0-9.-]+):([^/].*)?$`)

func (d *Daemon) repoURLs(extra ...string) []string {
	urls := append([]string(nil), extra...)
	d.mu.Lock()
	for _, r := range d.req.GetRepositories() {
		urls = append(urls, r.GetUrl())
	}
	d.mu.Unlock()
	for _, c := range d.ws.CheckoutInfo() {
		urls = append(urls, c.GetRemoteUrl())
	}
	return urls
}

// sshRewrites maps https://host/ to the ssh prefixes of the workspace's ssh remotes on that host. Egress only
// carries https, so ssh remotes are rewritten (url.<base>.insteadOf) to go through it with injected credentials.
func sshRewrites(urls []string) map[string][]string {
	out := map[string][]string{}
	add := func(host, prefix string) {
		base := "https://" + strings.ToLower(host) + "/"
		if !slices.Contains(out[base], prefix) {
			out[base] = append(out[base], prefix)
		}
	}
	for _, raw := range urls {
		raw = strings.TrimSpace(raw)
		if m := scpLikeURL.FindStringSubmatch(raw); m != nil {
			add(m[2], m[1]+"@"+m[2]+":")
			continue
		}
		u, err := url.Parse(raw)
		if err != nil || u.Scheme != "ssh" || u.Hostname() == "" || u.Port() != "" && u.Port() != "22" {
			continue
		}
		prefix := "ssh://" + u.Host + "/"
		if u.User != nil {
			prefix = "ssh://" + u.User.Username() + "@" + u.Host + "/"
		}
		add(u.Hostname(), prefix)
	}
	return out
}

// gitHosts returns the scheme://host/ prefixes of every http(s) repository the workspace knows about, including
// hosts of ssh remotes, which are rewritten to https.
func (d *Daemon) gitHosts(urls []string) []string {
	seen := map[string]bool{}
	var out []string
	for base := range sshRewrites(urls) {
		seen[base] = true
		out = append(out, base)
	}
	for _, raw := range urls {
		u, err := url.Parse(strings.TrimSpace(raw))
		if err != nil || (u.Scheme != "https" && u.Scheme != "http") || u.Host == "" {
			continue
		}
		p := u.Scheme + "://" + strings.ToLower(u.Hostname())
		if port := u.Port(); port != "" {
			p += ":" + port
		}
		p += "/"
		if !seen[p] {
			seen[p] = true
			out = append(out, p)
		}
	}
	sort.Strings(out)
	return out
}

// writeGitAuth regenerates ~/.plural/gitconfig and makes sure ~/.gitconfig includes it: an Authorization
// placeholder per known SCM host, ssh-to-https rewrites, and a credential helper for hosts not known yet. extra
// are URLs about to be cloned.
func (d *Daemon) writeGitAuth(extra ...string) {
	urls := d.repoURLs(extra...)
	var b strings.Builder
	b.WriteString("# Managed by devbox-daemon; regenerated on every change. atenet-egress replaces these placeholder\n")
	b.WriteString("# Authorization headers with the instance's SCM credentials.\n")
	b.WriteString("[credential]\n\thelper = " + gitCredentialHelper + "\n")
	for _, h := range d.gitHosts(urls) {
		b.WriteString("[http \"" + h + "\"]\n\textraHeader = " + GitAuthPlaceholder + "\n")
	}
	rewrites := sshRewrites(urls)
	for _, base := range slices.Sorted(maps.Keys(rewrites)) {
		b.WriteString("[url \"" + base + "\"]\n")
		for _, p := range rewrites[base] {
			b.WriteString("\tinsteadOf = " + p + "\n")
		}
	}
	path := filepath.Join(d.cfg.Home, gitAuthInclude)
	if cur, err := os.ReadFile(path); err != nil || string(cur) != b.String() {
		if err := fsutil.WriteFileAtomic(path, []byte(b.String()), 0o644); err != nil {
			d.log.Warn("git auth config", "err", err)
			return
		}
	}
	gitconfig := filepath.Join(d.cfg.Home, ".gitconfig")
	if err := ensureGitInclude(gitconfig); err != nil {
		d.log.Warn("git include", "err", err)
	}
	d.mu.Lock()
	owner := d.req.GetOwner()
	d.mu.Unlock()
	if err := ensureGitIdentity(owner, gitconfig); err != nil {
		d.log.Warn("git identity", "err", err)
	}
}

// ensureGitIdentity commits as the instance owner. It writes ~/.gitconfig itself rather than the include, since
// `git config --global` (how agents check for an identity) doesn't follow includes; fields the user (or the image
// skeleton) already set are left alone.
func ensureGitIdentity(owner *devboxv1.Principal, gitconfig string) error {
	fields := []struct{ key, value string }{{"name", owner.GetName()}, {"email", owner.GetEmail()}}
	if fields[0].value == "" {
		fields[0].value, _, _ = strings.Cut(fields[1].value, "@")
	}
	for _, f := range fields {
		value := strings.NewReplacer("\n", " ", "\r", " ").Replace(f.value)
		if value == "" || gitConfigSet(gitconfig, "user."+f.key) {
			continue
		}
		if out, err := exec.Command("git", "config", "--file", gitconfig, "user."+f.key, value).CombinedOutput(); err != nil {
			return fmt.Errorf("git config user.%s: %w: %s", f.key, err, out)
		}
	}
	return nil
}

func gitConfigSet(gitconfig, key string) bool {
	if _, err := os.Stat(gitconfig); err != nil {
		return false
	}
	out, err := exec.Command("git", "config", "--file", gitconfig, "--get", key).Output()
	return err == nil && strings.TrimSpace(string(out)) != ""
}

// ensureGitInclude appends `[include] path = .plural/gitconfig` to ~/.gitconfig unless it is already there.
func ensureGitInclude(gitconfig string) error {
	cur, err := os.ReadFile(gitconfig)
	if err != nil && !os.IsNotExist(err) {
		return err
	}
	if bytes.Contains(cur, []byte(gitAuthInclude)) {
		return nil
	}
	var b bytes.Buffer
	b.Write(cur)
	if len(cur) > 0 && !bytes.HasSuffix(cur, []byte("\n")) {
		b.WriteByte('\n')
	}
	b.WriteString("# SCM auth placeholders for the egress gateway (managed by devbox-daemon).\n[include]\n\tpath = " + gitAuthInclude + "\n")
	return fsutil.WriteFileAtomic(gitconfig, b.Bytes(), 0o644)
}
