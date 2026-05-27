package v1

import (
	"archive/tar"
	"compress/gzip"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	stdexec "os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/samber/lo"

	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/environment"
)

const (
	uploadsDirName = "uploads"
	sessionTarName = "agent-session.tar.gz"
	patchFileName  = "changes.patch"
)

type UploadArtifacts struct {
	SessionPath string
	PatchPath   string
}

type SessionSource struct {
	Path        string
	ArchivePath string
}

type SessionManifest struct {
	Version    int             `json:"version"`
	AgentRunID string          `json:"agentRunId"`
	Provider   string          `json:"provider"`
	Repository string          `json:"repository"`
	Branch     string          `json:"branch,omitempty"`
	CreatedAt  time.Time       `json:"createdAt"`
	Session    SessionMetadata `json:"session"`
	Resume     ResumeManifest  `json:"resume"`
}

type ResumeManifest struct {
	Env     map[string]string `json:"env,omitempty"`
	Command []string          `json:"command,omitempty"`
}

type SessionMetadata struct {
	ID          string `json:"id,omitempty"`
	Path        string `json:"path,omitempty"`
	ArchivePath string `json:"archivePath,omitempty"`
}

type BuildArtifactsOptions struct {
	Provider  string
	Source    SessionSource
	SessionID string
	ResumeEnv map[string]string
	Command   []string
}

func (in DefaultTool) BuildUploadArtifacts(_ context.Context, opts BuildArtifactsOptions) (*UploadArtifacts, error) {
	if in.Config.Run == nil {
		return nil, fmt.Errorf("agent run is not set")
	}

	uploadsDir := filepath.Join(in.Config.WorkDir, uploadsDirName)
	if err := os.MkdirAll(uploadsDir, 0755); err != nil {
		return nil, fmt.Errorf("create uploads dir: %w", err)
	}

	manifest, source, err := in.sessionManifest(opts)
	if err != nil {
		return nil, err
	}

	sessionPath := filepath.Join(uploadsDir, sessionTarName)
	if err := writeSessionTar(sessionPath, manifest, source); err != nil {
		return nil, err
	}

	patchPath := filepath.Join(uploadsDir, patchFileName)
	if err := in.writePatch(patchPath); err != nil {
		return &UploadArtifacts{SessionPath: sessionPath}, err
	}

	return &UploadArtifacts{
		SessionPath: sessionPath,
		PatchPath:   patchPath,
	}, nil
}

func (in DefaultTool) sessionManifest(opts BuildArtifactsOptions) (*SessionManifest, *SessionSource, error) {
	if opts.Provider == "" {
		return nil, nil, fmt.Errorf("provider is required")
	}

	var source *SessionSource
	if opts.Source.Path != "" && opts.Source.ArchivePath != "" {
		if _, err := os.Stat(opts.Source.Path); err != nil {
			if !errors.Is(err, os.ErrNotExist) {
				return nil, nil, fmt.Errorf("stat session source %q: %w", opts.Source.Path, err)
			}
		} else {
			source = &opts.Source
		}
	}

	manifest := &SessionManifest{
		Version:    1,
		AgentRunID: in.Config.Run.ID,
		Provider:   opts.Provider,
		Repository: in.Config.Run.Repository,
		Branch:     lo.FromPtr(in.Config.Run.Branch),
		CreatedAt:  time.Now().UTC(),
		Session: SessionMetadata{
			ID: opts.SessionID,
		},
		Resume: ResumeManifest{
			Env:     opts.ResumeEnv,
			Command: opts.Command,
		},
	}
	if source != nil {
		manifest.Session.Path = source.Path
		manifest.Session.ArchivePath = filepath.ToSlash(source.ArchivePath)
	}

	return manifest, source, nil
}

func writeSessionTar(path string, manifest *SessionManifest, source *SessionSource) error {
	file, err := os.Create(path)
	if err != nil {
		return fmt.Errorf("create session archive: %w", err)
	}
	defer file.Close()

	gzipWriter := gzip.NewWriter(file)
	defer gzipWriter.Close()

	tarWriter := tar.NewWriter(gzipWriter)
	defer tarWriter.Close()

	manifestBytes, err := json.MarshalIndent(manifest, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal session manifest: %w", err)
	}
	if err := writeTarBytes(tarWriter, "manifest.json", manifestBytes, 0644); err != nil {
		return err
	}

	if source != nil {
		if err := addPathToTar(tarWriter, source.Path, source.ArchivePath); err != nil {
			return err
		}
	}

	return nil
}

