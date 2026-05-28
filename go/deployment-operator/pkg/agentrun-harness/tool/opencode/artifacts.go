package opencode

import (
	"context"

	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/artifacts"
)

func (in *Opencode) UploadArtifacts(ctx context.Context) (*artifacts.UploadArtifacts, error) {
	return in.BuildUploadArtifacts(ctx, artifacts.BuildArtifactsOptions{
		Provider:  "opencode",
		Source:    artifacts.SessionSource{Path: in.dataPath(), ArchivePath: ".", ExcludeNames: []string{"auth.json", "log", "logs"}},
		SessionID: in.sessionID,
		ResumeEnv: map[string]string{
			"OPENCODE_DATA_DIR": ".",
		},
		Command: []string{"opencode", "run"},
	})
}
