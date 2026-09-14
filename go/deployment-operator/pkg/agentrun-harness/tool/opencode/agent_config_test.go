package opencode

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/prebake"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

func TestAgentConfigurePreservesNativeConfigForBabysit(t *testing.T) {
	useTestSystemTemplates(t)
	workDir := t.TempDir()
	config := toolv1.Config{
		WorkDir:       workDir,
		RepositoryDir: t.TempDir(),
		Run:           agentRun("anthropic", "claude-sonnet-4-5", false, false),
	}
	agent := NewAgent(config)
	initial := toolv1.FileSystemRequest{Phase: toolv1.ConfigurePhaseInitial, WorkDir: config.WorkDir, RepositoryDir: config.RepositoryDir}
	if err := agent.Prepare(context.Background(), initial); err != nil {
		t.Fatalf("Prepare(initial) error = %v", err)
	}
	settings, err := agent.ResolveSettings(config.Run)
	if err != nil {
		t.Fatalf("ResolveSettings() error = %v", err)
	}
	configure := toolv1.ConfigureRequest{
		Phase:        toolv1.ConfigurePhaseInitial,
		ConsoleURL:   "https://console.example",
		ConsoleToken: "console-token",
		Settings:     settings,
	}
	if err := agent.Configure(context.Background(), configure); err != nil {
		t.Fatalf("Configure(initial) error = %v", err)
	}
	configPath := filepath.Join(workDir, ".opencode", ConfigFileName)
	before, err := os.ReadFile(configPath)
	if err != nil {
		t.Fatalf("read native config: %v", err)
	}

	babysit := initial
	babysit.Phase = toolv1.ConfigurePhaseBabysit
	if err := agent.Prepare(context.Background(), babysit); err != nil {
		t.Fatalf("Prepare(babysit) error = %v", err)
	}
	configure.Phase = toolv1.ConfigurePhaseBabysit
	configure.ConsoleToken = ""
	if err := agent.Configure(context.Background(), configure); err != nil {
		t.Fatalf("Configure(babysit) error = %v", err)
	}
	after, err := os.ReadFile(configPath)
	if err != nil {
		t.Fatalf("read native config after babysit: %v", err)
	}
	if string(before) != string(after) {
		t.Fatal("babysit configuration unexpectedly rewrote native config")
	}

	var native map[string]any
	if err := json.Unmarshal(before, &native); err != nil {
		t.Fatalf("decode native config: %v", err)
	}
	if native["model"] != "anthropic/claude-sonnet-4-5" {
		t.Fatalf("native model = %v", native["model"])
	}
}

func TestAgentConfigureIncludesPrebakeReadOnlyDirectory(t *testing.T) {
	prebakeDirectory := t.TempDir()
	t.Setenv(prebake.EnvDir, prebakeDirectory)
	workDir := t.TempDir()
	run := agentRun("openai", "gpt-5.4", false, false)
	agent := NewAgent(toolv1.Config{
		WorkDir:       workDir,
		RepositoryDir: t.TempDir(),
		Run:           run,
	})
	settings, err := agent.ResolveSettings(run)
	if err != nil {
		t.Fatalf("ResolveSettings() error = %v", err)
	}
	if err := agent.Configure(context.Background(), toolv1.ConfigureRequest{
		Phase:        toolv1.ConfigurePhaseInitial,
		ConsoleToken: "console-token",
		Settings:     settings,
	}); err != nil {
		t.Fatalf("Configure(initial) error = %v", err)
	}

	content, err := os.ReadFile(filepath.Join(workDir, ".opencode", ConfigFileName))
	if err != nil {
		t.Fatalf("read native config: %v", err)
	}
	var config map[string]any
	if err := json.Unmarshal(content, &config); err != nil {
		t.Fatalf("decode native config: %v", err)
	}

	autonomous := config["agent"].(map[string]any)["autonomous"].(map[string]any)
	permission := autonomous["permission"].(map[string]any)
	pattern := filepath.Join(prebakeDirectory, "**")
	external := permission["external_directory"].(map[string]any)
	if external[pattern] != "allow" {
		t.Fatalf("external_directory[%q] = %v, want allow", pattern, external[pattern])
	}
	edits := permission["edit"].(map[string]any)
	if edits[pattern] != "deny" {
		t.Fatalf("edit[%q] = %v, want deny", pattern, edits[pattern])
	}
}

func TestAgentConfigureUsesOpenAIMethodSDK(t *testing.T) {
	tests := []struct {
		name   string
		method string
		npm    string
	}{
		{name: "chat", method: string(console.OpenAiMethodChat), npm: "@ai-sdk/openai-compatible"},
		{name: "responses", method: string(console.OpenAiMethodResponses), npm: "@ai-sdk/openai"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			workDir := t.TempDir()
			run := agentRun("litellm", "gpt-4", true, false)
			run.Runtime.Config.OpenCode.Method = tt.method
			run.Runtime.Config.OpenCode.Endpoint = "https://litellm.example/v1"
			agent := NewAgent(toolv1.Config{
				WorkDir:       workDir,
				RepositoryDir: t.TempDir(),
				Run:           run,
			})
			settings, err := agent.ResolveSettings(run)
			if err != nil {
				t.Fatalf("ResolveSettings() error = %v", err)
			}
			if err := agent.Configure(context.Background(), toolv1.ConfigureRequest{
				Phase:        toolv1.ConfigurePhaseInitial,
				ConsoleToken: "console-token",
				Settings:     settings,
			}); err != nil {
				t.Fatalf("Configure(initial) error = %v", err)
			}

			content, err := os.ReadFile(filepath.Join(workDir, ".opencode", ConfigFileName))
			if err != nil {
				t.Fatalf("read native config: %v", err)
			}
			var config map[string]any
			if err := json.Unmarshal(content, &config); err != nil {
				t.Fatalf("decode native config: %v", err)
			}
			provider := config["provider"].(map[string]any)[string(ProviderOpenAICompatible)].(map[string]any)
			if provider["npm"] != tt.npm {
				t.Fatalf("npm = %v, want %q", provider["npm"], tt.npm)
			}
		})
	}
}
