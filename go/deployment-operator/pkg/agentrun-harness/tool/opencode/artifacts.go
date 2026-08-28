package opencode

import (
	"context"
	"fmt"
	"os"
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
	})
}

func (in *Opencode) exportSession(ctx context.Context, path string) error {
	if in.sessionID == "" {
		return fmt.Errorf("opencode session id is not set")
	}

	return ExportSession(ctx, in.Config, in.sessionID, path)
}
