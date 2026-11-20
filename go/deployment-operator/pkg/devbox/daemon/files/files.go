// Package files serves the filesystem and changes RPCs (DBX-43): listing, stat, reads with a content hash,
// compare-and-swap writes, recursive watches, and git changes grouped by checkout.
package files

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"io"
	"io/fs"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"unicode/utf8"

	"google.golang.org/grpc/codes"
	"google.golang.org/protobuf/types/known/timestamppb"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/derr"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/gitutil"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/internal/fsutil"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/egress/scmpath"
)

const (
	// DefaultReadLimit is ReadFile's default byte limit.
	DefaultReadLimit = 1 << 20
	// MaxReadLimit caps ReadFile.
	MaxReadLimit = 16 << 20
	// MaxListEntries caps ListFiles.
	MaxListEntries = 5000
	// MaxWriteBytes caps WriteFile.
	MaxWriteBytes = 32 << 20
)

// Checkouts lists the checkouts under the home directory and, for a thread, its worktrees.
type Checkouts interface {
	// Checkouts returns the main checkouts' absolute paths.
	Checkouts() []string
	// ThreadWorktrees returns a thread's worktree paths.
	ThreadWorktrees(threadID string) []string
}

// Service implements the filesystem RPCs.
type Service struct {
	Home      string
	Checkouts Checkouts
	// ChangesCache, when set, serves GetChanges from checkouts' background-maintained changes.
	ChangesCache *ChangesCache

	writeMu sync.Mutex
}

func invalid(msg string) error {
	return derr.New(codes.InvalidArgument, devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED, msg, nil)
}

func notFound(p string) error {
	return derr.New(codes.NotFound, devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED, "no such file: "+p, map[string]string{"path": p})
}

func ioError(err error, p string) error {
	if errors.Is(err, fs.ErrNotExist) {
		return notFound(p)
	}
	if errors.Is(err, fs.ErrPermission) {
		return derr.New(codes.PermissionDenied, devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED, err.Error(), map[string]string{"path": p})
	}
	return derr.New(codes.Internal, devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED, err.Error(), map[string]string{"path": p})
}

// Resolve maps a request path to an absolute path inside the home directory.
func (s *Service) Resolve(p string) (string, error) {
	abs, err := fsutil.ResolveWithin(s.Home, p)
	if err != nil {
		return "", invalid(err.Error())
	}
	return abs, nil
}

// repoOf returns the checkout containing abs, if any.
func (s *Service) repoOf(abs string) string {
	if s.Checkouts == nil {
		return ""
	}
	best := ""
	for _, c := range s.Checkouts.Checkouts() {
		if fsutil.Within(c, abs) && len(c) > len(best) {
			best = c
		}
	}
	if best == "" {
		for _, base := range []string{filepath.Join(s.Home, ".threads")} {
			if fsutil.Within(base, abs) {
				rel, _ := filepath.Rel(base, abs)
				parts := strings.SplitN(rel, string(filepath.Separator), 3)
				if len(parts) >= 2 {
					cand := filepath.Join(base, parts[0], parts[1])
					if gitutil.IsRepo(cand) {
						best = cand
					}
				}
			}
		}
	}
	return best
}

func entryOf(abs string, info fs.FileInfo) *devboxv1.FileEntry {
	e := &devboxv1.FileEntry{
		Path: abs, Name: filepath.Base(abs), Size: info.Size(), Mode: uint32(info.Mode().Perm()),
		ModifiedAt: timestamppb.New(info.ModTime()),
	}
	switch {
	case info.Mode()&fs.ModeSymlink != 0:
		e.Type = devboxv1.FileType_FILE_TYPE_SYMLINK
		e.SymlinkTarget, _ = os.Readlink(abs)
	case info.IsDir():
		e.Type = devboxv1.FileType_FILE_TYPE_DIRECTORY
	case info.Mode().IsRegular():
		e.Type = devboxv1.FileType_FILE_TYPE_FILE
	default:
		e.Type = devboxv1.FileType_FILE_TYPE_OTHER
	}
	return e
}

// statusIndex caches porcelain status per checkout for one request.
type statusIndex struct {
	ctx   context.Context
	cache map[string]map[string]string
}

