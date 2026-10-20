package gemini

import (
	"context"
	"fmt"
	"os"
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

func (in *Gemini) RestoreSession(ctx context.Context, sessionURL string) (string, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	restored, err := artifacts.DownloadAndExtractSession(ctx, sessionURL, in.Config.WorkDir)
	if err != nil {
		return "", err
	}
	defer os.RemoveAll(restored.ExtractDir)

	archivePath := "chats"
	if restored.Manifest != nil && restored.Manifest.Session.ArchivePath != "" {
		archivePath = restored.Manifest.Session.ArchivePath
	}
	destination := filepath.Join(in.providerPath(), "tmp", "plural", "chats")
	if err := artifacts.RestoreArchiveTree(ctx, restored.ExtractDir, archivePath, destination); err != nil {
		return "", fmt.Errorf("import gemini session: %w", err)
	}

	sessionID := ""
	if restored.Manifest != nil {
		sessionID = restored.Manifest.Session.ID
	}
	if sessionID == "" {
		return "", fmt.Errorf("restored session id is empty")
	}
	in.sessionID = sessionID
	return sessionID, nil
}
