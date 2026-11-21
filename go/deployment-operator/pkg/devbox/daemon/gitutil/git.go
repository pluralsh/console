// Package gitutil wraps the git CLI for checkout inspection, status and diffs (DBX-43).
package gitutil

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/proc"
)

// EmptyTree is git's empty tree object, the base for repositories without commits.
const EmptyTree = "4b825dc642cb6eb9a060e54bf8d69288fbee4904"

// DefaultMaxDiffBytes caps one file's diff.
const DefaultMaxDiffBytes = 256 << 10

// timeout bounds a single git invocation.
const timeout = 60 * time.Second

const headRef = "HEAD"

// Env is added to every git invocation (credential helpers etc. come from the environment / gitconfig).
var Env = []string{"GIT_TERMINAL_PROMPT=0", "GIT_OPTIONAL_LOCKS=0", "LC_ALL=C"}

// Error is a failed git command with its stderr.
type Error struct {
	Args   []string
	Stderr string
	Code   int
	err    error
}

func (e *Error) Error() string {
	return fmt.Sprintf("git %s: %s", strings.Join(e.Args, " "), strings.TrimSpace(e.Stderr))
}
func (e *Error) Unwrap() error { return e.err }

// Run runs git in dir and returns stdout.
func Run(ctx context.Context, dir string, args ...string) ([]byte, error) {
	return RunEnv(ctx, dir, nil, args...)
}

// RunEnv runs git with extra environment.
func RunEnv(ctx context.Context, dir string, env []string, args ...string) ([]byte, error) {
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	cmd := exec.CommandContext(ctx, "git", args...)
	cmd.Dir = dir
	cmd.Env = append(append(os.Environ(), Env...), env...)
	var stdout, stderr bytes.Buffer
	cmd.Stdout, cmd.Stderr = &stdout, &stderr
	err := proc.Run(cmd)
	if err != nil {
		code := -1
		var ee *exec.ExitError
		if errors.As(err, &ee) {
			code = ee.ExitCode()
		}
		return stdout.Bytes(), &Error{Args: args, Stderr: stderr.String(), Code: code, err: err}
	}
	return stdout.Bytes(), nil
}

func runString(ctx context.Context, dir string, args ...string) (string, error) {
	out, err := Run(ctx, dir, args...)
	return strings.TrimSpace(string(out)), err
}

// IsRepo reports whether dir is the top level of a git work tree (a checkout or a linked worktree).
func IsRepo(dir string) bool {
	st, err := os.Stat(filepath.Join(dir, ".git"))
	return err == nil && (st.IsDir() || st.Mode().IsRegular())
}

// Inspect describes a checkout.
func Inspect(ctx context.Context, dir string) (*devboxv1.Checkout, error) {
	return inspect(ctx, dir, true)
}

// inspect skips the status scan (and so Dirty) unless status is set.
func inspect(ctx context.Context, dir string, status bool) (*devboxv1.Checkout, error) {
	if !IsRepo(dir) {
		return nil, fmt.Errorf("%s is not a git checkout", dir)
	}
	c := &devboxv1.Checkout{Path: dir, Name: filepath.Base(dir)}
	c.RemoteUrl, _ = runString(ctx, dir, "remote", "get-url", "origin")
	c.HeadSha, _ = runString(ctx, dir, "rev-parse", "--verify", "-q", "HEAD")
	if b, err := runString(ctx, dir, "symbolic-ref", "--short", "-q", "HEAD"); err == nil {
		c.Branch = b
	}
	c.DefaultBranch = DefaultBranch(ctx, dir)
	if status {
		if st, err := Run(ctx, dir, "status", "--porcelain=v1", "-z", "--untracked-files=normal"); err == nil {
			c.Dirty = len(bytes.TrimSpace(st)) > 0
		}
	}
	if out, err := runString(ctx, dir, "rev-list", "--left-right", "--count", "HEAD...@{upstream}"); err == nil {
		if f := strings.Fields(out); len(f) == 2 {
			a, _ := strconv.Atoi(f[0])
			b, _ := strconv.Atoi(f[1])
			c.Ahead, c.Behind = int32(a), int32(b)
		}
	}
	return c, nil
}

// DefaultBranch is origin's default branch (origin/HEAD), falling back to main/master.
func DefaultBranch(ctx context.Context, dir string) string {
	if ref, err := runString(ctx, dir, "symbolic-ref", "-q", "--short", "refs/remotes/origin/HEAD"); err == nil && ref != "" {
		return strings.TrimPrefix(ref, "origin/")
	}
	for _, b := range []string{"main", "master"} {
		if _, err := Run(ctx, dir, "rev-parse", "--verify", "-q", "refs/remotes/origin/"+b); err == nil {
			return b
		}
	}
	for _, b := range []string{"main", "master"} {
		if _, err := Run(ctx, dir, "rev-parse", "--verify", "-q", "refs/heads/"+b); err == nil {
			return b
		}
	}
	return ""
}

