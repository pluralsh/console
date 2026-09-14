package pi

import (
	"testing"
	"time"

	console "github.com/pluralsh/console/go/client"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
	"github.com/samber/lo"
)

func TestAgentResolveSettings(t *testing.T) {
	tests := []struct {
		name     string
		provider string
		model    string
		endpoint *string
		proxy    bool
		wantProv console.AiProvider
		wantName string
	}{
		{name: "default", wantProv: console.AiProviderOpenai, wantName: defaultModel},
		{name: "native provider", provider: "anthropic", model: "claude-sonnet-4-6", wantProv: console.AiProviderAnthropic, wantName: "claude-sonnet-4-6"},
		{name: "native provider prefix", provider: "anthropic", model: "anthropic/claude-sonnet-4-6", wantProv: console.AiProviderAnthropic, wantName: "claude-sonnet-4-6"},
		{name: "azure responses provider", provider: providerAzure, model: "gpt-4.1", wantProv: console.AiProviderAzure, wantName: "gpt-4.1"},
		{name: "custom endpoint", provider: "litellm", model: "custom-model", endpoint: lo.ToPtr("https://llm.example/v1"), wantProv: console.AiProviderOpenai, wantName: "custom-model"},
		{name: "proxy", provider: "anthropic", model: "gpt-5.4", proxy: true, wantProv: console.AiProviderOpenai, wantName: "openai/gpt-5.4"},
		{name: "proxy preserves provider prefix", model: "openai/gpt-5.4", proxy: true, wantProv: console.AiProviderOpenai, wantName: "openai/gpt-5.4"},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			run := piTestRun(console.AgentRunModeWrite, test.provider, test.model, test.endpoint, test.proxy)
			settings, err := NewAgent(toolv1.Config{Run: run}).ResolveSettings(run)
			if err != nil {
				t.Fatalf("ResolveSettings() error = %v", err)
			}
			if settings.Model.Provider == nil || *settings.Model.Provider != test.wantProv {
				t.Fatalf("provider = %v, want %q", settings.Model.Provider, test.wantProv)
			}
			if settings.Model.Name != test.wantName {
				t.Fatalf("model = %q, want %q", settings.Model.Name, test.wantName)
			}
			if settings.Timeout != 9*time.Minute || settings.Proxy != test.proxy {
				t.Fatalf("settings timeout/proxy = %s/%v", settings.Timeout, settings.Proxy)
			}
		})
	}
}

func TestAgentResolveSettingsRejectsUnsupportedProvider(t *testing.T) {
	for _, provider := range []string{"unsupported", "azure"} {
		t.Run(provider, func(t *testing.T) {
			run := piTestRun(console.AgentRunModeWrite, provider, "model", nil, false)
			_, err := NewAgent(toolv1.Config{Run: run}).ResolveSettings(run)
			if err == nil || err.Error() != `unsupported pi provider "`+provider+`"` {
				t.Fatalf("ResolveSettings() error = %v", err)
			}
		})
	}
}

func TestPiOpenAIAPI(t *testing.T) {
	tests := []struct {
		name   string
		method string
		want   string
	}{
		{name: "chat", method: string(console.OpenAiMethodChat), want: openAICompletionsAPI},
		{name: "responses", method: string(console.OpenAiMethodResponses), want: openAIResponsesAPI},
		{name: "auto", method: string(console.OpenAiMethodAuto), want: openAIResponsesAPI},
		{name: "unset", want: openAIResponsesAPI},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := piOpenAIAPI(tt.method); got != tt.want {
				t.Fatalf("piOpenAIAPI(%q) = %q, want %q", tt.method, got, tt.want)
			}
		})
	}
}

func TestPiOpenAIEndpoint(t *testing.T) {
	tests := []struct {
		name     string
		endpoint string
		provider string
		method   string
		want     string
	}{
		{
			name:     "preserves custom endpoint",
			endpoint: "https://litellm.example/v1",
			provider: providerOpenAI,
			method:   string(console.OpenAiMethodChat),
			want:     "https://litellm.example/v1",
		},
		{
			name:     "chat uses default OpenAI endpoint",
			provider: providerOpenAI,
			method:   string(console.OpenAiMethodChat),
			want:     openAIBaseURL,
		},
		{
			name:     "responses uses default OpenAI endpoint",
			provider: providerOpenAI,
			method:   string(console.OpenAiMethodResponses),
			want:     openAIBaseURL,
		},
		{name: "auto leaves endpoint unset", provider: providerOpenAI},
		{
			name:     "non-OpenAI provider leaves endpoint unset",
			provider: providerAnthropic,
			method:   string(console.OpenAiMethodChat),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := piOpenAIEndpoint(tt.endpoint, tt.provider, tt.method); got != tt.want {
				t.Fatalf("piOpenAIEndpoint() = %q, want %q", got, tt.want)
			}
		})
	}
}