func (si *statusIndex) annotate(s *Service, e *devboxv1.FileEntry) {
	repo := s.repoOf(e.GetPath())
	if repo == "" {
		return
	}
	e.Repository = filepath.Base(repo)
	st, ok := si.cache[repo]
	if !ok {
		st = map[string]string{}
		if entries, err := gitutil.Status(si.ctx, repo); err == nil {
			for _, en := range entries {
				st[en.Path] = en.XY
			}
		}
		si.cache[repo] = st
	}
	rel, err := filepath.Rel(repo, e.GetPath())
	if err == nil {
		e.GitStatus = st[filepath.ToSlash(rel)]
	}
}

// List implements ListFiles.
func (s *Service) List(ctx context.Context, req *devboxv1.ListFilesRequest) (*devboxv1.ListFilesResponse, error) {
	root, err := s.Resolve(req.GetPath())
	if err != nil {
		return nil, err
	}
	st, err := os.Stat(root)
	if err != nil {
		return nil, ioError(err, req.GetPath())
	}
	if !st.IsDir() {
		return nil, invalid(req.GetPath() + " is not a directory")
	}
	depth := int(req.GetDepth())
	if depth <= 0 {
		depth = 1
	}
	limit := int(req.GetLimit())
	if limit <= 0 || limit > MaxListEntries {
		limit = MaxListEntries
	}
	resp := &devboxv1.ListFilesResponse{}
	si := &statusIndex{ctx: ctx, cache: map[string]map[string]string{}}
	var walk func(dir string, level int) error
	walk = func(dir string, level int) error {
		des, err := os.ReadDir(dir)
		if err != nil {
			return err
		}
		names := make([]string, 0, len(des))
		for _, de := range des {
			if !req.GetIncludeHidden() && strings.HasPrefix(de.Name(), ".") {
				continue
			}
			if de.Name() == ".git" {
				continue
			}
			names = append(names, de.Name())
		}
		if req.GetRespectGitignore() {
			if repo := s.repoOf(dir); repo != "" {
				rels := make([]string, 0, len(names))
				for _, n := range names {
					rel, _ := filepath.Rel(repo, filepath.Join(dir, n))
					rels = append(rels, filepath.ToSlash(rel))
				}
				ignored := gitutil.IgnoredFilter(ctx, repo, rels)
				kept := names[:0]
				for i, n := range names {
					if !ignored[rels[i]] {
						kept = append(kept, n)
					}
				}
				names = kept
			}
		}
		sort.Strings(names)
		for _, n := range names {
			if len(resp.Entries) >= limit {
				resp.Truncated = true
				return nil
			}
			abs := filepath.Join(dir, n)
			info, err := os.Lstat(abs)
			if err != nil {
				continue
			}
			e := entryOf(abs, info)
			si.annotate(s, e)
			resp.Entries = append(resp.Entries, e)
			if info.IsDir() && level < depth {
				if err := walk(abs, level+1); err != nil && !errors.Is(err, fs.ErrPermission) {
					return err
				}
				if resp.Truncated {
					return nil
				}
			}
		}
		return nil
	}
	if err := walk(root, 1); err != nil {
		return nil, ioError(err, req.GetPath())
	}
	return resp, nil
}

// Stat implements StatFile.
func (s *Service) Stat(ctx context.Context, p string) (*devboxv1.FileEntry, error) {
	abs, err := s.Resolve(p)
	if err != nil {
		return nil, err
	}
	info, err := os.Lstat(abs)
	if err != nil {
		return nil, ioError(err, p)
	}
	e := entryOf(abs, info)
	(&statusIndex{ctx: ctx, cache: map[string]map[string]string{}}).annotate(s, e)
	return e, nil
}

