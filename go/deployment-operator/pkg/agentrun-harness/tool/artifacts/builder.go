package artifacts

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/samber/lo"
	"k8s.io/klog/v2"

	agentrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
)

type Config struct {
	WorkDir       string
	RepositoryDir string
	Run           *agentrunv1.AgentRun
}

func (in Config) UploadsDir() string {
	return filepath.Join(in.WorkDir, uploadsDirName)
}

type ArtifactBuilder struct {
	config         Config
	sessionWriter  SessionArchiveWriter
	patchGenerator PatchGenerator
}

func NewUploadArtifactBuilder(config Config) UploadArtifactBuilder {
	return NewAgentRunArtifactBuilder(config, nil, nil)
}

func NewAgentRunArtifactBuilder(config Config, sessionWriter SessionArchiveWriter, patchGenerator PatchGenerator) *ArtifactBuilder {
	if sessionWriter == nil {
		sessionWriter = &TarSessionArchiveWriter{}
	}
	if patchGenerator == nil {
		patchGenerator = NewGitPatchGenerator(config.RepositoryDir)
	}

	return &ArtifactBuilder{
		config:         config,
		sessionWriter:  sessionWriter,
		patchGenerator: patchGenerator,
	}
}

func (in *ArtifactBuilder) Build(_ context.Context, opts BuildArtifactsOptions) (*UploadArtifacts, error) {
	if in.config.Run == nil {
		return nil, fmt.Errorf("agent run is not set")
	}

	if err := in.createUploadsDir(); err != nil {
		return nil, err
	}

	sessionPath, err := in.writeSessionArchive(opts)
	if err != nil {
		return nil, err
	}

	patchPath, patchGenerated, err := in.writePatch()
	if err != nil {
		return &UploadArtifacts{SessionPath: sessionPath}, err
	}
	if !patchGenerated {
		klog.V(log.LogLevelInfo).InfoS(
			"patch was not generated since there were no changes",
			"agentRunID", in.config.Run.ID,
			"repositoryDir", in.config.RepositoryDir,
		)
		return &UploadArtifacts{SessionPath: sessionPath}, nil
	}

	return &UploadArtifacts{
		SessionPath: sessionPath,
		PatchPath:   patchPath,
	}, nil
}

func (in *ArtifactBuilder) createUploadsDir() error {
	if err := os.MkdirAll(in.config.UploadsDir(), 0755); err != nil {
		return fmt.Errorf("create uploads dir: %w", err)
	}
	return nil
}

func (in *ArtifactBuilder) writeSessionArchive(opts BuildArtifactsOptions) (string, error) {
	manifest, source, err := in.sessionManifest(opts)
	if err != nil {
		return "", err
	}

	sessionPath := filepath.Join(in.config.UploadsDir(), sessionTarName)
	if err := in.sessionWriter.Write(sessionPath, manifest, source); err != nil {
		return "", err
	}

	return sessionPath, nil
}

func (in *ArtifactBuilder) writePatch() (string, bool, error) {
	patchPath := filepath.Join(in.config.UploadsDir(), patchFileName)
	patchGenerated, err := in.patchGenerator.Write(patchPath)
	return patchPath, patchGenerated, err
}

func (in *ArtifactBuilder) sessionManifest(opts BuildArtifactsOptions) (*SessionManifest, *SessionSource, error) {
	if opts.Provider == "" {
		return nil, nil, fmt.Errorf("provider is required")
	}

	source, err := in.sessionSource(opts.Source)
	if err != nil {
		return nil, nil, err
	}

	manifest := &SessionManifest{
		Version:    1,
		AgentRunID: in.config.Run.ID,
		Provider:   opts.Provider,
		Repository: in.config.Run.Repository,
		Branch:     lo.FromPtr(in.config.Run.Branch),
		CreatedAt:  time.Now(),
		Session: SessionMetadata{
			ID: opts.SessionID,
		},
		Resume: ResumeManifest{
			Env:     opts.ResumeEnv,
			Command: opts.Command,
		},
	}
	if source != nil {
		manifest.Session.Path = source.Path
		manifest.Session.ArchivePath = filepath.ToSlash(source.ArchivePath)
	}

	return manifest, source, nil
}

func (in *ArtifactBuilder) sessionSource(source SessionSource) (*SessionSource, error) {
	if source.Path == "" || source.ArchivePath == "" {
		return nil, nil
	}

	if _, err := os.Stat(source.Path); err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil, nil
		}
		return nil, fmt.Errorf("stat session source %q: %w", source.Path, err)
	}

	return &source, nil
}
