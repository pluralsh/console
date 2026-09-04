package codex

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	console "github.com/pluralsh/console/go/client"
	agentrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun/v1"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

func TestAgentPrepareAndConfigurePhases(t *testing.T) {
	useCodexSystemTemplates(t)
	workDir := t.TempDir()
	repositoryDir := t.TempDir()
	run := codexTestRun(console.AgentRunModeWrite, "gpt-5.1-codex", true)
	run.Prompt = "initial prompt"
	run.Skills = []agentrunv1.AgentSkill{{Name: "guide", Contents: "inspect changes"}}
	config := toolv1.Config{WorkDir: workDir, RepositoryDir: repositoryDir, Run: run}
	agent := NewAgent(config)
	request := toolv1.FileSystemRequest{Phase: toolv1.ConfigurePhaseInitial, WorkDir: workDir, RepositoryDir: repositoryDir}
	if err := agent.Prepare(context.Background(), request); err != nil {
		t.Fatalf("Prepare(initial) error = %v", err)
	}
	promptPath := filepath.Join(workDir, codexHomeDir, toolv1.SystemPromptFile)
	prompt, err := os.ReadFile(promptPath)
	if err != nil {
		t.Fatalf("read prompt: %v", err)
	}
	if !strings.Contains(string(prompt), "initial prompt") {
		t.Fatalf("prompt does not contain run prompt: %s", prompt)
	}
	if _, err := os.Stat(filepath.Join(workDir, codexHomeDir, codexSkillsDir, "guide", "SKILL.md")); err != nil {
		t.Fatalf("skill file was not prepared: %v", err)
	}
	settings, err := agent.ResolveSettings(run)
	if err != nil {
		t.Fatalf("ResolveSettings() error = %v", err)
	}
	if err := agent.Configure(context.Background(), toolv1.ConfigureRequest{
		Phase:        toolv1.ConfigurePhaseInitial,
		ConsoleURL:   "https://console.example",
		ConsoleToken: "console-token",
		Settings:     settings,
	}); err != nil {
		t.Fatalf("Configure(initial) error = %v", err)
	}
	nativePath := filepath.Join(workDir, codexHomeDir, "config.toml")
	native, err := os.ReadFile(nativePath)
	if err != nil {
		t.Fatalf("read native config: %v", err)
	}
	if !strings.Contains(string(native), "https://console.example/ext/ai/v1") ||
		!strings.Contains(string(native), `model = "openai/gpt-5.1-codex"`) ||
		!strings.Contains(string(native), "web_search_request = true") ||
		!strings.Contains(string(native), "shell_snapshot = true") {
		t.Fatalf("native config lost proxy settings: %s", native)
	}
	request.Phase = toolv1.ConfigurePhaseBabysit
	if err := agent.Prepare(context.Background(), request); err != nil {
		t.Fatalf("Prepare(babysit) error = %v", err)
	}
	if err := agent.Configure(context.Background(), toolv1.ConfigureRequest{Phase: toolv1.ConfigurePhaseBabysit}); err != nil {
		t.Fatalf("Configure(babysit) error = %v", err)
	}
	after, err := os.ReadFile(nativePath)
	if err != nil {
		t.Fatalf("read native config after babysit: %v", err)
	}
	if string(native) != string(after) {
		t.Fatal("babysit configuration unexpectedly rewrote native config")
	}
}

func TestResolveProviderSettingsPreservesProxyEndpointAndWirePolicy(t *testing.T) {
	endpoint := "https://custom.example/v1"
	method := console.OpenAiMethodChat
	run := codexTestRun(console.AgentRunModeWrite, "gpt-5.4", true)
	run.Runtime.Config.Codex.Endpoint = &endpoint
	run.Runtime.Config.Codex.Method = string(method)
	config := toolv1.Config{WorkDir: t.TempDir(), RepositoryDir: t.TempDir(), Run: run}
	agent := NewAgent(config)
	agent.consoleURL = "https://console.example"
	provider, baseURL, _, wireAPI := agent.resolveProviderSettings(config)
	if provider != pluralProvider || baseURL != "https://console.example/ext/ai/v1" || wireAPI != chatWireAPI {
		t.Fatalf("proxy provider settings = %q, %q, %q", provider, baseURL, wireAPI)
	}
	run.Runtime.AiProxy = false
	provider, baseURL, _, wireAPI = agent.resolveProviderSettings(config)
	if provider != customProvider || baseURL != endpoint || wireAPI != chatWireAPI {
		t.Fatalf("custom provider settings = %q, %q, %q", provider, baseURL, wireAPI)
	}
}
