package opencode

import (
	"encoding/json"
	"testing"

	console "github.com/pluralsh/console/go/client"
)

const (
	testConsoleURL   = "https://console.test"
	testConsoleToken = "console-token"
	testAgentRunID   = "run-123"
	testEndpoint     = "https://api.openai.com/v1"
	testToken        = "openai-token"
)

func baseInput(mode console.AgentRunMode) *ConfigTemplateInput {
	return &ConfigTemplateInput{
		ConsoleURL:   testConsoleURL,
		ConsoleToken: testConsoleToken,
		AgentRunID:   testAgentRunID,
		Provider:     ProviderOpenAI,
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

func TestConfigTemplate_PluralMcpServer(t *testing.T) {
	t.Run("plural MCP server uses in-pod remote URL", func(t *testing.T) {
		out := renderJSON(t, baseInput(console.AgentRunModeWrite))

		mcp := out["mcp"].(map[string]any)
		plural := mcp["plural"].(map[string]any)
		if plural["type"] != "remote" {
			t.Fatalf("expected plural MCP type remote, got %v", plural["type"])
		}
		if plural["url"] != "http://127.0.0.1:8080/mcp" {
			t.Fatalf("expected plural MCP url http://127.0.0.1:8080/mcp, got %v", plural["url"])
		}
	})
}

func TestConfigTemplate_DindPermissions(t *testing.T) {
	t.Run("ANALYZE with dind allows bash for docker", func(t *testing.T) {
		input := baseInput(console.AgentRunModeAnalyze)
		input.DindEnabled = true

		out := renderJSON(t, input)

		agent := out["agent"].(map[string]any)
		analysis := agent["analysis"].(map[string]any)
		permission := analysis["permission"].(map[string]any)

		if permission["bash"] != "allow" {
			t.Fatalf("expected bash=allow when dind enabled, got %v", permission["bash"])
		}
	})

	t.Run("ANALYZE without dind keeps restrictive bash", func(t *testing.T) {
		input := baseInput(console.AgentRunModeAnalyze)

		out := renderJSON(t, input)

		agent := out["agent"].(map[string]any)
		analysis := agent["analysis"].(map[string]any)
		permission := analysis["permission"].(map[string]any)
		bash, ok := permission["bash"].(map[string]any)
		if !ok {
			t.Fatalf("expected bash permission map, got %T %v", permission["bash"], permission["bash"])
		}
		if bash["*"] != "deny" {
			t.Fatalf("expected * deny, got %v", bash["*"])
		}
		if _, ok := bash["docker"]; ok {
			t.Fatal("did not expect docker in restrictive bash allowlist")
		}
		if bash["rg"] != "allow" {
			t.Fatalf("expected rg=allow in restrictive bash allowlist, got %v", bash["rg"])
		}
	})
}

func TestConfigTemplate_PluraMcpExcludeTools(t *testing.T) {
	t.Run("WRITE mode omits PLRL_EXCLUDE_TOOLS from plural MCP env", func(t *testing.T) {
		out := renderJSON(t, baseInput(console.AgentRunModeWrite))

		mcp := out["mcp"].(map[string]any)
		plural := mcp["plural"].(map[string]any)
		if plural["type"] != "remote" {
			t.Fatalf("expected plural MCP type remote, got %v", plural["type"])
		}
		if plural["url"] != "http://127.0.0.1:8080/mcp" {
			t.Fatalf("expected plural MCP url http://127.0.0.1:8080/mcp, got %v", plural["url"])
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

	t.Run("openai provider omits baseURL when endpoint unset", func(t *testing.T) {
		input := baseInput(console.AgentRunModeWrite)
		input.Provider = ProviderOpenAI

		out := renderJSON(t, input)

		providers := out["provider"].(map[string]any)
		openai := providers["openai"].(map[string]any)
		options := openai["options"].(map[string]any)

		if _, ok := options["baseURL"]; ok {
			t.Fatalf("did not expect baseURL when endpoint is unset, got %v", options["baseURL"])
		}
		if options["apiKey"] != testToken {
			t.Errorf("expected apiKey=%s, got %v", testToken, options["apiKey"])
		}
	})

	t.Run("openai compatible provider uses npm package and required baseURL", func(t *testing.T) {
		input := baseInput(console.AgentRunModeWrite)
		input.Provider = ProviderOpenAICompatible
		input.OpenAICompatible = true
		input.Endpoint = "https://litellm.example/v1"
		input.Token = "litellm-key"

		out := renderJSON(t, input)

		providers := out["provider"].(map[string]any)
		compat := providers[string(ProviderOpenAICompatible)].(map[string]any)
		if compat["npm"] != "@ai-sdk/openai" {
			t.Errorf("expected npm=@ai-sdk/openai, got %v", compat["npm"])
		}
		options := compat["options"].(map[string]any)
		if options["baseURL"] != "https://litellm.example/v1" {
			t.Errorf("expected baseURL, got %v", options["baseURL"])
		}
		if options["apiKey"] != "litellm-key" {
			t.Errorf("expected apiKey, got %v", options["apiKey"])
		}
	})

	t.Run("openai provider uses CRD endpoint override and token", func(t *testing.T) {
		input := baseInput(console.AgentRunModeWrite)
		input.Provider = ProviderOpenAI
		input.Endpoint = testEndpoint

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

func TestConfigTemplate_AgentTools(t *testing.T) {
	t.Run("analysis agent has plural* tool only", func(t *testing.T) {
		out := renderJSON(t, baseInput(console.AgentRunModeWrite))

		agent := out["agent"].(map[string]any)
		analysis := agent["analysis"].(map[string]any)
		tools := analysis["tools"].(map[string]any)

		if _, ok := tools["plural*"]; !ok {
			t.Error("agent.analysis.tools should contain plural*")
		}
		for k := range tools {
			if k != "plural*" {
				t.Errorf("unexpected tool %q in analysis agent tools", k)
			}
		}
	})
}
