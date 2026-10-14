package artifacts

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
	"github.com/pluralsh/console/go/polly/fs"
)

// RestoredSession is the result of downloading and unpacking a prior agent
// session archive.
type RestoredSession struct {
	Manifest   *SessionManifest
	ExtractDir string
}

// DownloadAndExtractSession downloads a gzipped session tarball from sessionURL
// and unpacks it into a temporary directory under workDir. The caller owns
// ExtractDir and should remove it when finished.
func DownloadAndExtractSession(ctx context.Context, sessionURL, workDir string) (*RestoredSession, error) {
	sessionURL = strings.TrimSpace(sessionURL)
	if sessionURL == "" {
		return nil, fmt.Errorf("session url is empty")
	}
	if workDir == "" {
		return nil, fmt.Errorf("work directory is empty")
	}
	if err := os.MkdirAll(workDir, 0755); err != nil {
		return nil, fmt.Errorf("create work directory: %w", err)
	}

	extractDir, err := os.MkdirTemp(workDir, "agent-session-restore-*")
	if err != nil {
		return nil, fmt.Errorf("create session restore directory: %w", err)
	}

	if err := downloadAndUntar(ctx, sessionURL, extractDir); err != nil {
		_ = os.RemoveAll(extractDir)
		return nil, err
	}

	manifest, err := ReadSessionManifest(extractDir)
	if err != nil {
		_ = os.RemoveAll(extractDir)
		return nil, err
	}

	klog.V(log.LogLevelInfo).InfoS(
		"restored agent session archive",
		"agentRunID", manifest.AgentRunID,
		"provider", manifest.Provider,
		"sessionID", manifest.Session.ID,
		"archivePath", manifest.Session.ArchivePath,
		"extractDir", extractDir,
	)

	return &RestoredSession{Manifest: manifest, ExtractDir: extractDir}, nil
}

// ReadSessionManifest loads manifest.json from an extracted session archive.
func ReadSessionManifest(extractDir string) (*SessionManifest, error) {
	path := filepath.Join(extractDir, "manifest.json")
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read session manifest: %w", err)
	}

	var manifest SessionManifest
	if err := json.Unmarshal(data, &manifest); err != nil {
		return nil, fmt.Errorf("parse session manifest: %w", err)
	}
	return &manifest, nil
}

// RestoreArchiveTree copies the archived session tree from extractDir into
// destination. Archive entries are stored under ArchivePath; destination should
// be the provider-native directory that ArchivePath maps to (for example
// workDir/.claude/projects when ArchivePath is "projects").
func RestoreArchiveTree(ctx context.Context, extractDir, archivePath, destination string) error {
	archivePath = filepath.ToSlash(strings.TrimPrefix(filepath.Clean(archivePath), string(filepath.Separator)))
	if archivePath == "" || archivePath == "." {
		return fmt.Errorf("session archive path is empty")
	}
	if destination == "" {
		return fmt.Errorf("session restore destination is empty")
	}

	source := filepath.Join(extractDir, filepath.FromSlash(archivePath))
	found, err := StageSessionDirectory(ctx, source, destination)
	if err != nil {
		return fmt.Errorf("restore session archive %q: %w", archivePath, err)
	}
	if !found {
		return fmt.Errorf("session archive path %q not found in extract dir", archivePath)
	}
	return nil
}

func downloadAndUntar(ctx context.Context, sessionURL, destination string) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, sessionURL, nil)
	if err != nil {
		return fmt.Errorf("create session download request: %w", err)
	}

	client := &http.Client{Timeout: 5 * time.Minute}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("download session archive: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
		return fmt.Errorf("download session archive: status %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	if err := fs.Untar(destination, resp.Body); err != nil {
		return fmt.Errorf("unpack session archive: %w", err)
	}
	return nil
}
