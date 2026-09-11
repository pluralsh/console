package opencode

import (
	"encoding/json"
	"testing"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/mcp"
	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
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
		Model:        "gpt-5.2",
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

	t.Run("codebase memory MCP server uses local stdio command", func(t *testing.T) {
		out := renderJSON(t, baseInput(console.AgentRunModeWrite))

		mcp := out["mcp"].(map[string]any)
		codebaseMemory := mcp[common.CodebaseMemoryMCPServerName].(map[string]any)
		if codebaseMemory["type"] != "local" {
			t.Fatalf("expected codebase memory MCP type local, got %v", codebaseMemory["type"])
		}
		command := codebaseMemory["command"].([]any)
		if len(command) != 1 || command[0] != common.CodebaseMemoryMCPCommand {
			t.Fatalf("expected codebase memory command [%q], got %v", common.CodebaseMemoryMCPCommand, command)
		}
		environment := codebaseMemory["environment"].(map[string]any)
		if environment[common.CodebaseMemoryCacheEnv] != common.CodebaseMemoryCacheDir {
			t.Fatalf("expected %s=%s, got %v", common.CodebaseMemoryCacheEnv, common.CodebaseMemoryCacheDir, environment[common.CodebaseMemoryCacheEnv])
		}
	})
}

func TestConfigTemplate_ExternalMCPServer(t *testing.T) {
	t.Setenv(mcp.EnvServers, `[{"name":"linear","url":"https://mcp.linear.app/mcp","allowedTools":["list_issues"],"headers":{"Authorization":"Bearer secret"}}]`)

	out := renderJSON(t, baseInput(console.AgentRunModeWrite))
	mcpSection := out["mcp"].(map[string]any)
	linear := mcpSection["linear"].(map[string]any)
	if linear["type"] != "remote" {
		t.Fatalf("type = %v", linear["type"])
	}
	if linear["url"] != "https://mcp.linear.app/mcp" {
		t.Fatalf("url = %v", linear["url"])
	}
	headers := linear["headers"].(map[string]any)
	if headers["Authorization"] != "Bearer secret" {
		t.Fatalf("headers = %#v", headers)
	}
	if linear["oauth"] != false {
		t.Fatalf("oauth = %v", linear["oauth"])
	}

	tools := out["agent"].(map[string]any)["analysis"].(map[string]any)["tools"].(map[string]any)
	if tools["linear_list_issues"] != true {
		t.Fatalf("analysis tools = %#v", tools)
	}
	reviewTools := out["agent"].(map[string]any)["review"].(map[string]any)["tools"].(map[string]any)
	if reviewTools["linear_list_issues"] != true {
		t.Fatalf("review tools = %#v", reviewTools)
	}
}

func TestConfigTemplate_ReviewAgentIsReadOnly(t *testing.T) {
	out := renderJSON(t, baseInput(console.AgentRunModeReview))
	review := out["agent"].(map[string]any)["review"].(map[string]any)
	permission := review["permission"].(map[string]any)

	if permission["edit"] != "deny" {
		t.Fatalf("expected review edit permission to be denied, got %v", permission["edit"])
	}
	tools := review["tools"].(map[string]any)
	if tools["plural*"] != true {
		t.Fatalf("expected review agent to enable plural MCP tools, got %#v", tools)
	}
}

func TestConfigTemplate_ExternalMCPServerAllTools(t *testing.T) {
	t.Setenv(mcp.EnvServers, `[{"name":"linear","url":"https://mcp.linear.app/mcp"}]`)

	out := renderJSON(t, baseInput(console.AgentRunModeWrite))
	mcpSection := out["mcp"].(map[string]any)
	linear := mcpSection["linear"].(map[string]any)
	if linear["oauth"] != false {
		t.Fatalf("oauth = %v", linear["oauth"])
	}
	tools := out["agent"].(map[string]any)["analysis"].(map[string]any)["tools"].(map[string]any)
	if tools["linear*"] != true {
		t.Fatalf("analysis tools = %#v", tools)
	}
}

