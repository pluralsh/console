package codex

import (
	"testing"

	"github.com/pelletier/go-toml/v2"
	console "github.com/pluralsh/console/go/client"
	agentrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/dind"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
)

func TestConfigTemplateProxyChat(t *testing.T) {
	doc := renderConfigTemplate(t, ConfigTemplateInput{
		RepositoryDir: "/repo",
		Profile: configTemplateProfile{
			Name:                 autonomousProfile,
			Model:                "openai/gpt-5.4",
			ModelProvider:        pluralProvider,
			SandboxMode:          sandboxModeHarness,
			ApprovalPolicy:       approvalPolicyNever,
			ModelReasoningEffort: defaultReasoning,
			EnableWebSearch:      true,
			EnableShellCache:     true,
		},
		Providers: []configTemplateProvider{{
			Name:    pluralProvider,
			BaseURL: "https://console.plural.sh/ext/ai/v1",
			EnvKey:  consoleTokenEnv,
			WireAPI: chatWireAPI,
		}},
	})

	features := tableValue(t, doc, "features")
	if features["skills"] != true {
		t.Fatalf("features = %#v, expected skills", features)
	}
	projects := tableValue(t, doc, "projects")
	if tableValue(t, projects, "/repo")["trust_level"] != "trusted" {
		t.Fatalf("projects = %#v, expected trusted repository", projects)
	}
	profile := tableValue(t, tableValue(t, doc, "profiles"), autonomousProfile)
	if profile["model"] != "openai/gpt-5.4" || profile["model_provider"] != pluralProvider ||
		profile["sandbox_mode"] != sandboxModeHarness || profile["approval_policy"] != approvalPolicyNever ||
		profile["model_reasoning_effort"] != defaultReasoning {
		t.Fatalf("profile = %#v", profile)
	}
	profileFeatures := tableValue(t, profile, "features")
	if profileFeatures["web_search_request"] != true || profileFeatures["shell_snapshot"] != true {
		t.Fatalf("profile features = %#v", profileFeatures)
	}
	provider := tableValue(t, tableValue(t, doc, "model_providers"), pluralProvider)
	if provider["base_url"] != "https://console.plural.sh/ext/ai/v1" || provider["env_key"] != consoleTokenEnv || provider["wire_api"] != chatWireAPI {
		t.Fatalf("provider = %#v", provider)
	}
}

func TestConfigTemplateCustomEndpointAndAutoOmission(t *testing.T) {
	custom := renderConfigTemplate(t, ConfigTemplateInput{
		RepositoryDir: "/repo",
		Profile: configTemplateProfile{
			Name:                 reviewProfile,
			Model:                "gpt-5.4",
			ModelProvider:        customProvider,
			SandboxMode:          sandboxModeHarness,
			ApprovalPolicy:       approvalPolicyNever,
			ModelReasoningEffort: defaultReasoning,
		},
		Providers: []configTemplateProvider{{
			Name:    customProvider,
			BaseURL: "https://custom.example/v1",
			EnvKey:  openAIAPIKeyEnv,
			WireAPI: responsesWireAPI,
		}},
	})
	provider := tableValue(t, tableValue(t, custom, "model_providers"), customProvider)
	if provider["base_url"] != "https://custom.example/v1" || provider["wire_api"] != responsesWireAPI {
		t.Fatalf("custom provider = %#v", provider)
	}

	auto := renderConfigTemplate(t, ConfigTemplateInput{
		RepositoryDir: "/repo",
		Profile: configTemplateProfile{
			Name:                 analysisProfile,
			Model:                "gpt-5.4",
			SandboxMode:          sandboxModeHarness,
			ApprovalPolicy:       approvalPolicyNever,
			ModelReasoningEffort: defaultReasoning,
		},
	})
	profile := tableValue(t, tableValue(t, auto, "profiles"), analysisProfile)
	if _, ok := profile["model_provider"]; ok {
		t.Fatalf("auto profile unexpectedly selected provider: %#v", profile)
	}
	if _, ok := auto["model_providers"]; ok {
		t.Fatalf("auto config unexpectedly emitted providers: %#v", auto)
	}
	if _, ok := profile["shell_environment_policy"]; ok {
		t.Fatalf("empty shell policy unexpectedly emitted: %#v", profile)
	}
}

func TestConfigTemplateDindShellEnvironment(t *testing.T) {
	t.Setenv(dind.DockerHostEnv, "tcp://docker:2375")
	agent := NewAgent(toolConfigForTemplateTests())
	shell := agent.shellEnvironmentPolicy(true)
	doc := renderConfigTemplate(t, ConfigTemplateInput{
		RepositoryDir: "/repo",
		Profile: configTemplateProfile{
			Name:                   autonomousProfile,
			Model:                  "gpt-5.4",
			SandboxMode:            sandboxModeHarness,
			ApprovalPolicy:         approvalPolicyNever,
			ModelReasoningEffort:   defaultReasoning,
			ShellEnvironmentPolicy: shell,
		},
	})
	policy := tableValue(t, tableValue(t, tableValue(t, doc, "profiles"), autonomousProfile), "shell_environment_policy")
	includeOnly, ok := policy["include_only"].([]any)
	if !ok || len(includeOnly) == 0 {
		t.Fatalf("shell policy include_only = %#v", policy["include_only"])
	}
	set := tableValue(t, policy, "set")
	if set[dind.DockerHostEnv] != "tcp://docker:2375" {
		t.Fatalf("shell policy set = %#v", set)
	}
}

