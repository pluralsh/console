package gemini

import (
	"path/filepath"
	"testing"

	v1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

func TestEnvUsesGeminiCLIHomeForSessionStorage(t *testing.T) {
	workDir := t.TempDir()
	tool := &Gemini{DefaultTool: v1.DefaultTool{Config: v1.Config{WorkDir: workDir}}, apiKey: "key"}

	expected := "GEMINI_CLI_HOME=" + filepath.Join(workDir, ".gemini")
	for _, env := range tool.env() {
		if env == expected {
			return
		}
	}

	t.Fatalf("expected env to include %q, got %v", expected, tool.env())
}
