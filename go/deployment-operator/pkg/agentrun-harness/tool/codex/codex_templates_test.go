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
		WireAPI: "chat",
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
	if provider.WireAPI != "chat" {
		t.Fatalf("wire_api = %q, want chat", provider.WireAPI)
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

func TestCodexWireAPI(t *testing.T) {
	tests := []struct {
		name   string
		method string
		want   string
	}{
		{name: "chat", method: string(console.OpenAiMethodChat), want: "chat"},
		{name: "responses", method: string(console.OpenAiMethodResponses), want: "responses"},
		{name: "auto", method: string(console.OpenAiMethodAuto), want: ""},
		{name: "empty", method: "", want: ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := codexWireAPI(tt.method); got != tt.want {
				t.Fatalf("codexWireAPI(%q) = %q, want %q", tt.method, got, tt.want)
			}
		})
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
