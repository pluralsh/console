package opencode

import "testing"

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
			name:         "native provider passes through slug",
			provider:     "anthropic",
			model:        "claude-sonnet-4-5",
			wantProvider: ProviderAnthropic,
			wantModel:    "claude-sonnet-4-5",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := resolveOpenCodeSettings(tt.provider, tt.model, tt.openaiCompatible, tt.proxyEnabled)
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
