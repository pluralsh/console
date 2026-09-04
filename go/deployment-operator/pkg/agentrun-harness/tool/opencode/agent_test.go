package opencode

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	console "github.com/pluralsh/console/go/client"
	agentrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/artifacts"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

func TestAgentResolveSettings(t *testing.T) {
	tests := []struct {
		name     string
		provider string
		model    string
		compat   bool
		proxy    bool
		want     console.AiProvider
		wantName string
		wantACP  string
	}{
		{name: "default", want: console.AiProviderOpenai, wantName: defaultModel, wantACP: "plural/" + defaultModel},
		{name: "native anthropic", provider: "anthropic", model: "claude-sonnet-4-5", want: console.AiProviderAnthropic, wantName: "claude-sonnet-4-5", wantACP: "anthropic/claude-sonnet-4-5"},
		{name: "native bedrock", provider: "amazon-bedrock", model: "anthropic.claude-3", want: console.AiProviderBedrock, wantName: "anthropic.claude-3", wantACP: "amazon-bedrock/anthropic.claude-3"},
		{name: "native bedrock alias", provider: "bedrock", model: "anthropic.claude-3", want: console.AiProviderBedrock, wantName: "anthropic.claude-3", wantACP: "bedrock/anthropic.claude-3"},
		{name: "native vertex", provider: "google-vertex", model: "gemini-2.5-pro", want: console.AiProviderVertex, wantName: "gemini-2.5-pro", wantACP: "google-vertex/gemini-2.5-pro"},
		{name: "native vertex alias", provider: "vertex", model: "gemini-2.5-pro", want: console.AiProviderVertex, wantName: "gemini-2.5-pro", wantACP: "vertex/gemini-2.5-pro"},
		{name: "native ollama", provider: "ollama", model: "qwen3", want: console.AiProviderOllama, wantName: "qwen3", wantACP: "ollama/qwen3"},
		{name: "native azure", provider: "azure", model: "gpt-5", want: console.AiProviderAzure, wantName: "gpt-5", wantACP: "azure/gpt-5"},
		{name: "native xai", provider: "xai", model: "grok-4", want: console.AiProviderXai, wantName: "grok-4", wantACP: "xai/grok-4"},
		{name: "native google has no Console equivalent", provider: "google", model: "gemini-2.5-pro", wantName: "gemini-2.5-pro", wantACP: "google/gemini-2.5-pro"},
		{name: "proxy", provider: "anthropic", model: "gpt-5.4", proxy: true, want: console.AiProviderOpenai, wantName: "openai/gpt-5.4", wantACP: "plural/openai/gpt-5.4"},
		{name: "proxy preserves model provider", model: "openai/gpt-5.4", proxy: true, want: console.AiProviderOpenai, wantName: "openai/gpt-5.4", wantACP: "plural/openai/gpt-5.4"},
		{name: "openai compatible", provider: "litellm", model: "custom-model", compat: true, want: console.AiProviderOpenaiCompatible, wantName: "custom-model", wantACP: "openai-compatible/custom-model"},
		{name: "unknown native provider", provider: "mistral", model: "large-latest", wantName: "large-latest", wantACP: "mistral/large-latest"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			run := agentRun(tt.provider, tt.model, tt.compat, tt.proxy)
			agent := NewAgent(toolv1.Config{Run: run, RepositoryDir: t.TempDir()})
			settings, err := agent.ResolveSettings(run)
			if err != nil {
				t.Fatalf("ResolveSettings() error = %v", err)
			}
			if settings.Mode != console.AgentRunModeWrite {
				t.Fatalf("mode = %q, want %q", settings.Mode, console.AgentRunModeWrite)
			}
			if tt.want == "" {
				if settings.Model.Provider != nil {
					t.Fatalf("provider = %q, want nil for unknown native provider", *settings.Model.Provider)
				}
			} else if settings.Model.Provider == nil || *settings.Model.Provider != tt.want {
				t.Fatalf("provider = %v, want %q", settings.Model.Provider, tt.want)
			}
			if settings.Model.Name != tt.wantName {
				t.Fatalf("model = %q, want %q", settings.Model.Name, tt.wantName)
			}
			transport, err := NewTransport(agent)
			if err != nil {
				t.Fatal(err)
			}
			projected, err := transport.sessionSettings(settings)
			if err != nil {
				t.Fatal(err)
			}
			if projected.ModelID != tt.wantACP {
				t.Fatalf("ACP model = %q, want %q", projected.ModelID, tt.wantACP)
			}
			if projected.ModeID != writeModeID {
				t.Fatalf("ACP mode = %q, want %q", projected.ModeID, writeModeID)
			}
			if settings.Timeout != 9*time.Minute {
				t.Fatalf("timeout = %s, want 9m", settings.Timeout)
			}
			if settings.Proxy != tt.proxy {
				t.Fatalf("proxy = %v, want %v", settings.Proxy, tt.proxy)
			}
		})
	}
}