func TestConfigTemplate_DisablesLocalStateFeatures(t *testing.T) {
	t.Run("disables autoupdate and snapshot", func(t *testing.T) {
		out := renderJSON(t, baseInput(console.AgentRunModeWrite))

		if out["autoupdate"] != false {
			t.Fatalf("expected autoupdate=false, got %v", out["autoupdate"])
		}
		if out["snapshot"] != false {
			t.Fatalf("expected snapshot=false, got %v", out["snapshot"])
		}
	})
}

func TestConfigTemplate_AllowsSkillLoading(t *testing.T) {
	out := renderJSON(t, baseInput(console.AgentRunModeWrite))

	permission := out["permission"].(map[string]any)
	skill := permission["skill"].(map[string]any)
	if skill["*"] != "allow" {
		t.Fatalf("expected skill wildcard permission to be allow, got %v", skill["*"])
	}
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

func TestConfigTemplate_SkillPermissions(t *testing.T) {
	out := renderJSON(t, baseInput(console.AgentRunModeWrite))

	agents := out["agent"].(map[string]any)
	for _, name := range []string{"analysis", "autonomous"} {
		agent := agents[name].(map[string]any)
		permission := agent["permission"].(map[string]any)
		skill, ok := permission["skill"].(map[string]any)
		if !ok {
			t.Fatalf("expected %s skill permission map, got %T %v", name, permission["skill"], permission["skill"])
		}
		if skill["*"] != "allow" {
			t.Fatalf("expected %s skill wildcard allow, got %v", name, skill["*"])
		}
	}
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

	t.Run("plural provider with streaming proxy uses mcpserver base URL", func(t *testing.T) {
		input := baseInput(console.AgentRunModeWrite)
		input.Provider = ProviderPlural
		input.StreamingProxy = true
		input.StreamingProxyBaseURL = common.AgentOpenAIBaseURL

		out := renderJSON(t, input)

		providers := out["provider"].(map[string]any)
		plural := providers["plural"].(map[string]any)
		if plural["npm"] != "@ai-sdk/openai" {
			t.Fatalf("expected npm=@ai-sdk/openai for streaming proxy, got %v", plural["npm"])
		}
		options := plural["options"].(map[string]any)

		if options["baseURL"] != common.AgentOpenAIBaseURL {
			t.Errorf("expected mcpserver baseURL %s, got %v", common.AgentOpenAIBaseURL, options["baseURL"])
		}
	})

	t.Run("plural provider without streaming proxy uses responses sdk", func(t *testing.T) {
		input := baseInput(console.AgentRunModeWrite)
		input.Provider = ProviderPlural

		out := renderJSON(t, input)

		providers := out["provider"].(map[string]any)
		plural := providers["plural"].(map[string]any)
		if plural["npm"] != "@ai-sdk/openai" {
			t.Fatalf("expected npm=@ai-sdk/openai, got %v", plural["npm"])
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
		input.Model = "tenant/custom-model"

		out := renderJSON(t, input)
		if out["model"] != "openai-compatible/tenant/custom-model" {
			t.Errorf("expected model=openai-compatible/tenant/custom-model, got %v", out["model"])
		}

		providers := out["provider"].(map[string]any)
		compat := providers[string(ProviderOpenAICompatible)].(map[string]any)
		if compat["npm"] != "@ai-sdk/openai-compatible" {
			t.Errorf("expected npm=@ai-sdk/openai-compatible, got %v", compat["npm"])
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
	t.Run("analysis agent has MCP tools", func(t *testing.T) {
		out := renderJSON(t, baseInput(console.AgentRunModeWrite))

		agent := out["agent"].(map[string]any)
		analysis := agent["analysis"].(map[string]any)
		tools := analysis["tools"].(map[string]any)

		if _, ok := tools["plural*"]; !ok {
			t.Error("agent.analysis.tools should contain plural*")
		}
		if _, ok := tools["codebase-memory-mcp*"]; !ok {
			t.Error("agent.analysis.tools should contain codebase-memory-mcp*")
		}
		for k := range tools {
			if k != "plural*" && k != "codebase-memory-mcp*" {
				t.Errorf("unexpected tool %q in analysis agent tools", k)
			}
		}
	})
}