func writeTarBytes(tw *tar.Writer, name string, data []byte, mode int64) error {
	header := &tar.Header{
		Name:    filepath.ToSlash(name),
		Mode:    mode,
		Size:    int64(len(data)),
		ModTime: time.Now().UTC(),
	}
	if err := tw.WriteHeader(header); err != nil {
		return fmt.Errorf("write tar header %q: %w", name, err)
	}
	if _, err := tw.Write(data); err != nil {
		return fmt.Errorf("write tar entry %q: %w", name, err)
	}
	return nil
}

func addPathToTar(tw *tar.Writer, sourcePath, archivePath string) error {
	cleanArchivePath := filepath.ToSlash(strings.TrimPrefix(filepath.Clean(archivePath), string(filepath.Separator)))
	return filepath.WalkDir(sourcePath, func(path string, entry os.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}

		info, err := entry.Info()
		if err != nil {
			return err
		}

		rel, err := filepath.Rel(sourcePath, path)
		if err != nil {
			return err
		}
		name := cleanArchivePath
		if rel != "." {
			name = filepath.Join(cleanArchivePath, rel)
		}

		header, err := tar.FileInfoHeader(info, "")
		if err != nil {
			return err
		}
		header.Name = filepath.ToSlash(name)
		if err := tw.WriteHeader(header); err != nil {
			return fmt.Errorf("write tar header %q: %w", header.Name, err)
		}

		if entry.IsDir() {
			return nil
		}

		file, err := os.Open(path)
		if err != nil {
			return err
		}
		defer file.Close()

		if _, err := io.Copy(tw, file); err != nil {
			return fmt.Errorf("write tar file %q: %w", path, err)
		}
		return nil
	})
}

func (in DefaultTool) writePatch(path string) error {
	if in.Config.RepositoryDir == "" {
		return fmt.Errorf("repository directory is not set")
	}

	var builder strings.Builder
	out, err := gitTrackedDiff(in.Config.RepositoryDir, getBaseCommit())
	if err != nil {
		return err
	}
	builder.Write(out)

	untracked, err := gitOutput(in.Config.RepositoryDir, "ls-files", "--others", "--exclude-standard", "-z")
	if err != nil {
		return fmt.Errorf("git list untracked files: %w", err)
	}
	for _, file := range strings.Split(string(untracked), "\x00") {
		if file == "" {
			continue
		}
		out, err := gitDiffNoIndex(in.Config.RepositoryDir, "/dev/null", file)
		if err != nil {
			return fmt.Errorf("git diff untracked file %q: %w", file, err)
		}
		builder.Write(out)
	}

	return os.WriteFile(path, []byte(builder.String()), 0644)
}

func gitTrackedDiff(dir, baseCommit string) ([]byte, error) {
	if baseCommit != "" {
		out, err := gitOutput(dir, "diff", "--binary", baseCommit, "--")
		if err == nil {
			return out, nil
		}
	}

	out, err := gitOutput(dir, "diff", "--binary", "HEAD", "--")
	if err != nil {
		return nil, fmt.Errorf("git diff tracked changes: %w", err)
	}

	return out, nil
}

func getBaseCommit() string {
	config, err := environment.Load()
	if err != nil {
		return ""
	}
	return strings.TrimSpace(config.BaseCommit)
}

func gitOutput(dir string, args ...string) ([]byte, error) {
	cmd := stdexec.Command("git", append([]string{"-C", dir}, args...)...)
	return cmd.Output()
}

func gitDiffNoIndex(dir, oldPath, newPath string) ([]byte, error) {
	cmd := stdexec.Command("git", "-C", dir, "diff", "--no-index", "--binary", "--", oldPath, newPath)
	out, err := cmd.Output()
	if err == nil {
		return out, nil
	}
	if exitErr, ok := errors.AsType[*stdexec.ExitError](err); ok && exitErr.ExitCode() == 1 {
		return out, nil
	}
	return nil, err
}
