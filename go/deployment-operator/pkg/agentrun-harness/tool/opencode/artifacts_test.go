package opencode

import (
	"archive/tar"
	"compress/gzip"
	"context"
	"encoding/json"
	"io"
	"os"
	stdexec "os/exec"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"

	agentrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/artifacts"
	v1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

func TestEnvUsesXDGDataHomeForSessionStorage(t *testing.T) {
	workDir := t.TempDir()
	tool := &Opencode{DefaultTool: v1.DefaultTool{Config: v1.Config{WorkDir: workDir}}}

	expected := "XDG_DATA_HOME=" + filepath.Join(workDir, ".local", "share")
	for _, env := range tool.env(filepath.Join(workDir, ".opencode", ConfigFileName)) {
		if env == expected {
			return
		}
	}

	t.Fatalf("expected env to include %q, got %v", expected, tool.env(filepath.Join(workDir, ".opencode", ConfigFileName)))
}

func TestDataPathUsesXDGOpencodeDataDirectory(t *testing.T) {
	workDir := t.TempDir()
	tool := &Opencode{DefaultTool: v1.DefaultTool{Config: v1.Config{WorkDir: workDir}}}

	require.Equal(t, filepath.Join(workDir, ".local", "share", "opencode"), tool.dataPath())
}

func TestUploadArtifactsExportsNativeSessionJSON(t *testing.T) {
	workDir := t.TempDir()
	repositoryDir := t.TempDir()
	require.NoError(t, stdexec.Command("git", "-C", repositoryDir, "init").Run())

	binDir := t.TempDir()
	opencodePath := filepath.Join(binDir, "opencode")
	require.NoError(t, os.WriteFile(opencodePath, []byte(`#!/bin/sh
if [ "$1" != "export" ]; then
  echo "unexpected command: $1" >&2
  exit 10
fi
if [ "$2" != "session-1" ]; then
  echo "unexpected session: $2" >&2
  exit 11
fi
case "$OPENCODE_CONFIG" in
  */.opencode/opencode.json) ;;
  *) echo "unexpected config: $OPENCODE_CONFIG" >&2; exit 12 ;;
esac
case "$XDG_DATA_HOME" in
  */.local/share) ;;
  *) echo "unexpected data home: $XDG_DATA_HOME" >&2; exit 13 ;;
esac
printf '{"id":"%s"}\n' "$2"
`), 0755))
	t.Setenv("PATH", binDir+string(os.PathListSeparator)+os.Getenv("PATH"))

	tool := &Opencode{
		DefaultTool: v1.DefaultTool{Config: v1.Config{
			WorkDir:       workDir,
			RepositoryDir: repositoryDir,
			Run: &agentrunv1.AgentRun{
				ID:         "run-id",
				Repository: "repo",
			},
		}},
		sessionID: "session-1",
	}

	uploads, err := tool.UploadArtifacts(context.Background())
	require.NoError(t, err)
	require.Equal(t, filepath.Join((artifacts.Config{WorkDir: workDir}).UploadsDir(), artifacts.SessionTarName), uploads.SessionPath)
	require.Empty(t, uploads.PatchPath)

	entries := readSessionArchive(t, uploads.SessionPath)
	require.Contains(t, entries, "manifest.json")
	require.Contains(t, entries, filepath.ToSlash(filepath.Join("opencode", artifacts.SessionJSONName)))
	require.JSONEq(t, `{"id":"session-1"}`, entries[filepath.ToSlash(filepath.Join("opencode", artifacts.SessionJSONName))])
	require.JSONEq(t, `{
		"version": 1,
		"agentRunId": "run-id",
		"provider": "opencode",
		"repository": "repo",
		"createdAt": "0001-01-01T00:00:00Z",
		"session": {
			"id": "session-1",
			"path": "",
			"archivePath": "opencode"
		},
		"resume": {
			"env": {
				"XDG_DATA_HOME": "."
			},
			"commands": [
				["opencode", "import", "opencode/agent-session.json"],
				["opencode", "run", "-s", "session-1"]
			]
		}
	}`, normalizeCreatedAt(t, entries["manifest.json"]))
}

func readSessionArchive(t *testing.T, path string) map[string]string {
	t.Helper()

	file, err := os.Open(path)
	require.NoError(t, err)
	defer file.Close()

	gzipReader, err := gzip.NewReader(file)
	require.NoError(t, err)
	defer gzipReader.Close()

	tarReader := tar.NewReader(gzipReader)
	entries := map[string]string{}
	for {
		header, err := tarReader.Next()
		if err == io.EOF {
			break
		}
		require.NoError(t, err)
		if header.FileInfo().IsDir() {
			continue
		}

		content, err := io.ReadAll(tarReader)
		require.NoError(t, err)
		entries[header.Name] = string(content)
	}

	return entries
}

func normalizeCreatedAt(t *testing.T, manifest string) string {
	t.Helper()

	normalized := map[string]any{}
	require.NoError(t, json.Unmarshal([]byte(manifest), &normalized))
	normalized["createdAt"] = "0001-01-01T00:00:00Z"
	normalized["session"].(map[string]any)["path"] = ""

	content, err := json.Marshal(normalized)
	require.NoError(t, err)
	return string(content)
}