// HashFile returns the hex sha256 of a file.
func HashFile(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()
	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

// Read implements ReadFile.
func (s *Service) Read(ctx context.Context, req *devboxv1.ReadFileRequest) (*devboxv1.ReadFileResponse, error) {
	abs, err := s.Resolve(req.GetPath())
	if err != nil {
		return nil, err
	}
	info, err := os.Stat(abs)
	if err != nil {
		return nil, ioError(err, req.GetPath())
	}
	if info.IsDir() {
		return nil, invalid(req.GetPath() + " is a directory")
	}
	limit := req.GetLimit()
	if limit <= 0 {
		limit = DefaultReadLimit
	}
	if limit > MaxReadLimit {
		limit = MaxReadLimit
	}
	f, err := os.Open(abs)
	if err != nil {
		return nil, ioError(err, req.GetPath())
	}
	defer f.Close()
	h := sha256.New()
	var content []byte
	off := req.GetOffset()
	if off < 0 {
		off = 0
	}
	buf := make([]byte, 64<<10)
	var pos int64
	for {
		n, rerr := f.Read(buf)
		if n > 0 {
			chunk := buf[:n]
			h.Write(chunk)
			start, end := pos, pos+int64(n)
			if end > off && int64(len(content)) < limit {
				from := max(off-start, 0)
				take := chunk[from:]
				if room := limit - int64(len(content)); int64(len(take)) > room {
					take = take[:room]
				}
				content = append(content, take...)
			}
			pos = end
		}
		if rerr == io.EOF {
			break
		}
		if rerr != nil {
			return nil, ioError(rerr, req.GetPath())
		}
	}
	e := entryOf(abs, info)
	(&statusIndex{ctx: ctx, cache: map[string]map[string]string{}}).annotate(s, e)
	resp := &devboxv1.ReadFileResponse{
		Entry: e, Content: content, Sha256: hex.EncodeToString(h.Sum(nil)),
		Truncated: off+int64(len(content)) < pos,
	}
	resp.MimeType, resp.Binary = detect(abs, content)
	return resp, nil
}

func detect(path string, sample []byte) (string, bool) {
	head := sample[:min(len(sample), 8000)]
	binary := strings.IndexByte(string(head), 0) >= 0 || (!utf8.Valid(head) && !utf8.Valid(trimPartialRune(head)))
	if t := mime.TypeByExtension(filepath.Ext(path)); t != "" {
		return t, binary
	}
	if binary {
		return http.DetectContentType(head), true
	}
	return "text/plain; charset=utf-8", false
}

// trimPartialRune drops an incomplete UTF-8 sequence cut off at the end of a sample.
func trimPartialRune(b []byte) []byte {
	for i := 0; i < 3 && len(b) > 0; i++ {
		r, _ := utf8.DecodeLastRune(b)
		if r != utf8.RuneError {
			break
		}
		b = b[:len(b)-1]
	}
	return b
}

// Write implements WriteFile with compare-and-swap on the current content's sha256.
func (s *Service) Write(ctx context.Context, req *devboxv1.WriteFileRequest) (*devboxv1.WriteFileResponse, error) {
	if len(req.GetContent()) > MaxWriteBytes {
		return nil, invalid("content too large")
	}
	abs, err := s.Resolve(req.GetPath())
	if err != nil {
		return nil, err
	}
	s.writeMu.Lock()
	defer s.writeMu.Unlock()
	info, statErr := os.Stat(abs)
	exists := statErr == nil
	if exists && info.IsDir() {
		return nil, invalid(req.GetPath() + " is a directory")
	}
	if req.ExpectedSha256 != nil {
		want := req.GetExpectedSha256()
		if want == "" {
			if exists {
				return nil, derr.FileConflict(req.GetPath())
			}
		} else {
			if !exists {
				return nil, derr.FileConflict(req.GetPath())
			}
			cur, err := HashFile(abs)
			if err != nil {
				return nil, ioError(err, req.GetPath())
			}
			if !strings.EqualFold(cur, want) {
				return nil, derr.FileConflict(req.GetPath())
			}
		}
	}
	mode := fs.FileMode(req.GetMode()) & fs.ModePerm
	if mode == 0 {
		mode = 0o644
		if exists {
			mode = info.Mode().Perm()
		}
	}
	dir := filepath.Dir(abs)
	if _, err := os.Stat(dir); err != nil {
		if !req.GetCreateParents() {
			return nil, ioError(err, filepath.Dir(req.GetPath()))
		}
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return nil, ioError(err, req.GetPath())
		}
	}
	if err := fsutil.WriteFileAtomic(abs, req.GetContent(), mode); err != nil {
		return nil, ioError(err, req.GetPath())
	}
	info, err = os.Stat(abs)
	if err != nil {
		return nil, ioError(err, req.GetPath())
	}
	sum := sha256.Sum256(req.GetContent())
	return &devboxv1.WriteFileResponse{Entry: entryOf(abs, info), Sha256: hex.EncodeToString(sum[:])}, nil
}

