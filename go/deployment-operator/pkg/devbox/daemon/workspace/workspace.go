// Package workspace hydrates and maintains the multi-repo home directory (DBX-44, section 4.2b): skeleton files,
// repository clones with the naming rule, the home instruction file, Project.md's managed table and stubs,
// AddRepository, per-thread worktrees, and uploaded git bundles.
package workspace

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
	"google.golang.org/grpc/codes"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/derr"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/gitutil"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/internal/fsutil"
)

const (
	// ProjectMD is the cross-repo map's file name in the home directory.
	ProjectMD = "Project.md"
	// ThreadsDir holds per-thread worktrees.
	ThreadsDir = ".threads"
	// rescanEvery catches changes the top-level watch can't see (a clone finishing, a branch switch).
	rescanEvery = 30 * time.Second
	// debounce coalesces top-level filesystem events.
	debounce = 2 * time.Second
)

// Options configure a Manager.
type Options struct {
	Home     string
	StateDir string
	// SkelDir is copied into the home directory on first boot without overwriting (/etc/devbox/skel).
	SkelDir string
	Log     *slog.Logger
	// Condition reports a daemon condition (hydration failures).
	Condition func(typ, severity, msg string, active bool)
	// OnChange is called after the checkout list changed.
	OnChange func()
}

type repoRecord struct {
	URL         string `json:"url"`
	Dir         string `json:"dir"`
	Branch      string `json:"branch,omitempty"`
	Description string `json:"description,omitempty"`
}

type state struct {
	Hydrated    bool              `json:"hydrated"`
	HydratedAt  time.Time         `json:"hydratedAt,omitempty"`
	SkelApplied bool              `json:"skelApplied"`
	Repos       []repoRecord      `json:"repos,omitempty"`
	AddKeys     map[string]string `json:"addKeys,omitempty"`
}

// Manager maintains the workspace.
type Manager struct {
	opts Options
	log  *slog.Logger

	mu        sync.Mutex
	st        state
	checkouts []*devboxv1.Checkout
	hydrated  bool
	cloneMu   sync.Mutex
}

// New returns a Manager and loads the recorded workspace state.
func New(opts Options) (*Manager, error) {
	if opts.Log == nil {
		opts.Log = slog.Default()
	}
	m := &Manager{opts: opts, log: opts.Log.With("component", "workspace")}
	if _, err := fsutil.ReadJSON(m.statePath(), &m.st); err != nil {
		return nil, err
	}
	m.hydrated = m.st.Hydrated
	return m, nil
}

func (m *Manager) statePath() string { return filepath.Join(m.opts.StateDir, "workspace.json") }

func (m *Manager) saveLocked() error { return fsutil.WriteJSON(m.statePath(), m.st, 0o600) }

func (m *Manager) condition(typ, severity, msg string, active bool) {
	if m.opts.Condition != nil {
		m.opts.Condition(typ, severity, msg, active)
	}
}

// Hydrated reports whether the workspace was hydrated (on this or a previous boot, including a snapshot's).
func (m *Manager) Hydrated() bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.hydrated
}

// ProjectMDPath is the absolute path of Project.md.
func (m *Manager) ProjectMDPath() string { return filepath.Join(m.opts.Home, ProjectMD) }

// ApplySkel copies the image skeleton into the home directory once, without overwriting existing files.
func (m *Manager) ApplySkel() error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.st.SkelApplied || m.opts.SkelDir == "" {
		return nil
	}
	if _, err := os.Stat(m.opts.SkelDir); err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	n, err := fsutil.CopyTreeNoClobber(m.opts.SkelDir, m.opts.Home)
	if err != nil {
		return err
	}
	m.log.Info("applied home skeleton", "files", n)
	m.st.SkelApplied = true
	return m.saveLocked()
}

// WriteInstructions writes ~/AGENTS.md and links ~/CLAUDE.md and ~/GEMINI.md to it. Existing regular files are
// left alone (the user owns them).
func (m *Manager) WriteInstructions() error {
	path := filepath.Join(m.opts.Home, "AGENTS.md")
	cur, err := os.ReadFile(path)
	if err != nil || strings.HasPrefix(string(cur), "# Plural DevBox\n") {
		if string(cur) != AgentsMD {
			if err := fsutil.WriteFileAtomic(path, []byte(AgentsMD), 0o644); err != nil {
				return err
			}
		}
	}
	for _, name := range []string{"CLAUDE.md", "GEMINI.md"} {
		if err := linkIfAbsent(filepath.Join(m.opts.Home, name), "AGENTS.md"); err != nil {
			return err
		}
	}
	return nil
}