// StatusEntry is one `git status --porcelain` entry.
type StatusEntry struct {
	XY      string
	Path    string
	OldPath string
}

// Status returns porcelain status entries (paths relative to the checkout).
func Status(ctx context.Context, dir string) ([]StatusEntry, error) {
	out, err := Run(ctx, dir, "status", "--porcelain=v1", "-z", "--untracked-files=all")
	if err != nil {
		return nil, err
	}
	var entries []StatusEntry
	parts := strings.Split(string(out), "\x00")
	for i := 0; i < len(parts); i++ {
		p := parts[i]
		if len(p) < 4 {
			continue
		}
		e := StatusEntry{XY: p[:2], Path: p[3:]}
		if e.XY[0] == 'R' || e.XY[0] == 'C' {
			if i+1 < len(parts) {
				e.OldPath = parts[i+1]
				i++
			}
		}
		entries = append(entries, e)
	}
	return entries, nil
}

// Base resolves a ChangesBase to a ref name and commit (EmptyTree when there is nothing to compare against).
// workTree reports whether the comparison includes the working tree (HEAD, DEFAULT_BRANCH) or is commit-to-commit
// (LAST_COMMIT).
func Base(ctx context.Context, dir string, base devboxv1.ChangesBase) (ref, sha string, workTree bool, err error) {
	head, _ := runString(ctx, dir, "rev-parse", "--verify", "-q", "HEAD")
	switch base {
	case devboxv1.ChangesBase_CHANGES_BASE_DEFAULT_BRANCH:
		def := DefaultBranch(ctx, dir)
		if def == "" {
			return "", "", false, errors.New("no default branch")
		}
		target := "refs/remotes/origin/" + def
		if _, err := Run(ctx, dir, "rev-parse", "--verify", "-q", target); err != nil {
			target = "refs/heads/" + def
		}
		if head == "" {
			return "origin/" + def, EmptyTree, true, nil
		}
		mb, err := runString(ctx, dir, "merge-base", "HEAD", target)
		if err != nil {
			return "", "", false, err
		}
		return "origin/" + def, mb, true, nil
	case devboxv1.ChangesBase_CHANGES_BASE_LAST_COMMIT:
		if head == "" {
			return headRef, EmptyTree, false, nil
		}
		parent, err := runString(ctx, dir, "rev-parse", "--verify", "-q", "HEAD~1")
		if err != nil || parent == "" {
			return "HEAD~1", EmptyTree, false, nil
		}
		return "HEAD~1", parent, false, nil
	default:
		if head == "" {
			return headRef, EmptyTree, true, nil
		}
		return headRef, head, true, nil
	}
}

// ChangesOptions select what Changes returns.
type ChangesOptions struct {
	Base         devboxv1.ChangesBase
	IncludeDiff  bool
	MaxDiffBytes int
	// Path restricts to one path (relative to the checkout).
	Path string
}

// Changes lists a checkout's changed files against a base, with line counts and optional diffs.
func Changes(ctx context.Context, dir string, opts ChangesOptions) (*devboxv1.RepositoryChanges, error) {
	if !IsRepo(dir) {
		return nil, fmt.Errorf("%s is not a git checkout", dir)
	}
	ref, sha, workTree, err := Base(ctx, dir, opts.Base)
	if err != nil {
		return nil, err
	}
	// a work-tree comparison runs status itself, which also tells whether the checkout is dirty
	co, err := inspect(ctx, dir, !workTree)
	if err != nil {
		return nil, err
	}
	rc := &devboxv1.RepositoryChanges{Checkout: co, BaseRef: ref, BaseSha: sha}
	if opts.MaxDiffBytes <= 0 {
		opts.MaxDiffBytes = DefaultMaxDiffBytes
	}
	rev := []string{sha}
	if !workTree {
		rev = append(rev, "HEAD")
		if co.GetHeadSha() == "" {
			rev = []string{EmptyTree, EmptyTree}
		}
	}
	pathspec := []string{"--"}
	if opts.Path != "" {
		pathspec = append(pathspec, opts.Path)
	}
	nameStatus, err := Run(ctx, dir, append(append([]string{"diff", "--no-color", "--no-ext-diff", "-M", "-z", "--name-status"}, rev...), pathspec...)...)
	if err != nil {
		return nil, err
	}
	numstat, err := Run(ctx, dir, append(append([]string{"diff", "--no-color", "--no-ext-diff", "-M", "-z", "--numstat"}, rev...), pathspec...)...)
	if err != nil {
		return nil, err
	}
	counts := parseNumstat(numstat)
	staged := map[string]bool{}
	var untracked []string
	if workTree {
		entries, err := Status(ctx, dir)
		if err != nil {
			return nil, err
		}
		co.Dirty = len(entries) > 0
		staged, untracked = splitStatus(entries, opts.Path)
	}
	tracked := parseNameStatus(nameStatus)
	var patches [][]byte
	if opts.IncludeDiff && len(tracked) > 0 {
		patches = filePatches(ctx, dir, rev, pathspec, tracked)
	}
	for i, fc := range tracked {
		if n, ok := counts[fc.GetPath()]; ok {
			fc.Additions, fc.Deletions, fc.Binary = n.add, n.del, n.binary
		}
		fc.Staged = staged[fc.GetPath()]
		if patches != nil {
			fc.Diff, fc.DiffTruncated = capDiff(patches[i], opts.MaxDiffBytes)
		}
		rc.Files = append(rc.Files, fc)
	}
	for _, p := range untracked {
		rc.Files = append(rc.Files, untrackedChange(dir, p, opts))
	}
	for _, f := range rc.Files {
		rc.Additions += f.GetAdditions()
		rc.Deletions += f.GetDeletions()
	}
	return rc, nil
}

