package prebake

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

const manifestVersion = 1

// Manifest is the repository-prebake image contract consumed by the harness.
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

func writeManifest(dest string, repos []ManifestRepo) error {
	manifest := Manifest{Version: manifestVersion, Repositories: repos}
	data, err := json.MarshalIndent(manifest, "", "  ")
	if err != nil {
		return fmt.Errorf("encode manifest: %w", err)
	}
	data = append(data, '\n')
	path := filepath.Join(dest, ManifestFileName)
	if err := os.WriteFile(path, data, 0o644); err != nil {
		return fmt.Errorf("write %s: %w", path, err)
	}
	return nil
}
