package gemini

import (
	"context"
	"path/filepath"

	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/artifacts"
)

func (in *Gemini) UploadArtifacts(ctx context.Context) (*artifacts.UploadArtifacts, error) {
	return in.BuildUploadArtifacts(ctx, artifacts.BuildArtifactsOptions{
		Provider:  "gemini",
		Source:    artifacts.SessionSource{Path: filepath.Join(in.providerPath(), "tmp"), ArchivePath: "tmp"},
		SessionID: in.sessionID,
		ResumeEnv: map[string]string{
			"GEMINI_CLI_HOME": ".",
		},
		Command: []string{"gemini"},
	})
}