// Changes implements GetChanges: one entry per checkout (or per thread worktree).
func (s *Service) Changes(ctx context.Context, req *devboxv1.GetChangesRequest) (*devboxv1.GetChangesResponse, error) {
	var repos []string
	if s.Checkouts != nil {
		if req.GetThreadId() != "" {
			repos = s.Checkouts.ThreadWorktrees(req.GetThreadId())
		} else {
			repos = s.Checkouts.Checkouts()
		}
	}
	if len(req.GetRepositories()) > 0 {
		want := map[string]bool{}
		for _, r := range req.GetRepositories() {
			want[r] = true
		}
		kept := repos[:0:0]
		for _, r := range repos {
			if want[filepath.Base(r)] {
				kept = append(kept, r)
			}
		}
		repos = kept
	}
	var pathAbs string
	if req.GetPath() != "" {
		p, err := s.Resolve(req.GetPath())
		if err != nil {
			return nil, err
		}
		pathAbs = p
	}
	if pathAbs != "" {
		kept := repos[:0:0]
		for _, r := range repos {
			if fsutil.Within(r, pathAbs) {
				kept = append(kept, r)
			}
		}
		repos = kept
	}

	results := make([]*devboxv1.RepositoryChanges, len(repos))
	var wg sync.WaitGroup
	sem := make(chan struct{}, changesConcurrency)
	for i, repo := range repos {
		wg.Add(1)
		sem <- struct{}{}
		go func() {
			defer func() { <-sem; wg.Done() }()
			rc, err := s.repoChanges(ctx, repo, req, pathAbs)
			if err != nil {
				rc = &devboxv1.RepositoryChanges{Checkout: &devboxv1.Checkout{Path: repo, Name: filepath.Base(repo)}}
			}
			if req.GetThreadId() != "" {
				rc.Checkout.WorktreeThreadId = req.GetThreadId()
			}
			results[i] = rc
		}()
	}
	wg.Wait()
	return &devboxv1.GetChangesResponse{Repositories: results}, nil
}

// changesConcurrency bounds the checkouts GetChanges inspects at once.
const changesConcurrency = 8

func (s *Service) repoChanges(ctx context.Context, repo string, req *devboxv1.GetChangesRequest, pathAbs string) (*devboxv1.RepositoryChanges, error) {
	opts := gitutil.ChangesOptions{Base: req.GetBase(), IncludeDiff: req.GetIncludeDiff(), MaxDiffBytes: int(req.GetMaxDiffBytes())}
	if pathAbs != "" {
		if rel, _ := filepath.Rel(repo, pathAbs); rel != "." {
			opts.Path = filepath.ToSlash(rel)
		}
	}
	// path-scoped lookups are cheap and rare; whole-checkout views are what the cache keeps
	if s.ChangesCache == nil || opts.Path != "" {
		return gitutil.Changes(ctx, repo, opts)
	}
	return s.ChangesCache.Get(ctx, changesKey{repo: repo, base: opts.Base, diff: opts.IncludeDiff, maxDiff: opts.MaxDiffBytes})
}

// BranchDiffStat sizes a pull request's branch in the checkout req.Repository names, matched by name, path or remote.
func (s *Service) BranchDiffStat(ctx context.Context, req *devboxv1.BranchDiffStatRequest) (*devboxv1.BranchDiffStatResponse, error) {
	if req.GetRepository() == "" || req.GetBase() == "" || req.GetHead() == "" {
		return nil, invalid("repository, base and head are required")
	}
	dir := s.checkoutFor(ctx, req.GetRepository())
	if dir == "" {
		return nil, derr.New(codes.NotFound, devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED,
			"no checkout of "+req.GetRepository(), map[string]string{"repository": req.GetRepository()})
	}
	st, err := gitutil.BranchDiffStat(ctx, dir, req.GetBase(), req.GetHead())
	if err != nil {
		return nil, derr.New(codes.FailedPrecondition, devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED, err.Error(), nil)
	}
	return &devboxv1.BranchDiffStatResponse{
		Additions: int32(st.Additions),
		Deletions: int32(st.Deletions),
		Files:     int32(st.Files),
		BaseSha:   st.BaseSHA,
		HeadSha:   st.HeadSHA,
	}, nil
}

func (s *Service) checkoutFor(ctx context.Context, repository string) string {
	if s.Checkouts == nil {
		return ""
	}
	repos := s.Checkouts.Checkouts()
	want := strings.TrimSuffix(repository, "/")
	for _, r := range repos {
		if r == want || filepath.Base(r) == want {
			return r
		}
	}
	id := scmpath.Normalize(repository)
	for _, r := range repos {
		if remote, err := gitutil.Run(ctx, r, "remote", "get-url", "origin"); err == nil && scmpath.Normalize(string(remote)) == id {
			return r
		}
	}
	return ""
}
