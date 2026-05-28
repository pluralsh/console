package artifacts

import (
	"context"
	"time"
)

const (
	uploadsDirName  = "uploads"
	sessionTarName  = "agent-session.tar.gz"
	sessionJSONName = "agent-session.json"
	patchFileName   = "changes.patch"
)

const (
	SessionJSONName = sessionJSONName
	PatchFileName   = patchFileName
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
	CreatedAt  time.Time       `json:"createdAt"`
	Session    SessionMetadata `json:"session"`
	Resume     ResumeManifest  `json:"resume"`
}

type ResumeManifest struct {
	Env     map[string]string `json:"env,omitempty"`
	Command []string          `json:"command,omitempty"`
}

type SessionMetadata struct {
	ID          string `json:"id,omitempty"`
	Path        string `json:"path,omitempty"`
	ArchivePath string `json:"archivePath,omitempty"`
}

type BuildArtifactsOptions struct {
	Provider  string
	Source    SessionSource
	SessionID string
	ResumeEnv map[string]string
	Command   []string
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
