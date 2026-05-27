package claude

import (
	"context"
	"path/filepath"

	v1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

func (in *Claude) UploadArtifacts(ctx context.Context) (*v1.UploadArtifacts, error) {
	return in.BuildUploadArtifacts(ctx, v1.BuildArtifactsOptions{
		Provider:  "claude",
		Source:    v1.SessionSource{Path: filepath.Join(in.configPath(), "projects"), ArchivePath: "projects"},
		SessionID: in.sessionID,
		ResumeEnv: map[string]string{
			"CLAUDE_CONFIG_DIR": ".",
		},
		Command: []string{"claude", "--resume"},
	})
}
