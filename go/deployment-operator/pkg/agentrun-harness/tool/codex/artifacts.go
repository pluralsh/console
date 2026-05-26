package codex

import (
	"context"
	"path/filepath"

	v1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

func (in *Codex) UploadArtifacts(ctx context.Context) (*v1.UploadArtifacts, error) {
	return in.BuildUploadArtifacts(ctx, v1.BuildArtifactsOptions{
		Provider:   "codex",
		Sources:    []v1.SessionSource{{Path: in.codexHome(), ArchivePath: filepath.Join("provider", "codex")}},
		SessionIDs: []string{in.threadID},
		ResumeEnv: map[string]string{
			"CODEX_HOME": filepath.Join("provider", "codex"),
		},
		Command: []string{"codex", "resume"},
	})
}
