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
	config := artifacts.Config{
		WorkDir:       in.Config.WorkDir,
		RepositoryDir: in.Config.RepositoryDir,
		Run:           in.Config.Run,
	}
	klog.V(log.LogLevelInfo).InfoS(
		"collecting opencode upload artifacts",
		"agentRunID", in.Config.Run.ID,
		"sessionID", in.sessionID,
		"workDir", in.Config.WorkDir,
		"repositoryDir", in.Config.RepositoryDir,
		"uploadsDir", config.UploadsDir(),
	)

	if err := os.MkdirAll(config.UploadsDir(), 0755); err != nil {
		return nil, fmt.Errorf("create uploads dir: %w", err)
	}

	sessionPath := filepath.Join(config.UploadsDir(), artifacts.SessionJSONName)
	if err := in.exportSession(ctx, sessionPath); err != nil {
		return nil, err
	}

	patchPath := filepath.Join(config.UploadsDir(), artifacts.PatchFileName)
	patchGenerated, err := artifacts.NewGitPatchGenerator(in.Config.RepositoryDir).Write(patchPath)
	if err != nil {
		return &artifacts.UploadArtifacts{SessionPath: sessionPath}, err
	}
	if !patchGenerated {
		return &artifacts.UploadArtifacts{SessionPath: sessionPath}, nil
	}

	return &artifacts.UploadArtifacts{
		SessionPath: sessionPath,
		PatchPath:   patchPath,
	}, nil
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
