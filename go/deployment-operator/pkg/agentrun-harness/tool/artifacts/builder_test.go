package artifacts

import (
	"archive/tar"
	"compress/gzip"
	"context"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"

	agentrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun/v1"
)

type noopPatchGenerator struct{}

func (noopPatchGenerator) Write(string) (bool, error) {
	return false, nil
}

func TestArtifactBuilderWritesSessionTarGz(t *testing.T) {
	t.Parallel()

	workDir := t.TempDir()
	repositoryDir := t.TempDir()
	sourceDir := filepath.Join(workDir, ".opencode", "data")
	require.NoError(t, os.MkdirAll(sourceDir, 0755))
	require.NoError(t, os.WriteFile(filepath.Join(sourceDir, "session.json"), []byte(`{"id":"s1"}`), 0644))

	builder := NewAgentRunArtifactBuilder(Config{
		WorkDir:       workDir,
		RepositoryDir: repositoryDir,
		Run: &agentrunv1.AgentRun{
			ID:         "run-id",
			Repository: "repo",
		},
	}, nil, noopPatchGenerator{})

	uploads, err := builder.Build(context.Background(), BuildArtifactsOptions{
		Provider:  "opencode",
		Source:    SessionSource{Path: sourceDir, ArchivePath: "."},
		SessionID: "s1",
	})
	require.NoError(t, err)
	require.Equal(t, filepath.Join(workDir, uploadsDirName, sessionTarName), uploads.SessionPath)
	require.True(t, strings.HasSuffix(uploads.SessionPath, ".tar.gz"))

	file, err := os.Open(uploads.SessionPath)
	require.NoError(t, err)
	defer file.Close()

	gzipReader, err := gzip.NewReader(file)
	require.NoError(t, err)
	defer gzipReader.Close()

	tarReader := tar.NewReader(gzipReader)
	var names []string
	for {
		header, err := tarReader.Next()
		if err == io.EOF {
			break
		}
		require.NoError(t, err)
		names = append(names, header.Name)
	}

	require.Contains(t, names, "manifest.json")
	require.Contains(t, names, "session.json")
}
