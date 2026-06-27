package environment

import (
	"os"
	"path"
	"strings"
	"testing"
)

func TestConfigureCodebaseMemoryGitExclude(t *testing.T) {
	repoDir := t.TempDir()
	excludePath := path.Join(repoDir, ".git", "info", "exclude")

	if err := configureCodebaseMemoryGitExclude(repoDir); err != nil {
		t.Fatalf("configureCodebaseMemoryGitExclude() failed: %v", err)
	}
	if err := configureCodebaseMemoryGitExclude(repoDir); err != nil {
		t.Fatalf("configureCodebaseMemoryGitExclude() second call failed: %v", err)
	}

	contents, err := os.ReadFile(excludePath)
	if err != nil {
		t.Fatalf("failed to read exclude file: %v", err)
	}

	if count := strings.Count(string(contents), codebaseMemoryGitExcludePattern); count != 1 {
		t.Fatalf("expected one %q entry, got %d in %q", codebaseMemoryGitExcludePattern, count, contents)
	}
}
