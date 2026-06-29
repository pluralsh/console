package artifacts

import (
	"context"
)

const (
	uploadsDirName  = "uploads"
	SessionTarName  = "agent-session.tar.gz"
	SessionJSONName = "agent-session.json"
	PatchFileName   = "changes.patch"
)

type UploadArtifacts struct {
	SessionPath string
	PatchPath   string
}

type SessionSource struct {
	Path         string
	ArchivePath  string
	ExcludeNames []string
}

type SessionManifest struct {
	Version    int             `json:"version"`
	AgentRunID string          `json:"agentRunId"`
	Provider   string          `json:"provider"`
	Repository string          `json:"repository"`
	Branch     string          `json:"branch,omitempty"`
	Session    SessionMetadata `json:"session"`
}

type SessionMetadata struct {
	ID          string `json:"id,omitempty"`
	Path        string `json:"path,omitempty"`
	ArchivePath string `json:"archivePath,omitempty"`
}

type BuildArtifactsOptions struct {
	Provider string
	Source   SessionSource
	// SessionID is the provider-native session identifier captured during the
	// run. The same value must be passed to provider resume flags on follow-up.
	SessionID string
}

type UploadArtifactBuilder interface {
	Build(ctx context.Context, opts BuildArtifactsOptions) (*UploadArtifacts, error)
}

type SessionArchiveWriter interface {
	Write(path string, manifest *SessionManifest, source *SessionSource) error
}

type PatchGenerator interface {
	Write(path string) (bool, error)
}
