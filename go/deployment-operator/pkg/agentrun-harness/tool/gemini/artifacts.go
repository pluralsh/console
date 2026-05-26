package gemini

import (
	"context"
	"path/filepath"

	v1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

func (in *Gemini) UploadArtifacts(ctx context.Context) (*v1.UploadArtifacts, error) {
	return in.BuildUploadArtifacts(ctx, v1.BuildArtifactsOptions{
		Provider: "gemini",
		Sources: []v1.SessionSource{
			{Path: filepath.Dir(in.settingsPath()), ArchivePath: filepath.Join("provider", "gemini", "project")},
			{Path: in.homePath(), ArchivePath: filepath.Join("provider", "gemini", "home-root")},
		},
		SessionIDs: in.sessionIDs,
		ResumeEnv: map[string]string{
			"HOME": filepath.Join("provider", "gemini", "home-root"),
		},
		Command: []string{"gemini"},
	})
}
