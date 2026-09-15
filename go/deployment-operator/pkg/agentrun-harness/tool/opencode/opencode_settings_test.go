package opencode

import (
	"testing"

	console "github.com/pluralsh/console/go/client"
)

func TestResolveOpenCodeSettings(t *testing.T) {
	tests := []struct {
		name             string
		provider         string
		model            string
		method           string
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
			name:             "aiProxy chat uses openai compatible sdk",
			provider:         "openai-compatible",
			model:            "gpt-4",
			method:           string(console.OpenAiMethodChat),
			proxyEnabled:     true,
			wantProvider:     ProviderPlural,
			wantModel:        "openai/gpt-4",
			wantOpenAICompat: true,
		},
		{
			name:         "aiProxy responses uses standard openai sdk",
			model:        "gpt-5.4",
			method:       string(console.OpenAiMethodResponses),
			proxyEnabled: true,
			wantProvider: ProviderPlural,
			wantModel:    "openai/gpt-5.4",
		},
		{
			name:             "custom openaiCompatible auto uses compatible sdk",
			provider:         "litellm",
			model:            "gpt-4",
			openaiCompatible: true,
			wantProvider:     ProviderOpenAICompatible,
			wantModel:        "gpt-4",
			wantOpenAICompat: true,
		},
		{
			name:             "custom openaiCompatible responses uses standard sdk",
			model:            "gpt-5.4",
			method:           string(console.OpenAiMethodResponses),
			openaiCompatible: true,
			wantProvider:     ProviderOpenAICompatible,
			wantModel:        "gpt-5.4",
		},
		{
			name:             "native openai chat uses compatible sdk",
			provider:         "openai",
			model:            "gpt-4",
			method:           string(console.OpenAiMethodChat),
			wantProvider:     ProviderOpenAI,
			wantModel:        "gpt-4",
			wantOpenAICompat: true,
		},
		{
			name:         "native provider passes through slug",
			provider:     "anthropic",
			model:        "claude-sonnet-4-5",
			wantProvider: ProviderAnthropic,
			wantModel:    "claude-sonnet-4-5",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := resolveOpenCodeSettings(tt.provider, tt.model, tt.method, tt.openaiCompatible, tt.proxyEnabled)
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