func linkIfAbsent(link, target string) error {
	if fi, err := os.Lstat(link); err == nil {
		if fi.Mode()&os.ModeSymlink == 0 {
			return nil
		}
		if cur, _ := os.Readlink(link); cur == target {
			return nil
		}
		if err := os.Remove(link); err != nil {
			return err
		}
	}
	return os.Symlink(target, link)
}

// RepoName returns owner and repo from a clone URL.
func RepoName(raw string) (owner, repo string) {
	s := strings.TrimSpace(raw)
	if u, err := url.Parse(s); err == nil && u.Host != "" {
		s = u.Path
	} else if i := strings.Index(s, ":"); i > 0 {
		s = s[i+1:]
	}
	s = strings.Trim(strings.TrimSuffix(strings.TrimSuffix(s, "/"), ".git"), "/")
	parts := strings.Split(s, "/")
	repo = parts[len(parts)-1]
	if len(parts) >= 2 {
		owner = parts[len(parts)-2]
	}
	return owner, repo
}

// SameRemote compares clone URLs ignoring scheme, credentials, case of the host and a .git suffix.
func SameRemote(a, b string) bool {
	return strings.EqualFold(displayRemote(a), displayRemote(b))
}

// DirFor applies the naming rule: ~/<repo>, or ~/<owner>-<repo> when ~/<repo> is another repository's.
func (m *Manager) DirFor(spec *devboxv1.RepositorySpec) (string, error) {
	if d := spec.GetDirectory(); d != "" {
		if strings.Contains(d, "/") || strings.HasPrefix(d, ".") {
			return "", derr.New(codes.InvalidArgument, devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED, "directory must be a plain name under ~", nil)
		}
		return filepath.Join(m.opts.Home, d), nil
	}
	owner, repo := RepoName(spec.GetUrl())
	if repo == "" {
		return "", derr.New(codes.InvalidArgument, devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED, "can't derive a name from "+spec.GetUrl(), nil)
	}
	candidates := []string{repo}
	if owner != "" {
		candidates = append(candidates, owner+"-"+repo)
	}
	for _, name := range candidates {
		dir := filepath.Join(m.opts.Home, name)
		if _, err := os.Stat(dir); os.IsNotExist(err) {
			return dir, nil
		}
		if gitutil.IsRepo(dir) {
			remote, _ := gitutil.Run(context.Background(), dir, "remote", "get-url", "origin")
			if SameRemote(strings.TrimSpace(string(remote)), spec.GetUrl()) {
				return dir, nil
			}
		}
	}
	for i := 2; ; i++ {
		dir := filepath.Join(m.opts.Home, fmt.Sprintf("%s-%s-%d", owner, repo, i))
		if _, err := os.Stat(dir); os.IsNotExist(err) {
			return dir, nil
		}
	}
}

// Clone clones a repository into its directory (idempotent when it's already there).
func (m *Manager) Clone(ctx context.Context, spec *devboxv1.RepositorySpec) (string, error) {
	m.cloneMu.Lock()
	defer m.cloneMu.Unlock()
	dir, err := m.DirFor(spec)
	if err != nil {
		return "", err
	}
	if gitutil.IsRepo(dir) {
		return dir, nil
	}
	if _, err := os.Stat(dir); err == nil {
		return "", derr.New(codes.AlreadyExists, devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED, dir+" exists and is not a git checkout", nil)
	}
	args := []string{"clone", "--quiet"}
	if spec.GetBranch() != "" {
		args = append(args, "--branch", spec.GetBranch())
	}
	args = append(args, "--", spec.GetUrl(), dir)
	if _, err := gitutil.Run(ctx, m.opts.Home, args...); err != nil {
		_ = os.RemoveAll(dir)
		var ge *gitutil.Error
		if errors.As(err, &ge) && (strings.Contains(ge.Stderr, "403") || strings.Contains(strings.ToLower(ge.Stderr), "forbidden")) {
			return "", derr.New(codes.PermissionDenied, devboxv1.ErrorReason_ERROR_REASON_REPOSITORY_NOT_ALLOWED, "repository is not allowlisted: "+spec.GetUrl(), map[string]string{"url": spec.GetUrl()})
		}
		return "", derr.New(codes.Unavailable, devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED, err.Error(), map[string]string{"url": spec.GetUrl()})
	}
	m.mu.Lock()
	m.st.Repos = append(m.st.Repos, repoRecord{URL: spec.GetUrl(), Dir: filepath.Base(dir), Branch: spec.GetBranch(), Description: spec.GetDescription()})
	err = m.saveLocked()
	m.mu.Unlock()
	return dir, err
}

