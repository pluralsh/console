package prebake

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestNormalizeGitURL(t *testing.T) {
	scp := "git@" + "github.com" + ":pluralsh/console"
	tests := []struct {
		in, want string
	}{
		{"https://github.com/pluralsh/console.git", "github.com/pluralsh/console"},
		{"https://github.com/pluralsh/console", "github.com/pluralsh/console"},
		{"https://github.com/pluralsh/console/", "github.com/pluralsh/console"},
		{scp + ".git", "github.com/pluralsh/console"},
		{scp, "github.com/pluralsh/console"},
		{"ssh://git@github.com/pluralsh/console.git", "github.com/pluralsh/console"},
		{"https://user:token@github.com/pluralsh/console.git", "github.com/pluralsh/console"},
		{"  https://github.com/pluralsh/console.git  ", "github.com/pluralsh/console"},
	}
	for _, tc := range tests {
		if got := NormalizeGitURL(tc.in); got != tc.want {
			t.Errorf("NormalizeGitURL(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

func TestLookupMatchesNormalizedURL(t *testing.T) {
	root := t.TempDir()
	repoDir := filepath.Join(root, "console")
	if err := os.MkdirAll(filepath.Join(repoDir, ".git"), 0755); err != nil {
		t.Fatal(err)
	}
	writeManifest(t, root, Manifest{
		Version: 1,
		Repositories: []ManifestRepo{{
			URL:  "https://github.com/pluralsh/console.git",
			Path: "console",
		}},
	})
	t.Setenv(EnvDir, root)

	got, err := Lookup("git@" + "github.com" + ":pluralsh/console.git")
	if err != nil {
		t.Fatalf("Lookup() error: %v", err)
	}
	if got == nil {
		t.Fatal("Lookup() returned nil, want match")
	}
	if got.Dir != repoDir {
		t.Fatalf("Lookup() dir = %q, want %q", got.Dir, repoDir)
	}
}

func TestLookupUnknownURL(t *testing.T) {
	root := t.TempDir()
	writeManifest(t, root, Manifest{
		Version: 1,
		Repositories: []ManifestRepo{{
			URL:  "https://github.com/pluralsh/console.git",
			Path: "console",
		}},
	})
	t.Setenv(EnvDir, root)

	got, err := Lookup("https://github.com/pluralsh/plural.git")
	if err != nil {
		t.Fatalf("Lookup() error: %v", err)
	}
	if got != nil {
		t.Fatalf("Lookup() = %+v, want nil", got)
	}
}

func TestLookupMissingManifest(t *testing.T) {
	t.Setenv(EnvDir, t.TempDir())
	got, err := Lookup("https://github.com/pluralsh/console.git")
	if err != nil {
		t.Fatalf("Lookup() error: %v", err)
	}
	if got != nil {
		t.Fatalf("Lookup() = %+v, want nil", got)
	}
}

func TestResolvePathRejectsEscape(t *testing.T) {
	root := t.TempDir()
	if _, err := ResolvePath(root, "../escape"); err == nil {
		t.Fatal("expected error for .. path")
	}
	if _, err := ResolvePath(root, "/abs"); err == nil {
		t.Fatal("expected error for absolute path")
	}
	if _, err := ResolvePath(root, "manifest.json"); err == nil {
		t.Fatal("expected error for manifest.json path")
	}
}

func writeManifest(t *testing.T, dir string, manifest Manifest) {
	t.Helper()
	data, err := json.Marshal(manifest)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, ManifestFileName), data, 0644); err != nil {
		t.Fatal(err)
	}
}
