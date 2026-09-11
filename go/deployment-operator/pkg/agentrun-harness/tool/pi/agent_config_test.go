package pi

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/mcp"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

func TestAgentConfigure(t *testing.T) {
	workDir := t.TempDir()
	repositoryDir := t.TempDir()
	run := piTestRun(console.AgentRunModeWrite, "", "gpt-5.4", nil, true)
	agent := NewAgent(toolv1.Config{WorkDir: workDir, RepositoryDir: repositoryDir, Run: run})
	settings, err := agent.ResolveSettings(run)
	if err != nil {
		t.Fatalf("ResolveSettings() error = %v", err)
	}
	t.Setenv(mcp.EnvServers, `[{
		"name":"linear",
		"url":"https://mcp.linear.app/mcp",
		"allowedTools":["list_issues"]
	}]`)
	if err := agent.Configure(context.Background(), toolv1.ConfigureRequest{
		Phase:        toolv1.ConfigurePhaseInitial,
		ConsoleURL:   "https://console.example",
		ConsoleToken: "console-token",
		Settings:     settings,
	}); err != nil {
		t.Fatalf("Configure(initial) error = %v", err)
	}

	models, err := os.ReadFile(filepath.Join(workDir, ".pi", "agent", modelsFileName))
	if err != nil {
		t.Fatalf("read models config: %v", err)
	}
	var modelConfig map[string]any
	if err := json.Unmarshal(models, &modelConfig); err != nil {
		t.Fatalf("decode models config: %v", err)
	}
	provider := modelConfig["providers"].(map[string]any)[providerPlural].(map[string]any)
	if provider["baseUrl"] != "https://console.example/ext/ai/v1" || provider["apiKey"] != "$OPENAI_API_KEY" {
		t.Fatalf("proxy provider config = %#v", provider)
	}

	mcpConfig, err := os.ReadFile(filepath.Join(workDir, ".pi", "agent", mcpFileName))
	if err != nil {
		t.Fatalf("read mcp config: %v", err)
	}
	if !strings.Contains(string(mcpConfig), `"linear"`) {
		t.Fatalf("external MCP server missing: %s", mcpConfig)
	}
	settingsConfig, err := os.ReadFile(filepath.Join(workDir, ".pi", "agent", settingsFileName))
	if err != nil {
		t.Fatalf("read pi settings: %v", err)
	}
	if !strings.Contains(string(settingsConfig), piMCPExtensionPath) {
		t.Fatalf("MCP extension missing from Pi settings: %s", settingsConfig)
	}

	before := string(models)
	if err := agent.Configure(context.Background(), toolv1.ConfigureRequest{Phase: toolv1.ConfigurePhaseBabysit}); err != nil {
		t.Fatalf("Configure(babysit) error = %v", err)
	}
	after, err := os.ReadFile(filepath.Join(workDir, ".pi", "agent", modelsFileName))
	if err != nil {
		t.Fatalf("read models config after babysit: %v", err)
	}
	if string(after) != before {
		t.Fatal("babysit configuration unexpectedly rewrote native config")
	}
}

func TestAddExternalMCPServers(t *testing.T) {
	t.Setenv(mcp.EnvServers, `[{
		"name":"linear",
		"url":"https://mcp.linear.app/mcp",
		"allowedTools":["list_issues"],
		"headers":{"Authorization":"Bearer secret"}
	}]`)
	servers := map[string]any{}
	if err := addExternalMCPServers(servers); err != nil {
		t.Fatalf("addExternalMCPServers() error = %v", err)
	}
	linear := servers["linear"].(map[string]any)
	if linear["url"] != "https://mcp.linear.app/mcp" {
		t.Fatalf("url = %v", linear["url"])
	}
	if linear["headers"].(map[string]string)["Authorization"] != "Bearer secret" {
		t.Fatalf("headers = %#v", linear["headers"])
	}
}
