package codex

import (
	"context"
	"path/filepath"

	v1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

func (in *Codex) UploadArtifacts(ctx context.Context) (*v1.UploadArtifacts, error) {
	return in.BuildUploadArtifacts(ctx, v1.BuildArtifactsOptions{
		Provider:  "codex",
		Source:    v1.SessionSource{Path: filepath.Join(in.codexHome(), "sessions"), ArchivePath: "sessions"},
		SessionID: in.threadID,
		ResumeEnv: map[string]string{
			"CODEX_HOME": ".",
		},
		Command: []string{"codex", "resume"},
	})
}
