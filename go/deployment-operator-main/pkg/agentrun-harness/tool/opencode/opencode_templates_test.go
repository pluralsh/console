package opencode

import (
	"encoding/json"
	"testing"

	console "github.com/pluralsh/console/go/client"
	agentrunv1 "github.com/pluralsh/deployment-operator/pkg/agentrun-harness/agentrun/v1"
	"github.com/samber/lo"
)

const (
	testConsoleURL   = "https://console.test"
	testConsoleToken = "console-token"
	testDeployToken  = "deploy-token"
	testAgentRunID   = "run-123"
	testEndpoint     = "https://api.openai.com/v1"
	testToken        = "openai-token"
)

func baseInput(mode console.AgentRunMode) *ConfigTemplateInput {
	return &ConfigTemplateInput{
		ConsoleURL:   testConsoleURL,
		ConsoleToken: testConsoleToken,
		DeployToken:  testDeployToken,
		AgentRunID:   testAgentRunID,
		Provider:     ProviderOpenAI,
		Endpoint:     testEndpoint,
		Model:        string(ModelGPT52),
		Token:        testToken,
		Mode:         mode,
	}
}

func renderJSON(t *testing.T, input *ConfigTemplateInput) map[string]any {
	t.Helper()
	_, content, err := configTemplate(input)
	if err != nil {
		t.Fatalf("configTemplate() failed: %v", err)
	}
	var out map[string]any
	if err := json.Unmarshal([]byte(content), &out); err != nil {
		t.Fatalf("generated content is not valid JSON: %v\n%s", err, content)
	}
	return out
}

func TestConfigTemplate_PluraMcpExcludeTools(t *testing.T) {
	t.Run("WRITE mode excludes updateAgentRunAnalysis from plural env", func(t *testing.T) {
		out := renderJSON(t, baseInput(console.AgentRunModeWrite))

		mcp := out["mcp"].(map[string]any)
		plural := mcp["plural"].(map[string]any)
		env := plural["environment"].(map[string]any)

		excluded, ok := env["PLRL_EXCLUDE_TOOLS"].(string)
		if !ok {
			t.Fatal("PLRL_EXCLUDE_TOOLS missing from plural MCP environment in WRITE mode")
		}
		if excluded != "updateAgentRunAnalysis" {
			t.Errorf("expected PLRL_EXCLUDE_TOOLS=updateAgentRunAnalysis, got %q", excluded)
		}
	})

	t.Run("ANALYZE mode excludes write tools from plural env", func(t *testing.T) {
		out := renderJSON(t, baseInput(console.AgentRunModeAnalyze))

		mcp := out["mcp"].(map[string]any)
		plural := mcp["plural"].(map[string]any)
		env := plural["environment"].(map[string]any)

		excluded, ok := env["PLRL_EXCLUDE_TOOLS"].(string)
		if !ok {
			t.Fatal("PLRL_EXCLUDE_TOOLS missing from plural MCP environment in ANALYZE mode")
		}
		if excluded != "createBranch,agentPullRequest,fetchAgentRunTodos,updateAgentRunTodos" {
			t.Errorf("unexpected PLRL_EXCLUDE_TOOLS in ANALYZE mode: %q", excluded)
		}
	})
}

func TestConfigTemplate_Provider(t *testing.T) {
	t.Run("plural provider uses consoleURL and consoleToken", func(t *testing.T) {
		input := baseInput(console.AgentRunModeWrite)
		input.Provider = ProviderPlural

		out := renderJSON(t, input)

		providers := out["provider"].(map[string]any)
		plural := providers["plural"].(map[string]any)
		options := plural["options"].(map[string]any)

		if options["baseURL"] != testConsoleURL+"/ext/ai/v1" {
			t.Errorf("expected baseURL=%s/ext/ai/v1, got %v", testConsoleURL, options["baseURL"])
		}
		if options["apiKey"] != testConsoleToken {
			t.Errorf("expected apiKey=%s, got %v", testConsoleToken, options["apiKey"])
		}
	})

	t.Run("openai provider uses custom endpoint and token", func(t *testing.T) {
		input := baseInput(console.AgentRunModeWrite)
		input.Provider = ProviderOpenAI

		out := renderJSON(t, input)

		providers := out["provider"].(map[string]any)
		openai := providers["openai"].(map[string]any)
		options := openai["options"].(map[string]any)

		if options["baseURL"] != testEndpoint {
			t.Errorf("expected baseURL=%s, got %v", testEndpoint, options["baseURL"])
		}
		if options["apiKey"] != testToken {
			t.Errorf("expected apiKey=%s, got %v", testToken, options["apiKey"])
		}
	})
}

