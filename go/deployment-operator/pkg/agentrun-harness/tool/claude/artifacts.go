package claude

import (
	"context"
	"path/filepath"

	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/artifacts"
)

func (in *Claude) UploadArtifacts(ctx context.Context) (*artifacts.UploadArtifacts, error) {
	return in.BuildUploadArtifacts(ctx, artifacts.BuildArtifactsOptions{
		Provider:  "claude",
		Source:    artifacts.SessionSource{Path: filepath.Join(in.configPath(), "projects"), ArchivePath: "projects"},
		SessionID: in.sessionID,
		Commands:  [][]string{{"claude", "--resume", in.sessionID}},
	})
}
