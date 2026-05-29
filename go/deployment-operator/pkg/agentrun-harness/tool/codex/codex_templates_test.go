package codex

import (
	"fmt"
	"testing"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/dind"
	proxymodel "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/model"
)

func TestBuildCodexConfig_ProxyProvider(t *testing.T) {
	consoleURL := "https://console.plural.sh"
	model := proxymodel.ProxyModel(console.AgentRuntimeTypeCodex, "gpt-5.4")

	cfg, err := BuildCodexConfig("/repo", []AgentInput{{
		Name:          autonomousProfile,
		SandboxMode:   sandboxModeHarness,
		Model:         model,
		ModelProvider: "plural",
	}}, nil, []ModelProviderInput{{
		Name:    "plural",
		BaseURL: fmt.Sprintf("%s/ext/ai/v1", consoleURL),
		EnvKey:  consoleTokenEnv,
	}})
	if err != nil {
		t.Fatalf("BuildCodexConfig() failed: %v", err)
	}

	provider := cfg.ModelProviders["plural"]
	if provider == nil {
		t.Fatal("expected plural model provider")
	}
	if provider.BaseURL != "https://console.plural.sh/ext/ai/v1" {
		t.Fatalf("base_url = %q, want https://console.plural.sh/ext/ai/v1", provider.BaseURL)
	}
	if provider.EnvKey != consoleTokenEnv {
		t.Fatalf("env_key = %q, want %q", provider.EnvKey, consoleTokenEnv)
	}
}

func TestCodexExecArgs(t *testing.T) {
	repositoryDir := dind.RepositoryDir()
	args := codexExecArgs(repositoryDir, autonomousProfile, "run tests")
	want := []string{
		"exec",
		"--sandbox", sandboxModeHarness,
		"--cd", repositoryDir,
		"--profile", autonomousProfile,
		"--json", "run tests",
	}
	if len(args) != len(want) {
		t.Fatalf("expected %d args, got %d: %v", len(want), len(args), args)
	}
	for i := range want {
		if args[i] != want[i] {
			t.Fatalf("arg[%d]: expected %q, got %q (full: %v)", i, want[i], args[i], args)
		}
	}
}

func containsString(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}
