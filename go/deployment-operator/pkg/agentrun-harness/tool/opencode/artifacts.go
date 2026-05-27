package opencode

import (
	"context"

	v1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

func (in *Opencode) UploadArtifacts(ctx context.Context) (*v1.UploadArtifacts, error) {
	return in.BuildUploadArtifacts(ctx, v1.BuildArtifactsOptions{
		Provider:  "opencode",
		Source:    v1.SessionSource{Path: in.dataPath(), ArchivePath: ".", ExcludeNames: []string{"auth.json", "log", "logs"}},
		SessionID: in.sessionID,
		ResumeEnv: map[string]string{
			"OPENCODE_DATA_DIR": ".",
		},
		Command: []string{"opencode", "run"},
	})
}