func TestAgentResolveSettingsMapsACPMode(t *testing.T) {
	tests := []struct {
		mode console.AgentRunMode
		want string
	}{
		{mode: console.AgentRunModeAnalyze, want: analysisModeID},
		{mode: console.AgentRunModeWrite, want: writeModeID},
		{mode: console.AgentRunModeReview, want: reviewModeID},
	}
	for _, test := range tests {
		run := agentRun("openai", "gpt-5.4", false, false)
		run.Mode = test.mode
		agent := NewAgent(toolv1.Config{Run: run, RepositoryDir: t.TempDir()})
		settings, err := agent.ResolveSettings(run)
		if err != nil {
			t.Fatal(err)
		}
		transport, err := NewTransport(agent)
		if err != nil {
			t.Fatal(err)
		}
		projected, err := transport.sessionSettings(settings)
		if err != nil {
			t.Fatal(err)
		}
		if projected.ModeID != test.want {
			t.Fatalf("mode %q mapped to %q, want %q", test.mode, projected.ModeID, test.want)
		}
	}
}

func TestAgentCapabilities(t *testing.T) {
	capabilities := NewAgent(toolv1.Config{}).Capabilities()
	for _, mode := range []console.AgentRunMode{
		console.AgentRunModeAnalyze,
		console.AgentRunModeWrite,
		console.AgentRunModeReview,
	} {
		if !capabilities.Supports(mode) {
			t.Fatalf("Capabilities() does not support %q", mode)
		}
	}
}

func TestAgentPreparePhases(t *testing.T) {
	useTestSystemTemplates(t)
	workDir := t.TempDir()
	repositoryDir := t.TempDir()
	run := agentRun("anthropic", "claude-sonnet-4-5", false, false)
	run.Prompt = "initial prompt"
	run.Skills = []agentrunv1.AgentSkill{{Name: "review-guide", Contents: "check the diff"}}
	agent := NewAgent(toolv1.Config{Run: run})

	request := toolv1.FileSystemRequest{
		Phase:         toolv1.ConfigurePhaseInitial,
		WorkDir:       workDir,
		RepositoryDir: repositoryDir,
	}
	if err := agent.Prepare(context.Background(), request); err != nil {
		t.Fatalf("Prepare(initial) error = %v", err)
	}
	promptPath := filepath.Join(workDir, ".opencode", "prompts", toolv1.SystemPromptFile)
	prompt, err := os.ReadFile(promptPath)
	if err != nil {
		t.Fatalf("read initial prompt: %v", err)
	}
	if !strings.Contains(string(prompt), "initial prompt") {
		t.Fatalf("initial prompt does not contain run prompt: %s", prompt)
	}
	if _, err := os.Stat(filepath.Join(workDir, ".opencode", "skills", "review-guide", "SKILL.md")); err != nil {
		t.Fatalf("skill file was not prepared: %v", err)
	}

	request.Phase = toolv1.ConfigurePhaseBabysit
	if err := agent.Prepare(context.Background(), request); err != nil {
		t.Fatalf("Prepare(babysit) error = %v", err)
	}
	babysitPrompt, err := os.ReadFile(promptPath)
	if err != nil {
		t.Fatalf("read babysit prompt: %v", err)
	}
	if string(babysitPrompt) == string(prompt) {
		t.Fatal("babysit preparation did not replace the system prompt")
	}
}

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

func TestAgentExportStagesNativeSession(t *testing.T) {
	binDir := t.TempDir()
	opencodePath := filepath.Join(binDir, "opencode")
	if err := os.WriteFile(opencodePath, []byte("#!/bin/sh\nprintf '%s' '{\"id\":\"session-1\"}'\n"), 0755); err != nil {
		t.Fatalf("write fake opencode: %v", err)
	}
	t.Setenv("PATH", binDir+string(os.PathListSeparator)+os.Getenv("PATH"))

	config := toolv1.Config{WorkDir: t.TempDir(), RepositoryDir: t.TempDir(), Run: agentRun("openai", "gpt-5.4", false, false)}
	outputDir := t.TempDir()
	result, err := NewAgent(config).Export(context.Background(), toolv1.ExportRequest{SessionID: "session-1", OutputDir: outputDir})
	if err != nil {
		t.Fatalf("Export() error = %v", err)
	}
	if result.SessionSource.Path != outputDir || result.SessionSource.ArchivePath != "opencode" {
		t.Fatalf("session source = %#v", result.SessionSource)
	}
	data, err := os.ReadFile(filepath.Join(outputDir, artifacts.SessionJSONName))
	if err != nil {
		t.Fatalf("read staged session: %v", err)
	}
	if string(data) != `{"id":"session-1"}` {
		t.Fatalf("staged session = %q", data)
	}
}

func agentRun(provider, model string, compat, proxy bool) *agentrunv1.AgentRun {
	return &agentrunv1.AgentRun{
		ID:   "run-1",
		Mode: console.AgentRunModeWrite,
		Runtime: &agentrunv1.AgentRuntime{
			AiProxy: proxy,
			Config: &agentrunv1.AgentRuntimeConfig{
				OpenCode: &agentrunv1.OpencodeConfig{
					Provider:         provider,
					Model:            model,
					OpenAICompatible: compat,
					Timeout:          9 * time.Minute,
					Token:            "native-token",
				},
			},
		},
	}
}

func useTestSystemTemplates(t *testing.T) {
	t.Helper()
	root := t.TempDir()
	systemDir := filepath.Join(root, "system")
	if err := os.Mkdir(systemDir, 0755); err != nil {
		t.Fatalf("create system template directory: %v", err)
	}
	for _, name := range []string{"analyze", "write", "review", "babysit"} {
		path := filepath.Join(systemDir, name+".md.tmpl")
		if err := os.WriteFile(path, []byte(name+" {{.Prompt}}"), 0644); err != nil {
			t.Fatalf("write %s template: %v", name, err)
		}
	}
	t.Chdir(root)
}
