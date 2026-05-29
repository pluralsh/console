package codex

import (
	"context"
	"path/filepath"

	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/artifacts"
)

func (in *Codex) UploadArtifacts(ctx context.Context) (*artifacts.UploadArtifacts, error) {
	return in.BuildUploadArtifacts(ctx, artifacts.BuildArtifactsOptions{
		Provider:  "codex",
		Source:    artifacts.SessionSource{Path: filepath.Join(in.codexHome(), "sessions"), ArchivePath: "sessions"},
		SessionID: in.threadID,
		Commands:  [][]string{{"codex", "resume"}},
	})
}
