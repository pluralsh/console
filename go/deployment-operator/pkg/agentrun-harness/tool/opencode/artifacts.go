package opencode

import (
	"context"
	"path/filepath"

	v1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

func (in *Opencode) UploadArtifacts(ctx context.Context) (*v1.UploadArtifacts, error) {
	return in.BuildUploadArtifacts(ctx, v1.BuildArtifactsOptions{
		Provider: "opencode",
		Sources: []v1.SessionSource{
			{Path: filepath.Dir(in.configFilePath()), ArchivePath: filepath.Join("provider", "opencode", "config")},
			{Path: in.dataPath(), ArchivePath: filepath.Join("provider", "opencode", "data")},
		},
		SessionIDs: in.sessionIDs,
		ResumeEnv: map[string]string{
			"OPENCODE_CONFIG": filepath.Join("provider", "opencode", "config", ConfigFileName),
			"XDG_DATA_HOME":   filepath.Join("provider", "opencode", "data"),
		},
		Command: []string{"opencode", "run"},
	})
}
