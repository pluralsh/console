package gemini

import (
	"context"
	"path/filepath"

	v1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

func (in *Gemini) UploadArtifacts(ctx context.Context) (*v1.UploadArtifacts, error) {
	return in.BuildUploadArtifacts(ctx, v1.BuildArtifactsOptions{
		Provider:  "gemini",
		Source:    v1.SessionSource{Path: in.providerPath(), ArchivePath: filepath.Join("provider", "gemini")},
		SessionID: in.sessionID,
		ResumeEnv: map[string]string{
			"GEMINI_CONFIG_DIR": filepath.Join("provider", "gemini"),
		},
		Command: []string{"gemini"},
	})
}
