package prebake

import (
	"encoding/json"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strings"

	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
)

const (
	ManifestFileName = "manifest.json"

	// EnvDir overrides the canonical prebake mount path. Used in tests.
	EnvDir = "PLRL_REPOSITORY_PREBAKE_DIR"
)

// Manifest is the repository-prebake image contract.
type Manifest struct {
	Version      int            `json:"version"`
	Repositories []ManifestRepo `json:"repositories"`
}

// ManifestRepo describes one precloned git repository in the image.
type ManifestRepo struct {
	URL           string `json:"url"`
	Path          string `json:"path"`
	DefaultBranch string `json:"defaultBranch,omitempty"`
}

// Repository is a resolved prebake entry with an absolute path on disk.
type Repository struct {
	URL           string
	Path          string
	Dir           string
	DefaultBranch string
}

// Dir returns the prebake mount path, honoring PLRL_REPOSITORY_PREBAKE_DIR.
func Dir() string {
	if dir := strings.TrimSpace(os.Getenv(EnvDir)); dir != "" {
		return dir
	}
	return common.AgentRunRepositoryPrebakeDir
}

// ManifestPath is the absolute path to manifest.json in the prebake directory.
func ManifestPath() string {
	return filepath.Join(Dir(), ManifestFileName)
}

// NormalizeGitURL matches Elixir Console.Deployments.Pr.Git.normalize_url/1:
// strip a trailing .git, then reduce git@host:path and https://host/path to host/path.
func NormalizeGitURL(raw string) string {
	raw = strings.TrimSpace(raw)
	raw = strings.TrimSuffix(raw, ".git")
	raw = strings.TrimRight(raw, "/")

	// SCP-style SSH: [user@]host:path (covers git@github.com:org/repo).
	if !strings.Contains(raw, "://") {
		if userHost, repoPath, ok := strings.Cut(raw, ":"); ok && repoPath != "" && !strings.HasPrefix(repoPath, "//") {
			host := userHost
			if _, h, found := strings.Cut(userHost, "@"); found {
				host = h
			}
			if host != "" {
				return host + "/" + strings.TrimPrefix(repoPath, "/")
			}
		}
	}

	parsed, err := url.Parse(raw)
	if err != nil || parsed.Hostname() == "" {
		return raw
	}
	return parsed.Hostname() + strings.TrimSuffix(parsed.Path, "/")
}

// Load reads manifest.json from the given prebake directory.
// A missing file is not an error: Load returns (nil, nil).
func Load(dir string) (*Manifest, error) {
	path := filepath.Join(dir, ManifestFileName)
	data, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("read prebake manifest %q: %w", path, err)
	}

	var manifest Manifest
	if err := json.Unmarshal(data, &manifest); err != nil {
		return nil, fmt.Errorf("parse prebake manifest %q: %w", path, err)
	}
	return &manifest, nil
}

// ResolvePath joins root with a relative repo path and rejects escapes.
func ResolvePath(root, rel string) (string, error) {
	rel = strings.TrimSpace(rel)
	if rel == "" || rel == ManifestFileName {
		return "", fmt.Errorf("invalid prebake repository path %q", rel)
	}
	if filepath.IsAbs(rel) {
		return "", fmt.Errorf("prebake repository path must be relative: %q", rel)
	}

	clean := filepath.Clean(rel)
	if clean == "." || clean == ".." || strings.HasPrefix(clean, ".."+string(os.PathSeparator)) {
		return "", fmt.Errorf("invalid prebake repository path %q", rel)
	}

	full := filepath.Join(root, clean)
	relOut, err := filepath.Rel(root, full)
	if err != nil || relOut == ".." || strings.HasPrefix(relOut, ".."+string(os.PathSeparator)) {
		return "", fmt.Errorf("prebake repository path escapes %q: %q", root, rel)
	}
	return full, nil
}

// Lookup finds a prebaked clone matching repositoryURL. Missing manifest or
// no match returns (nil, nil).
func Lookup(repositoryURL string) (*Repository, error) {
	root := Dir()
	manifest, err := Load(root)
	if err != nil || manifest == nil {
		return nil, err
	}

	want := NormalizeGitURL(repositoryURL)
	for _, entry := range manifest.Repositories {
		if NormalizeGitURL(entry.URL) != want {
			continue
		}
		full, err := ResolvePath(root, entry.Path)
		if err != nil {
			return nil, err
		}
		if _, err := os.Stat(filepath.Join(full, ".git")); err != nil {
			return nil, nil
		}
		return &Repository{
			URL:           entry.URL,
			Path:          entry.Path,
			Dir:           full,
			DefaultBranch: entry.DefaultBranch,
		}, nil
	}
	return nil, nil
}

// List returns prebaked repositories that exist on disk.
func List() ([]Repository, error) {
	root := Dir()
	manifest, err := Load(root)
	if err != nil || manifest == nil {
		return nil, err
	}

	var out []Repository
	for _, entry := range manifest.Repositories {
		full, err := ResolvePath(root, entry.Path)
		if err != nil {
			continue
		}
		if _, err := os.Stat(full); err != nil {
			continue
		}
		out = append(out, Repository{
			URL:           entry.URL,
			Path:          entry.Path,
			Dir:           full,
			DefaultBranch: entry.DefaultBranch,
		})
	}
	return out, nil
}