func TestConfigTemplate_ExaMcpServers(t *testing.T) {
	t.Run("no ExaMcpConfigs renders only plural MCP server", func(t *testing.T) {
		out := renderJSON(t, baseInput(console.AgentRunModeWrite))

		mcp := out["mcp"].(map[string]any)
		if len(mcp) != 1 {
			t.Errorf("expected 1 MCP server, got %d: %v", len(mcp), mcp)
		}
		if _, ok := mcp["plural"]; !ok {
			t.Error("mcp.plural missing")
		}
	})

	t.Run("ExaMcpConfig without ApiKey renders remote server without headers", func(t *testing.T) {
		input := baseInput(console.AgentRunModeWrite)
		input.ExaMcpConfigs = []agentrunv1.ExaMcpServerConfig{
			{Name: "exa", Url: "https://mcp.exa.ai/mcp"},
		}

		out := renderJSON(t, input)

		mcp := out["mcp"].(map[string]any)
		exa, ok := mcp["exa"].(map[string]any)
		if !ok {
			t.Fatal("mcp.exa missing or not an object")
		}
		if exa["type"] != "remote" {
			t.Errorf("expected type=remote, got %v", exa["type"])
		}
		if exa["url"] != "https://mcp.exa.ai/mcp" {
			t.Errorf("expected url=https://mcp.exa.ai/mcp, got %v", exa["url"])
		}
		if exa["enabled"] != true {
			t.Errorf("expected enabled=true, got %v", exa["enabled"])
		}
		if _, hasHeaders := exa["headers"]; hasHeaders {
			t.Error("headers should not be present when ApiKey is nil")
		}
	})

	t.Run("ExaMcpConfig with ApiKey renders x-api-key header", func(t *testing.T) {
		input := baseInput(console.AgentRunModeWrite)
		input.ExaMcpConfigs = []agentrunv1.ExaMcpServerConfig{
			{Name: "exa", Url: "https://mcp.exa.ai/mcp", ApiKey: lo.ToPtr("secret-key")},
		}

		out := renderJSON(t, input)

		mcp := out["mcp"].(map[string]any)
		exa := mcp["exa"].(map[string]any)
		headers, ok := exa["headers"].(map[string]any)
		if !ok {
			t.Fatal("mcp.exa.headers missing or not an object")
		}
		if headers["x-api-key"] != "secret-key" {
			t.Errorf("expected x-api-key=secret-key, got %v", headers["x-api-key"])
		}
	})

	t.Run("multiple ExaMcpConfigs are all rendered", func(t *testing.T) {
		input := baseInput(console.AgentRunModeWrite)
		input.ExaMcpConfigs = []agentrunv1.ExaMcpServerConfig{
			{Name: "exa", Url: "https://mcp.exa.ai/mcp", ApiKey: lo.ToPtr("key1")},
			{Name: "search", Url: "https://mcp.search.example/mcp"},
		}

		out := renderJSON(t, input)

		mcp := out["mcp"].(map[string]any)
		if len(mcp) != 3 {
			t.Errorf("expected 3 MCP servers (plural + 2 exa), got %d: %v", len(mcp), mcp)
		}
		if _, ok := mcp["exa"]; !ok {
			t.Error("mcp.exa missing")
		}
		if _, ok := mcp["search"]; !ok {
			t.Error("mcp.search missing")
		}
	})
}

func TestConfigTemplate_AgentTools(t *testing.T) {
	t.Run("no ExaMcpConfigs: analysis agent has plural* tool only", func(t *testing.T) {
		out := renderJSON(t, baseInput(console.AgentRunModeWrite))

		agent := out["agent"].(map[string]any)
		analysis := agent["analysis"].(map[string]any)
		tools := analysis["tools"].(map[string]any)

		if _, ok := tools["plural*"]; !ok {
			t.Error("agent.analysis.tools should contain plural*")
		}
		for k := range tools {
			if k != "plural*" {
				t.Errorf("unexpected tool %q in analysis agent tools (no ExaMcpConfigs)", k)
			}
		}
	})

	t.Run("ExaMcpConfigs: analysis agent includes <name>* tool entries", func(t *testing.T) {
		input := baseInput(console.AgentRunModeWrite)
		input.ExaMcpConfigs = []agentrunv1.ExaMcpServerConfig{
			{Name: "exa", Url: "https://mcp.exa.ai/mcp"},
			{Name: "search", Url: "https://mcp.search.example/mcp"},
		}

		out := renderJSON(t, input)

		agent := out["agent"].(map[string]any)
		for _, agentName := range []string{"analysis", "autonomous"} {
			a := agent[agentName].(map[string]any)
			tools := a["tools"].(map[string]any)
			for _, cfg := range input.ExaMcpConfigs {
				key := cfg.Name + "*"
				if v, ok := tools[key]; !ok {
					t.Errorf("agent.%s.tools missing %q", agentName, key)
				} else if v != true {
					t.Errorf("agent.%s.tools[%q] should be true, got %v", agentName, key, v)
				}
			}
		}
	})
}
