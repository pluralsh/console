package opencode

import (
	"testing"
	"time"

	console "github.com/pluralsh/console/go/client"
	agentrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun/v1"
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

func TestResolveSettingsProvider(t *testing.T) {
	tests := []struct {
		name     string
		provider string
		want     Provider
	}{
		{name: "empty defaults to plural", provider: "", want: ProviderPlural},
		{name: "passes through models.dev slug", provider: "anthropic", want: ProviderAnthropic},
		{name: "passes through amazon-bedrock", provider: "amazon-bedrock", want: ProviderAmazonBedrock},
		{name: "passes through google-vertex", provider: "google-vertex", want: ProviderGoogleVertex},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := NewAgent(toolv1.Config{}).resolveSettings(tt.provider, "model", false, false).provider
			if got != tt.want {
				t.Fatalf("resolveSettings(%q, false, false).provider = %q, want %q", tt.provider, got, tt.want)
			}
		})
	}
}

func TestResolveOpenCodeSettings(t *testing.T) {
	tests := []struct {
		name             string
		provider         string
		model            string
		openaiCompatible bool
		proxyEnabled     bool
		wantProvider     Provider
		wantModel        string
		wantOpenAICompat bool
	}{
		{
			name:         "aiProxy forces plural and prefixes bare model",
			provider:     "anthropic",
			model:        "gpt-5.4",
			proxyEnabled: true,
			wantProvider: ProviderPlural,
			wantModel:    "openai/gpt-5.4",
		},
		{
			name:         "aiProxy leaves provider-prefixed model unchanged",
			provider:     "openai",
			model:        "openai/gpt-5.4",
			proxyEnabled: true,
			wantProvider: ProviderPlural,
			wantModel:    "openai/gpt-5.4",
		},
		{
			name:             "aiProxy ignores openaiCompatible",
			provider:         "openai-compatible",
			model:            "gpt-4",
			openaiCompatible: true,
			proxyEnabled:     true,
			wantProvider:     ProviderPlural,
			wantModel:        "openai/gpt-4",
		},
		{
			name:             "openaiCompatible uses fixed provider",
			provider:         "litellm",
			model:            "gpt-4",
			openaiCompatible: true,
			wantProvider:     ProviderOpenAICompatible,
			wantModel:        "gpt-4",
			wantOpenAICompat: true,
		},
		{
			name:             "openaiCompatible strips only its provider prefix",
			provider:         "litellm",
			model:            "openai-compatible/custom/model",
			openaiCompatible: true,
			wantProvider:     ProviderOpenAICompatible,
			wantModel:        "custom/model",
			wantOpenAICompat: true,
		},
		{
			name:             "openaiCompatible preserves other slash-containing model names",
			provider:         "litellm",
			model:            "tenant/custom/model",
			openaiCompatible: true,
			wantProvider:     ProviderOpenAICompatible,
			wantModel:        "tenant/custom/model",
			wantOpenAICompat: true,
		},
		{
			name:         "empty native provider defaults to plural",
			wantProvider: ProviderPlural,
			wantModel:    defaultModel,
		},
		{
			name:         "native provider strips its prefix",
			provider:     "anthropic",
			model:        "anthropic/claude-sonnet-4-5",
			wantProvider: ProviderAnthropic,
			wantModel:    "claude-sonnet-4-5",
		},
		{
			name:         "native provider strips exactly one prefix",
			provider:     "anthropic",
			model:        "anthropic/anthropic/claude-sonnet-4-5",
			wantProvider: ProviderAnthropic,
			wantModel:    "anthropic/claude-sonnet-4-5",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := NewAgent(toolv1.Config{}).resolveSettings(tt.provider, tt.model, tt.openaiCompatible, tt.proxyEnabled)
			if got.provider != tt.wantProvider {
				t.Fatalf("provider = %q, want %q", got.provider, tt.wantProvider)
			}
			if got.model != tt.wantModel {
				t.Fatalf("model = %q, want %q", got.model, tt.wantModel)
			}
			if got.openaiCompatible != tt.wantOpenAICompat {
				t.Fatalf("openaiCompatible = %v, want %v", got.openaiCompatible, tt.wantOpenAICompat)
			}
		})
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
