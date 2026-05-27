package opencode

import (
	"path/filepath"
	"testing"

	v1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

func TestEnvUsesOpenCodeDataDirForSessionStorage(t *testing.T) {
	workDir := t.TempDir()
	tool := &Opencode{DefaultTool: v1.DefaultTool{Config: v1.Config{WorkDir: workDir}}}

	expected := "OPENCODE_DATA_DIR=" + filepath.Join(workDir, ".opencode", "data")
	for _, env := range tool.env(filepath.Join(workDir, ".opencode", ConfigFileName)) {
		if env == expected {
			return
		}
	}

	t.Fatalf("expected env to include %q, got %v", expected, tool.env(filepath.Join(workDir, ".opencode", ConfigFileName)))
}