// Hydrate prepares the workspace at boot: skeleton, instructions, clones (first boot only: a snapshot's
// workspace is already hydrated), and Project.md.
func (m *Manager) Hydrate(ctx context.Context, repos []*devboxv1.RepositorySpec) error {
	if err := m.ApplySkel(); err != nil {
		m.log.Warn("apply skeleton", "err", err)
	}
	if err := m.WriteInstructions(); err != nil {
		m.log.Warn("write AGENTS.md", "err", err)
	}
	m.mu.Lock()
	already := m.st.Hydrated
	m.mu.Unlock()
	var errs []error
	if !already {
		for _, r := range repos {
			if _, err := m.Clone(ctx, r); err != nil {
				errs = append(errs, err)
				m.condition("workspace_hydration_failed", "warning", fmt.Sprintf("clone %s: %v", r.GetUrl(), err), true)
			}
		}
		m.mu.Lock()
		m.st.Hydrated = true
		m.st.HydratedAt = time.Now()
		_ = m.saveLocked()
		m.mu.Unlock()
	}
	if err := m.Refresh(ctx); err != nil {
		errs = append(errs, err)
	}
	m.mu.Lock()
	m.hydrated = true
	m.mu.Unlock()
	return errors.Join(errs...)
}

// scan lists checkouts directly under the home directory.
func (m *Manager) scan(ctx context.Context) []*devboxv1.Checkout {
	des, err := os.ReadDir(m.opts.Home)
	if err != nil {
		return nil
	}
	var out []*devboxv1.Checkout
	for _, de := range des {
		if !de.IsDir() || strings.HasPrefix(de.Name(), ".") {
			continue
		}
		dir := filepath.Join(m.opts.Home, de.Name())
		if !gitutil.IsRepo(dir) {
			continue
		}
		c, err := gitutil.Inspect(ctx, dir)
		if err != nil {
			continue
		}
		out = append(out, c)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].GetName() < out[j].GetName() })
	return out
}

func (m *Manager) description(name string) string {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, r := range m.st.Repos {
		if r.Dir == name {
			return r.Description
		}
	}
	return ""
}

// Refresh rescans checkouts and regenerates Project.md's managed table and stubs.
func (m *Manager) Refresh(ctx context.Context) error {
	cs := m.scan(ctx)
	m.mu.Lock()
	changed := !sameCheckouts(m.checkouts, cs)
	m.checkouts = cs
	m.mu.Unlock()
	infos := make([]RepoInfo, 0, len(cs))
	for _, c := range cs {
		infos = append(infos, RepoInfo{Checkout: c, Description: m.description(c.GetName())})
	}
	path := m.ProjectMDPath()
	cur, err := os.ReadFile(path)
	var next string
	switch {
	case os.IsNotExist(err):
		next = NewProjectMD(infos)
	case err != nil:
		return err
	default:
		next = UpdateProjectMD(string(cur), infos)
	}
	if next != string(cur) {
		if err := fsutil.WriteFileAtomic(path, []byte(next), 0o644); err != nil {
			return err
		}
	}
	if changed && m.opts.OnChange != nil {
		m.opts.OnChange()
	}
	return nil
}

func sameCheckouts(a, b []*devboxv1.Checkout) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i].GetPath() != b[i].GetPath() || a[i].GetHeadSha() != b[i].GetHeadSha() || a[i].GetBranch() != b[i].GetBranch() ||
			a[i].GetDirty() != b[i].GetDirty() || a[i].GetRemoteUrl() != b[i].GetRemoteUrl() {
			return false
		}
	}
	return true
}

// Watch keeps Project.md current: a watch on the home directory's top level, debounced, plus a periodic rescan.
func (m *Manager) Watch(ctx context.Context) {
	w, err := fsnotify.NewWatcher()
	if err != nil {
		m.log.Warn("home watch unavailable", "err", err)
	} else {
		defer w.Close()
		if err := w.Add(m.opts.Home); err != nil {
			m.log.Warn("home watch unavailable", "err", err)
		}
	}
	var events <-chan fsnotify.Event
	if w != nil {
		events = w.Events
	}
	tick := time.NewTicker(rescanEvery)
	defer tick.Stop()
	var fire <-chan time.Time
	for {
		select {
		case <-ctx.Done():
			return
		case ev, ok := <-events:
			if !ok {
				events = nil
				continue
			}
			base := filepath.Base(ev.Name)
			if strings.HasPrefix(base, ".") || base == ProjectMD {
				continue
			}
			if ev.Has(fsnotify.Create) || ev.Has(fsnotify.Remove) || ev.Has(fsnotify.Rename) {
				fire = time.After(debounce)
			}
		case <-fire:
			fire = nil
			if err := m.Refresh(ctx); err != nil {
				m.log.Warn("refresh Project.md", "err", err)
			}
		case <-tick.C:
			if err := m.Refresh(ctx); err != nil {
				m.log.Warn("refresh Project.md", "err", err)
			}
		}
	}
}

