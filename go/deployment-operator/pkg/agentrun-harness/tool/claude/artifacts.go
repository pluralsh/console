package claude

import (
	"context"
	"path/filepath"

	v1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

func (in *Claude) UploadArtifacts(ctx context.Context) (*v1.UploadArtifacts, error) {
	return in.BuildUploadArtifacts(ctx, v1.BuildArtifactsOptions{
		Provider:   "claude",
		Sources:    []v1.SessionSource{{Path: in.configPath(), ArchivePath: filepath.Join("provider", "claude")}},
		SessionIDs: in.sessionIDs,
		ResumeEnv: map[string]string{
			"CLAUDE_CONFIG_DIR": filepath.Join("provider", "claude"),
		},
		Command: []string{"claude", "--resume"},
	})
}
