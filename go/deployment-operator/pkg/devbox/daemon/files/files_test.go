package files

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"google.golang.org/protobuf/proto"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/derr"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/internal/gittest"
)

type checkouts []string

func (c checkouts) Checkouts() []string                   { return c }
func (c checkouts) ThreadWorktrees(string) []string       { return nil }
func (c checkouts) AllThreadWorktrees() map[string]string { return nil }

func TestMultiRepoChanges(t *testing.T) {
	t.Setenv("GIT_CONFIG_GLOBAL", "/dev/null")
	home := t.TempDir()
	api := gittest.Repo(t, filepath.Join(home, "api"), map[string]string{"README.md": "one\ntwo\nthree\n", "old.txt": "x\n"})
	web := gittest.Repo(t, filepath.Join(home, "web"), map[string]string{"index.html": "<html>\n"})

	gittest.Write(t, api, map[string]string{"README.md": "one\nTWO\nthree\nfour\n"})
	gittest.Write(t, api, map[string]string{"staged.go": "package x\n"})
	gittest.Git(t, api, "add", "staged.go")
	if err := os.Remove(filepath.Join(api, "old.txt")); err != nil {
		t.Fatal(err)
	}
	gittest.Write(t, web, map[string]string{"new/page.html": "a\nb\n"})

	s := &Service{Home: home, Checkouts: checkouts{api, web}}
	resp, err := s.Changes(context.Background(), &devboxv1.GetChangesRequest{IncludeDiff: true})
	if err != nil {
		t.Fatal(err)
	}
	if len(resp.GetRepositories()) != 2 {
		t.Fatalf("repositories %v", resp.GetRepositories())
	}
	byRepo := map[string]map[string]*devboxv1.FileChange{}
	for _, rc := range resp.GetRepositories() {
		m := map[string]*devboxv1.FileChange{}
		for _, f := range rc.GetFiles() {
			m[f.GetPath()] = f
		}
		byRepo[rc.GetCheckout().GetName()] = m
		if rc.GetBaseSha() == "" {
			t.Errorf("%s: no base sha", rc.GetCheckout().GetName())
		}
	}
	readme := byRepo["api"]["README.md"]
	if readme == nil || readme.GetStatus() != devboxv1.ChangeStatus_CHANGE_STATUS_MODIFIED || readme.GetAdditions() != 2 ||
		readme.GetDeletions() != 1 || !strings.Contains(readme.GetDiff(), "+TWO") {
		t.Fatalf("README change %v", readme)
	}
	if f := byRepo["api"]["staged.go"]; f == nil || f.GetStatus() != devboxv1.ChangeStatus_CHANGE_STATUS_ADDED || !f.GetStaged() {
		t.Fatalf("staged file %v", f)
	}
	if f := byRepo["api"]["old.txt"]; f == nil || f.GetStatus() != devboxv1.ChangeStatus_CHANGE_STATUS_DELETED {
		t.Fatalf("deleted file %v", f)
	}
	page := byRepo["web"]["new/page.html"]
	if page == nil || page.GetStatus() != devboxv1.ChangeStatus_CHANGE_STATUS_UNTRACKED || page.GetAdditions() != 2 ||
		!strings.Contains(page.GetDiff(), "+a") {
		t.Fatalf("untracked file %v", page)
	}

	// Filter by repository and path.
	only, err := s.Changes(context.Background(), &devboxv1.GetChangesRequest{Repositories: []string{"web"}})
	if err != nil || len(only.GetRepositories()) != 1 || only.GetRepositories()[0].GetCheckout().GetName() != "web" {
		t.Fatalf("repository filter: %v %v", only, err)
	}
	if only.GetRepositories()[0].GetFiles()[0].GetDiff() != "" {
		t.Fatal("diff returned without include_diff")
	}
	scoped, err := s.Changes(context.Background(), &devboxv1.GetChangesRequest{Path: "~/api/README.md"})
	if err != nil || len(scoped.GetRepositories()) != 1 || len(scoped.GetRepositories()[0].GetFiles()) != 1 {
		t.Fatalf("path filter: %v %v", scoped, err)
	}

	// Diffs are capped.
	capped, _ := s.Changes(context.Background(), &devboxv1.GetChangesRequest{Repositories: []string{"api"}, IncludeDiff: true, MaxDiffBytes: 10})
	for _, f := range capped.GetRepositories()[0].GetFiles() {
		if len(f.GetDiff()) > 10 || (f.GetPath() == "README.md" && !f.GetDiffTruncated()) {
			t.Fatalf("diff not capped: %v", f)
		}
	}
}