// Checkouts returns the main checkouts' paths (files.Checkouts).
func (m *Manager) Checkouts() []string {
	m.mu.Lock()
	defer m.mu.Unlock()
	out := make([]string, 0, len(m.checkouts))
	for _, c := range m.checkouts {
		out = append(out, c.GetPath())
	}
	return out
}

// CheckoutInfo returns the cached checkouts (for the instance aggregate).
func (m *Manager) CheckoutInfo() []*devboxv1.Checkout {
	m.mu.Lock()
	defer m.mu.Unlock()
	return append([]*devboxv1.Checkout(nil), m.checkouts...)
}

// ThreadWorktrees returns a thread's worktree paths.
func (m *Manager) ThreadWorktrees(threadID string) []string {
	base := filepath.Join(m.opts.Home, ThreadsDir, threadID)
	des, err := os.ReadDir(base)
	if err != nil {
		return nil
	}
	var out []string
	for _, de := range des {
		p := filepath.Join(base, de.Name())
		if de.IsDir() && gitutil.IsRepo(p) {
			out = append(out, p)
		}
	}
	return out
}

// List implements ListRepositories.
func (m *Manager) List(ctx context.Context, includeWorktrees bool) *devboxv1.ListRepositoriesResponse {
	resp := &devboxv1.ListRepositoriesResponse{Checkouts: m.scan(ctx), ProjectMdPath: m.ProjectMDPath()}
	if includeWorktrees {
		threads, _ := os.ReadDir(filepath.Join(m.opts.Home, ThreadsDir))
		for _, t := range threads {
			for _, p := range m.ThreadWorktrees(t.Name()) {
				if c, err := gitutil.Inspect(ctx, p); err == nil {
					c.WorktreeThreadId = t.Name()
					resp.Checkouts = append(resp.Checkouts, c)
				}
			}
		}
	}
	return resp
}

// AddRepository clones a repository and registers it. Repeating an idempotency key returns the same checkout.
func (m *Manager) AddRepository(ctx context.Context, spec *devboxv1.RepositorySpec, key string) (*devboxv1.Checkout, error) {
	if spec.GetUrl() == "" {
		return nil, derr.New(codes.InvalidArgument, devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED, "repository url is required", nil)
	}
	if key != "" {
		m.mu.Lock()
		dir, ok := m.st.AddKeys[key]
		m.mu.Unlock()
		if ok && gitutil.IsRepo(filepath.Join(m.opts.Home, dir)) {
			return gitutil.Inspect(ctx, filepath.Join(m.opts.Home, dir))
		}
	}
	dir, err := m.Clone(ctx, spec)
	if err != nil {
		return nil, err
	}
	if key != "" {
		m.mu.Lock()
		if m.st.AddKeys == nil {
			m.st.AddKeys = map[string]string{}
		}
		m.st.AddKeys[key] = filepath.Base(dir)
		_ = m.saveLocked()
		m.mu.Unlock()
	}
	if err := m.Refresh(ctx); err != nil {
		m.log.Warn("refresh Project.md", "err", err)
	}
	return gitutil.Inspect(ctx, dir)
}