// splitStatus picks the staged paths and the untracked paths under path (all of them when path is empty).
func splitStatus(entries []StatusEntry, path string) (staged map[string]bool, untracked []string) {
	staged = map[string]bool{}
	for _, e := range entries {
		if e.XY == "??" {
			if path == "" || e.Path == path || strings.HasPrefix(e.Path, strings.TrimSuffix(path, "/")+"/") {
				untracked = append(untracked, e.Path)
			}
			continue
		}
		if e.XY[0] != ' ' && e.XY[0] != '?' {
			staged[e.Path] = true
		}
	}
	return staged, untracked
}

// untrackedChange describes an untracked file, counting its lines as additions.
func untrackedChange(dir, p string, opts ChangesOptions) *devboxv1.FileChange {
	fc := &devboxv1.FileChange{Path: p, Status: devboxv1.ChangeStatus_CHANGE_STATUS_UNTRACKED}
	data, err := os.ReadFile(filepath.Join(dir, p))
	if err != nil {
		return fc
	}
	if bytes.IndexByte(data[:min(len(data), 8000)], 0) >= 0 {
		fc.Binary = true
	} else {
		fc.Additions = int32(bytes.Count(data, []byte("\n")))
		if len(data) > 0 && data[len(data)-1] != '\n' {
			fc.Additions++
		}
	}
	if opts.IncludeDiff {
		fc.Diff, fc.DiffTruncated = capDiff(untrackedPatch(p, data, fc.Binary), opts.MaxDiffBytes)
	}
	return fc
}

// filePatches diffs every tracked change in one git call and splits the patch per file. git emits file
// sections in the same order as --name-status; if the sections don't line up, each file is diffed separately.
func filePatches(ctx context.Context, dir string, rev, pathspec []string, files []*devboxv1.FileChange) [][]byte {
	out, err := Run(ctx, dir, append(append([]string{"-c", "core.quotePath=false", "diff", "--no-color", "--no-ext-diff", "-M"}, rev...), pathspec...)...)
	if err == nil {
		if sections := splitPatch(out); len(sections) == len(files) && sectionsMatch(sections, files) {
			return sections
		}
	}
	res := make([][]byte, len(files))
	for i, fc := range files {
		paths := []string{fc.GetPath()}
		if fc.GetOldPath() != "" {
			paths = append([]string{fc.GetOldPath()}, paths...)
		}
		if out, err := Run(ctx, dir, append(append(append([]string{"diff", "--no-color", "--no-ext-diff", "-M"}, rev...), "--"), paths...)...); err == nil {
			res[i] = out
		}
	}
	return res
}

var diffHeader = []byte("diff --git ")

func splitPatch(out []byte) [][]byte {
	var sections [][]byte
	start := -1
	for i := 0; i < len(out); {
		if bytes.HasPrefix(out[i:], diffHeader) {
			if start >= 0 {
				sections = append(sections, out[start:i])
			}
			start = i
		}
		next := bytes.IndexByte(out[i:], '\n')
		if next < 0 {
			break
		}
		i += next + 1
	}
	if start >= 0 {
		sections = append(sections, out[start:])
	}
	return sections
}

func sectionsMatch(sections [][]byte, files []*devboxv1.FileChange) bool {
	for i, fc := range files {
		header, _, _ := bytes.Cut(sections[i], []byte("\n"))
		if !bytes.HasSuffix(header, []byte(" b/"+fc.GetPath())) {
			return false
		}
	}
	return true
}