func TestConfigTemplateBuiltInAndExternalMCP(t *testing.T) {
	agent := NewAgent(toolConfigForTemplateTests())
	servers := agent.nativeMCPServers(nil)
	servers = append(servers, configTemplateMCP{
		Name:        "linear",
		Type:        "http",
		URL:         "https://mcp.linear.app/mcp",
		Args:        []string{"--transport", "http"},
		Env:         []configTemplateKeyValue{{Key: "LINEAR_TEAM", Value: "console"}},
		Headers:     []configTemplateKeyValue{{Key: "X-Client", Value: "agent-harness"}},
		HTTPHeaders: []configTemplateKeyValue{{Key: "Authorization", Value: "Bearer token"}},
		EnvHTTPHeaders: []configTemplateKeyValue{{
			Key: "X-Api-Key", Value: "LINEAR_API_KEY",
		}},
		EnabledTools:  []string{"list_issues"},
		DisabledTools: []string{"delete_issue"},
		TrustPolicy:   trustPolicyAlways,
	})
	doc := renderConfigTemplate(t, ConfigTemplateInput{
		RepositoryDir: "/repo",
		Profile:       configTemplateProfile{Name: autonomousProfile, Model: "gpt-5.4"},
		MCPServers:    servers,
	})
	mcps := tableValue(t, doc, "mcp_servers")
	plural := tableValue(t, mcps, pluralProvider)
	if plural["type"] != mcpHTTPTransport || plural["url"] != common.AgentMCPServerURL || plural["trust_policy"] != trustPolicyAlways {
		t.Fatalf("plural MCP = %#v", plural)
	}
	codebase := tableValue(t, mcps, common.CodebaseMemoryMCPServerName)
	if codebase["type"] != mcpStdioTransport || codebase["command"] != common.CodebaseMemoryMCPCommand {
		t.Fatalf("codebase MCP = %#v", codebase)
	}
	env := tableValue(t, codebase, "env")
	if env[common.CodebaseMemoryCacheEnv] != common.CodebaseMemoryCacheDir {
		t.Fatalf("codebase MCP env = %#v", env)
	}
	linear := tableValue(t, mcps, "linear")
	if linear["url"] != "https://mcp.linear.app/mcp" || linear["trust_policy"] != trustPolicyAlways {
		t.Fatalf("linear MCP = %#v", linear)
	}
	header := tableValue(t, linear, "http_headers")
	if header["Authorization"] != "Bearer token" {
		t.Fatalf("linear headers = %#v", header)
	}
	if got := linear["args"].([]any); len(got) != 2 || got[0] != "--transport" || got[1] != "http" {
		t.Fatalf("linear args = %#v", linear["args"])
	}
	if tableValue(t, linear, "env")["LINEAR_TEAM"] != "console" || tableValue(t, linear, "headers")["X-Client"] != "agent-harness" ||
		tableValue(t, linear, "env_http_headers")["X-Api-Key"] != "LINEAR_API_KEY" {
		t.Fatalf("linear optional fields = %#v", linear)
	}
	if got := linear["enabled_tools"].([]any); len(got) != 1 || got[0] != "list_issues" {
		t.Fatalf("linear enabled tools = %#v", linear["enabled_tools"])
	}
	if got := linear["disabled_tools"].([]any); len(got) != 1 || got[0] != "delete_issue" {
		t.Fatalf("linear disabled tools = %#v", linear["disabled_tools"])
	}
}

func TestConfigTemplateEscapesDynamicStrings(t *testing.T) {
	repository := "C:\\repo\\it's\nquoted"
	profileName := "review\"profile"
	model := "vendor\\model\n\"name\a\v"
	key := "X-Header\\name"
	value := "line 1\nline 2 with \"quotes\""
	doc := renderConfigTemplate(t, ConfigTemplateInput{
		RepositoryDir: repository,
		Profile: configTemplateProfile{
			Name:                 profileName,
			Model:                model,
			SandboxMode:          sandboxModeHarness,
			ApprovalPolicy:       approvalPolicyNever,
			ModelReasoningEffort: defaultReasoning,
		},
		MCPServers: []configTemplateMCP{{
			Name:        "mcp\\\"server",
			Type:        "http",
			HTTPHeaders: []configTemplateKeyValue{{Key: key, Value: value}},
		}},
	})
	if tableValue(t, tableValue(t, doc, "projects"), repository)["trust_level"] != "trusted" {
		t.Fatalf("escaped repository key missing: %#v", doc["projects"])
	}
	profile := tableValue(t, tableValue(t, doc, "profiles"), profileName)
	if profile["model"] != model {
		t.Fatalf("escaped model = %#v, want %q", profile["model"], model)
	}
	header := tableValue(t, tableValue(t, tableValue(t, doc, "mcp_servers"), "mcp\\\"server"), "http_headers")
	if header[key] != value {
		t.Fatalf("escaped header = %#v, want %q", header, value)
	}
}

func renderConfigTemplate(t *testing.T, input ConfigTemplateInput) map[string]any {
	t.Helper()
	_, content, err := configTemplate(&input)
	if err != nil {
		t.Fatalf("configTemplate() error = %v", err)
	}
	var doc map[string]any
	if err := toml.Unmarshal([]byte(content), &doc); err != nil {
		t.Fatalf("parse rendered TOML: %v\n%s", err, content)
	}
	return doc
}

func tableValue(t *testing.T, value map[string]any, key string) map[string]any {
	t.Helper()
	child, ok := value[key].(map[string]any)
	if !ok {
		t.Fatalf("table %q = %#v", key, value[key])
	}
	return child
}

func toolConfigForTemplateTests() toolv1.Config {
	return toolv1.Config{WorkDir: "/work", RepositoryDir: "/repo", Run: &agentrunv1.AgentRun{
		Mode: console.AgentRunModeWrite,
		Runtime: &agentrunv1.AgentRuntime{Config: &agentrunv1.AgentRuntimeConfig{
			Codex: &agentrunv1.CodexConfig{},
		}},
	}}
}
