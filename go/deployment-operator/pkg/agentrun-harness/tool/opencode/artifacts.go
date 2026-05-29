package opencode

import (
	"bytes"
	"context"
	"fmt"
	"os"
	stdexec "os/exec"
	"path/filepath"

	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/artifacts"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
)

func (in *Opencode) UploadArtifacts(ctx context.Context) (*artifacts.UploadArtifacts, error) {
	klog.V(log.LogLevelInfo).InfoS(
		"collecting opencode upload artifacts",
		"agentRunID", in.Config.Run.ID,
		"sessionID", in.sessionID,
		"workDir", in.Config.WorkDir,
		"repositoryDir", in.Config.RepositoryDir,
	)

	sourcePath, err := os.MkdirTemp(in.Config.WorkDir, "opencode-session-export-*")
	if err != nil {
		return nil, fmt.Errorf("create opencode session export dir: %w", err)
	}
	defer os.RemoveAll(sourcePath)

	if err := in.exportSession(ctx, filepath.Join(sourcePath, artifacts.SessionJSONName)); err != nil {
		return nil, err
	}

	return in.BuildUploadArtifacts(ctx, artifacts.BuildArtifactsOptions{
		Provider: "opencode",
		Source: artifacts.SessionSource{
			Path:        sourcePath,
			ArchivePath: "opencode",
		},
		SessionID: in.sessionID,
		Commands: [][]string{
			{"opencode", "import", filepath.ToSlash(filepath.Join("opencode", artifacts.SessionJSONName))},
			{"opencode", "run", "-s", in.sessionID},
		},
	})
}

func (in *Opencode) exportSession(ctx context.Context, path string) error {
	if in.sessionID == "" {
		return fmt.Errorf("opencode session id is not set")
	}

	configFilePath, err := filepath.Abs(in.configFilePath())
	if err != nil {
		return err
	}

	file, err := os.Create(path)
	if err != nil {
		return fmt.Errorf("create opencode session export %q: %w", path, err)
	}
	defer file.Close()

	var stderr bytes.Buffer
	cmd := stdexec.CommandContext(ctx, "opencode", "export", in.sessionID)
	cmd.Env = append(os.Environ(), in.env(configFilePath)...)
	cmd.Dir = in.Config.RepositoryDir
	cmd.Stdout = file
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("opencode export session %q: %w: %s", in.sessionID, err, stderr.String())
	}

	return nil
}