// untrackedPatch renders an untracked file as git would diff it against /dev/null.
func untrackedPatch(p string, data []byte, binary bool) []byte {
	var b bytes.Buffer
	fmt.Fprintf(&b, "diff --git a/%s b/%s\nnew file mode 100644\n", p, p)
	if binary {
		fmt.Fprintf(&b, "Binary files /dev/null and b/%s differ\n", p)
		return b.Bytes()
	}
	if len(data) == 0 {
		return b.Bytes()
	}
	lines := bytes.SplitAfter(data, []byte("\n"))
	if len(lines[len(lines)-1]) == 0 {
		lines = lines[:len(lines)-1]
	}
	fmt.Fprintf(&b, "--- /dev/null\n+++ b/%s\n@@ -0,0 +1", p)
	if len(lines) != 1 {
		fmt.Fprintf(&b, ",%d", len(lines))
	}
	b.WriteString(" @@\n")
	for _, l := range lines {
		b.WriteByte('+')
		b.Write(l)
	}
	if data[len(data)-1] != '\n' {
		b.WriteString("\n\\ No newline at end of file\n")
	}
	return b.Bytes()
}

func capDiff(out []byte, max int) (string, bool) {
	if len(out) <= max {
		return string(out), false
	}
	cut := out[:max]
	if i := bytes.LastIndexByte(cut, '\n'); i > 0 {
		cut = cut[:i+1]
	}
	return string(cut), true
}

type lineCounts struct {
	add, del int32
	binary   bool
}

// parseNumstat parses `git diff --numstat -z`. Renames are "A\tD\t\0old\0new\0".
func parseNumstat(out []byte) map[string]lineCounts {
	res := map[string]lineCounts{}
	parts := strings.Split(string(out), "\x00")
	for i := 0; i < len(parts); i++ {
		f := strings.SplitN(parts[i], "\t", 3)
		if len(f) != 3 {
			continue
		}
		path := f[2]
		if path == "" && i+2 < len(parts) {
			path = parts[i+2]
			i += 2
		}
		lc := lineCounts{}
		if f[0] == "-" && f[1] == "-" {
			lc.binary = true
		} else {
			a, _ := strconv.Atoi(f[0])
			d, _ := strconv.Atoi(f[1])
			lc.add, lc.del = int32(a), int32(d)
		}
		res[path] = lc
	}
	return res
}

// parseNameStatus parses `git diff --name-status -z`.
func parseNameStatus(out []byte) []*devboxv1.FileChange {
	var res []*devboxv1.FileChange
	parts := strings.Split(string(out), "\x00")
	for i := 0; i < len(parts); i++ {
		code := parts[i]
		if code == "" || i+1 >= len(parts) {
			continue
		}
		fc := &devboxv1.FileChange{}
		switch code[0] {
		case 'A':
			fc.Status = devboxv1.ChangeStatus_CHANGE_STATUS_ADDED
		case 'M':
			fc.Status = devboxv1.ChangeStatus_CHANGE_STATUS_MODIFIED
		case 'D':
			fc.Status = devboxv1.ChangeStatus_CHANGE_STATUS_DELETED
		case 'T':
			fc.Status = devboxv1.ChangeStatus_CHANGE_STATUS_TYPE_CHANGED
		case 'U':
			fc.Status = devboxv1.ChangeStatus_CHANGE_STATUS_CONFLICTED
		case 'R', 'C':
			fc.Status = devboxv1.ChangeStatus_CHANGE_STATUS_RENAMED
			if code[0] == 'C' {
				fc.Status = devboxv1.ChangeStatus_CHANGE_STATUS_COPIED
			}
			if i+2 < len(parts) {
				fc.OldPath, fc.Path = parts[i+1], parts[i+2]
				i += 2
				res = append(res, fc)
				continue
			}
		default:
			fc.Status = devboxv1.ChangeStatus_CHANGE_STATUS_MODIFIED
		}
		fc.Path = parts[i+1]
		i++
		res = append(res, fc)
	}
	return res
}

// IgnoredFilter returns which of the given paths (relative to dir) git ignores.
func IgnoredFilter(ctx context.Context, dir string, paths []string) map[string]bool {
	out := map[string]bool{}
	if len(paths) == 0 {
		return out
	}
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	cmd := exec.CommandContext(ctx, "git", "check-ignore", "-z", "--stdin")
	cmd.Dir = dir
	cmd.Env = append(os.Environ(), Env...)
	cmd.Stdin = strings.NewReader(strings.Join(paths, "\x00") + "\x00")
	var stdout bytes.Buffer
	cmd.Stdout = &stdout
	// Exit 1 means nothing is ignored.
	_ = proc.Run(cmd)
	for _, p := range strings.Split(stdout.String(), "\x00") {
		if p != "" {
			out[p] = true
		}
	}
	return out
}