// Worktrees creates ~/.threads/<id>/<repo> worktrees (branch devbox/<id>) and returns the session cwd: the
// worktree itself for one repository, else ~/.threads/<id>. ~/.threads/<id> gets Project.md and AGENTS.md
// symlinks so the thread still sees the cross-repo map.
func (m *Manager) Worktrees(threadID string, repos []string) (string, error) {
	if threadID == "" || strings.ContainsAny(threadID, "/\\") || strings.HasPrefix(threadID, ".") {
		return "", derr.New(codes.InvalidArgument, devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED, "invalid thread id", nil)
	}
	base := filepath.Join(m.opts.Home, ThreadsDir, threadID)
	if err := os.MkdirAll(base, 0o755); err != nil {
		return "", err
	}
	ctx := context.Background()
	var created []string
	for _, name := range repos {
		src := filepath.Join(m.opts.Home, name)
		if strings.ContainsAny(name, "/\\") || !gitutil.IsRepo(src) {
			return "", derr.New(codes.InvalidArgument, devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED, "no checkout ~/"+name, nil)
		}
		dst := filepath.Join(base, name)
		created = append(created, dst)
		if gitutil.IsRepo(dst) {
			continue
		}
		branch := "devbox/" + threadID
		args := []string{"worktree", "add", "--quiet", "-b", branch, dst}
		if _, err := gitutil.Run(ctx, src, "rev-parse", "--verify", "-q", "refs/heads/"+branch); err == nil {
			args = []string{"worktree", "add", "--quiet", dst, branch}
		}
		if _, err := gitutil.Run(ctx, src, args...); err != nil {
			return "", derr.New(codes.FailedPrecondition, devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED, err.Error(), nil)
		}
	}
	for _, name := range []string{ProjectMD, "AGENTS.md", "CLAUDE.md", "GEMINI.md"} {
		if err := linkIfAbsent(filepath.Join(base, name), filepath.Join(m.opts.Home, name)); err != nil {
			return "", err
		}
	}
	if len(created) == 1 {
		return created[0], nil
	}
	return base, nil
}

// ApplyBundle applies an uploaded `git bundle` of local commits to ~/<name> (the `plural devbox push` path):
// the bundle's branches land under refs/remotes/bundle/*, the current branch fast-forwards when it can, and
// other branches are created locally when absent. A missing checkout is cloned from the bundle.
func (m *Manager) ApplyBundle(ctx context.Context, name, remoteURL string, bundle io.Reader) (*devboxv1.Checkout, error) {
	if name == "" && remoteURL != "" {
		dir, err := m.DirFor(&devboxv1.RepositorySpec{Url: remoteURL})
		if err != nil {
			return nil, err
		}
		name = filepath.Base(dir)
	}
	if name == "" || strings.ContainsAny(name, "/\\") || strings.HasPrefix(name, ".") {
		return nil, derr.New(codes.InvalidArgument, devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED, "invalid repository name", nil)
	}
	tmp, err := os.CreateTemp(m.opts.StateDir, "bundle-*.bundle")
	if err != nil {
		return nil, err
	}
	defer os.Remove(tmp.Name())
	if _, err := io.Copy(tmp, bundle); err != nil {
		tmp.Close()
		return nil, err
	}
	tmp.Close()
	dir := filepath.Join(m.opts.Home, name)
	m.cloneMu.Lock()
	defer m.cloneMu.Unlock()
	if !gitutil.IsRepo(dir) {
		if _, err := gitutil.Run(ctx, m.opts.Home, "clone", "--quiet", tmp.Name(), dir); err != nil {
			return nil, derr.New(codes.InvalidArgument, devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED, err.Error(), nil)
		}
		if remoteURL != "" {
			_, _ = gitutil.Run(ctx, dir, "remote", "set-url", "origin", remoteURL)
		}
	} else {
		if _, err := gitutil.Run(ctx, dir, "fetch", "--quiet", "--force", tmp.Name(), "refs/heads/*:refs/remotes/bundle/*"); err != nil {
			return nil, derr.New(codes.InvalidArgument, devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED, err.Error(), nil)
		}
		out, _ := gitutil.Run(ctx, dir, "for-each-ref", "--format=%(refname:strip=3)", "refs/remotes/bundle/")
		cur, _ := gitutil.Run(ctx, dir, "symbolic-ref", "--short", "-q", "HEAD")
		current := strings.TrimSpace(string(cur))
		for _, br := range strings.Fields(string(out)) {
			if br == current {
				if _, err := gitutil.Run(ctx, dir, "merge", "--ff-only", "--quiet", "refs/remotes/bundle/"+br); err != nil {
					m.log.Warn("bundle branch doesn't fast-forward; left under refs/remotes/bundle", "repo", name, "branch", br)
				}
				continue
			}
			if _, err := gitutil.Run(ctx, dir, "rev-parse", "--verify", "-q", "refs/heads/"+br); err != nil {
				_, _ = gitutil.Run(ctx, dir, "branch", "--quiet", br, "refs/remotes/bundle/"+br)
			}
		}
	}
	if err := m.Refresh(ctx); err != nil {
		m.log.Warn("refresh Project.md", "err", err)
	}
	return gitutil.Inspect(ctx, dir)
}
