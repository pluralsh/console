package opencode

import (
	"context"
	"path/filepath"

	v1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

func (in *Opencode) UploadArtifacts(ctx context.Context) (*v1.UploadArtifacts, error) {
	return in.BuildUploadArtifacts(ctx, v1.BuildArtifactsOptions{
		Provider:  "opencode",
		Source:    v1.SessionSource{Path: in.providerPath(), ArchivePath: filepath.Join("provider", "opencode")},
		SessionID: in.sessionID,
		ResumeEnv: map[string]string{
			"OPENCODE_CONFIG": filepath.Join("provider", "opencode", "config", ConfigFileName),
			"XDG_DATA_HOME":   filepath.Join("provider", "opencode", "data"),
		},
		Command: []string{"opencode", "run"},
	})
}
