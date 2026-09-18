package prebake

import (
	"fmt"
	"path/filepath"
	"strings"
)

const ManifestFileName = "manifest.json"

// validatePath rejects empty, absolute, or escaping relative paths. Same rules
// as the agent-run harness ResolvePath.
func validatePath(rel string) error {
	rel = strings.TrimSpace(rel)
	if rel == "" || rel == ManifestFileName {
		return fmt.Errorf("invalid prebake repository path %q", rel)
	}
	if filepath.IsAbs(rel) {
		return fmt.Errorf("prebake repository path must be relative: %q", rel)
	}

	sep := string(filepath.Separator)
	clean := filepath.Clean(rel)
	if clean == "." || clean == ".." || strings.HasPrefix(clean, ".."+sep) {
		return fmt.Errorf("invalid prebake repository path %q", rel)
	}
	for _, comp := range strings.Split(clean, sep) {
		if comp == "" || comp == "." || comp == ".." {
			return fmt.Errorf("invalid prebake repository path %q", rel)
		}
	}
	return nil
}

// resolveDest joins dest with a validated relative path and rejects escapes.
func resolveDest(dest, rel string) (string, error) {
	if err := validatePath(rel); err != nil {
		return "", err
	}
	full := filepath.Join(dest, rel)
	relOut, err := filepath.Rel(dest, full)
	if err != nil || relOut == ".." || strings.HasPrefix(relOut, ".."+string(filepath.Separator)) {
		return "", fmt.Errorf("prebake repository path escapes %q: %q", dest, rel)
	}
	return full, nil
}