func sum(b []byte) string {
	h := sha256.Sum256(b)
	return hex.EncodeToString(h[:])
}

func TestWriteCAS(t *testing.T) {
	home := t.TempDir()
	s := &Service{Home: home}
	ctx := context.Background()
	create := &devboxv1.WriteFileRequest{Path: "~/notes/a.txt", Content: []byte("v1"), ExpectedSha256: proto.String(""), CreateParents: true}
	resp, err := s.Write(ctx, create)
	if err != nil || resp.GetSha256() != sum([]byte("v1")) {
		t.Fatalf("create: %v %v", resp, err)
	}
	if _, err := s.Write(ctx, create); derr.Reason(err) != devboxv1.ErrorReason_ERROR_REASON_FILE_CONFLICT {
		t.Fatalf("must-not-exist write over an existing file: %v", err)
	}
	stale := &devboxv1.WriteFileRequest{Path: "~/notes/a.txt", Content: []byte("v2"), ExpectedSha256: proto.String(sum([]byte("other")))}
	if _, err := s.Write(ctx, stale); derr.Reason(err) != devboxv1.ErrorReason_ERROR_REASON_FILE_CONFLICT {
		t.Fatalf("stale write: %v", err)
	}
	ok := &devboxv1.WriteFileRequest{Path: "~/notes/a.txt", Content: []byte("v2"), ExpectedSha256: proto.String(sum([]byte("v1")))}
	if _, err := s.Write(ctx, ok); err != nil {
		t.Fatal(err)
	}
	if got, _ := os.ReadFile(filepath.Join(home, "notes", "a.txt")); string(got) != "v2" {
		t.Fatalf("content %q", got)
	}
	if _, err := s.Write(ctx, &devboxv1.WriteFileRequest{Path: "../escape.txt", Content: []byte("x")}); err == nil {
		t.Fatal("write outside home accepted")
	}
	read, err := s.Read(ctx, &devboxv1.ReadFileRequest{Path: "~/notes/a.txt"})
	if err != nil || string(read.GetContent()) != "v2" || read.GetSha256() != sum([]byte("v2")) {
		t.Fatalf("read: %v %v", read, err)
	}
}

func TestBranchDiffStatSizesTheBranchAgainstItsMergeBase(t *testing.T) {
	t.Setenv("GIT_CONFIG_GLOBAL", "/dev/null")
	home := t.TempDir()
	api := gittest.Repo(t, filepath.Join(home, "api"), map[string]string{"README.md": "one\ntwo\n"})
	gittest.Git(t, api, "remote", "add", "origin", "git@github.com:acme/api.git")
	base := strings.TrimSpace(gittest.Git(t, api, "rev-parse", "--abbrev-ref", "HEAD"))

	gittest.Git(t, api, "checkout", "-q", "-b", "feat/x")
	gittest.Write(t, api, map[string]string{"README.md": "one\nTWO\nthree\n", "new.go": "package x\n"})
	gittest.Git(t, api, "add", "-A")
	gittest.Git(t, api, "commit", "-q", "-m", "feat")
	// later work on the base branch isn't part of the PR
	gittest.Git(t, api, "checkout", "-q", base)
	gittest.Write(t, api, map[string]string{"other.txt": "a\nb\nc\n"})
	gittest.Git(t, api, "add", "-A")
	gittest.Git(t, api, "commit", "-q", "-m", "base")

	s := &Service{Home: home, Checkouts: checkouts{api}}
	for _, repo := range []string{"api", api, "https://github.com/acme/api"} {
		st, err := s.BranchDiffStat(context.Background(), &devboxv1.BranchDiffStatRequest{Repository: repo, Base: base, Head: "feat/x"})
		if err != nil {
			t.Fatalf("%s: %v", repo, err)
		}
		// README: +2 -1, new.go: +1
		if st.GetAdditions() != 3 || st.GetDeletions() != 1 || st.GetFiles() != 2 || st.GetHeadSha() == "" || st.GetBaseSha() == "" {
			t.Fatalf("%s: diff stat %v", repo, st)
		}
	}
	if _, err := s.BranchDiffStat(context.Background(), &devboxv1.BranchDiffStatRequest{Repository: "web", Base: base, Head: "feat/x"}); err == nil {
		t.Fatal("an unknown repository should fail")
	}
}
