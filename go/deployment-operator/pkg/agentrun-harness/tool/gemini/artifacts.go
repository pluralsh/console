package gemini

import (
	"context"
	"path/filepath"

	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/artifacts"
)

func (in *Gemini) UploadArtifacts(ctx context.Context) (*artifacts.UploadArtifacts, error) {
	chatsPath := filepath.Join(in.providerPath(), "tmp", "plural", "chats")
	return in.BuildUploadArtifacts(ctx, artifacts.BuildArtifactsOptions{
		Provider:  "gemini",
		Source:    artifacts.SessionSource{Path: chatsPath, ArchivePath: "chats"},
		SessionID: in.sessionID,
	})
}
