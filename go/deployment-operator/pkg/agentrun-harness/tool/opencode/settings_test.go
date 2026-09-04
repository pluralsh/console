package opencode

import (
	"testing"

	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

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
