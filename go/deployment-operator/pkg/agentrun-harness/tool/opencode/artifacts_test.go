package opencode

import (
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"

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
