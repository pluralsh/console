package opencode

import (
	"strings"
	"testing"

	agentrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun/v1"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

func TestEnvUsesHarnessHomeAndConfigHome(t *testing.T) {
	workDir := t.TempDir()
	config := toolv1.Config{
		WorkDir: workDir,
		Run: &agentrunv1.AgentRun{
			Runtime: &agentrunv1.AgentRuntime{Config: &agentrunv1.AgentRuntimeConfig{OpenCode: &agentrunv1.OpencodeConfig{}}},
		},
	}

	env := strings.Join(NewAgent(config).env(config, "/tmp/opencode.json"), "\n")
	for _, want := range []string{
		"XDG_CONFIG_HOME=" + workDir + "/.config",
		"XDG_DATA_HOME=" + workDir + "/.local/share",
	} {
		if !strings.Contains(env, want) {
			t.Fatalf("expected env to contain %q, got:\n%s", want, env)
		}
	}
}
