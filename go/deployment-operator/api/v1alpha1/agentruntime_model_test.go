package v1alpha1

import (
	"encoding/json"
	"testing"

	console "github.com/pluralsh/console/go/client"
	proxymodel "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/model"
	"github.com/samber/lo"
)

func TestAgentRuntimeAttributesModel(t *testing.T) {
	tests := []struct {
		name    string
		runtime *AgentRuntime
		want    *console.WorkbenchJobModelAttributes
	}{
		{
			name: "omits model when aiProxy is disabled",
			runtime: agentRuntimeWithModel(console.AgentRuntimeTypeClaude, false, &AgentRuntimeConfig{
				Claude: &ClaudeConfig{Model: lo.ToPtr("claude-sonnet-4-5")},
			}),
			want: nil,
		},
		{
			name: "omits model when none is configured",
			runtime: agentRuntimeWithModel(console.AgentRuntimeTypeCodex, true, &AgentRuntimeConfig{
				Codex: &CodexConfig{},
			}),
			want: nil,
		},
		{
			name: "parses provider/slug syntax",
			runtime: agentRuntimeWithModel(console.AgentRuntimeTypeCodex, true, &AgentRuntimeConfig{
				Codex: &CodexConfig{Model: lo.ToPtr("anthropic/claude-sonnet-4-5")},
			}),
			want: &console.WorkbenchJobModelAttributes{
				Provider: console.AiProviderAnthropic,
				Model:    "claude-sonnet-4-5",
			},
		},
		{
			name: "uses claude default provider for a bare model",
			runtime: agentRuntimeWithModel(console.AgentRuntimeTypeClaude, true, &AgentRuntimeConfig{
				Claude: &ClaudeConfig{Model: lo.ToPtr("claude-sonnet-4-5")},
			}),
			want: &console.WorkbenchJobModelAttributes{
				Provider: console.AiProviderAnthropic,
				Model:    "claude-sonnet-4-5",
			},
		},
		{
			name: "uses openai default provider for codex",
			runtime: agentRuntimeWithModel(console.AgentRuntimeTypeCodex, true, &AgentRuntimeConfig{
				Codex: &CodexConfig{Model: lo.ToPtr("gpt-5.4")},
			}),
			want: &console.WorkbenchJobModelAttributes{
				Provider: console.AiProviderOpenai,
				Model:    "gpt-5.4",
			},
		},
		{
			name: "uses openai default provider for opencode",
			runtime: agentRuntimeWithModel(console.AgentRuntimeTypeOpencode, true, &AgentRuntimeConfig{
				OpenCode: &OpenCodeConfig{Model: lo.ToPtr("gpt-5.4")},
			}),
			want: &console.WorkbenchJobModelAttributes{
				Provider: console.AiProviderOpenai,
				Model:    "gpt-5.4",
			},
		},
		{
			name: "uses openai default provider for pi",
			runtime: agentRuntimeWithModel(console.AgentRuntimeTypePi, true, &AgentRuntimeConfig{
				Pi: &PiConfig{Model: lo.ToPtr("gpt-5.4")},
			}),
			want: &console.WorkbenchJobModelAttributes{
				Provider: console.AiProviderOpenai,
				Model:    "gpt-5.4",
			},
		},
		{
			name: "uses vertex default provider for gemini",
			runtime: agentRuntimeWithModel(console.AgentRuntimeTypeGemini, true, &AgentRuntimeConfig{
				Gemini: &GeminiConfig{Model: lo.ToPtr("gemini-2.5-pro")},
			}),
			want: &console.WorkbenchJobModelAttributes{
				Provider: console.AiProviderVertex,
				Model:    "gemini-2.5-pro",
			},
		},
		{
			name: "maps openai-compatible provider slug",
			runtime: agentRuntimeWithModel(console.AgentRuntimeTypeOpencode, true, &AgentRuntimeConfig{
				OpenCode: &OpenCodeConfig{Model: lo.ToPtr("openai-compatible/custom-model")},
			}),
			want: &console.WorkbenchJobModelAttributes{
				Provider: console.AiProviderOpenaiCompatible,
				Model:    "custom-model",
			},
		},
		{
			name: "keeps slug path after the provider prefix",
			runtime: agentRuntimeWithModel(console.AgentRuntimeTypeGemini, true, &AgentRuntimeConfig{
				Gemini: &GeminiConfig{Model: lo.ToPtr("vertex/publishers/google/models/gemini-2.5-pro")},
			}),
			want: &console.WorkbenchJobModelAttributes{
				Provider: console.AiProviderVertex,
				Model:    "publishers/google/models/gemini-2.5-pro",
			},
		},
		{
			name: "omits model for custom runtime without a provider prefix",
			runtime: agentRuntimeWithModel(console.AgentRuntimeTypeCustom, true, &AgentRuntimeConfig{
				OpenCode: &OpenCodeConfig{Model: lo.ToPtr("gpt-5.4")},
			}),
			want: nil,
		},
		{
			name: "omits model for an unknown provider prefix",
			runtime: agentRuntimeWithModel(console.AgentRuntimeTypeCodex, true, &AgentRuntimeConfig{
				Codex: &CodexConfig{Model: lo.ToPtr("unknown/gpt-5.4")},
			}),
			want: nil,
		},
		{
			name: "omits model when the type-specific config is missing",
			runtime: agentRuntimeWithModel(console.AgentRuntimeTypeClaude, true, &AgentRuntimeConfig{
				Codex: &CodexConfig{Model: lo.ToPtr("gpt-5.4")},
			}),
			want: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.runtime.Attributes().Model
			if tt.want == nil {
				if got != nil {
					t.Fatalf("Model = %+v, want nil", got)
				}
				return
			}
			if got == nil {
				t.Fatal("Model is nil")
			}
			if got.Provider != tt.want.Provider || got.Model != tt.want.Model {
				t.Fatalf("Model = {%s %s}, want {%s %s}", got.Provider, got.Model, tt.want.Provider, tt.want.Model)
			}
		})
	}
}

func TestDefaultModelProviderMatchesProxyProvider(t *testing.T) {
	types := []console.AgentRuntimeType{
		console.AgentRuntimeTypeClaude,
		console.AgentRuntimeTypeCodex,
		console.AgentRuntimeTypeOpencode,
		console.AgentRuntimeTypePi,
		console.AgentRuntimeTypeGemini,
		console.AgentRuntimeTypeCustom,
	}
	for _, runtimeType := range types {
		if got, want := defaultModelProvider(runtimeType), proxymodel.ProxyProvider(runtimeType); got != want {
			t.Fatalf("defaultModelProvider(%s) = %q, want %q", runtimeType, got, want)
		}
	}
}

func TestAgentRuntimeDiffHashesConsoleAttributes(t *testing.T) {
	hasher := func(v any) (string, error) {
		data, err := json.Marshal(v)
		if err != nil {
			return "", err
		}
		return string(data), nil
	}
	runtime := agentRuntimeWithModel(console.AgentRuntimeTypeCodex, true, &AgentRuntimeConfig{
		Codex: &CodexConfig{Model: lo.ToPtr("gpt-5.4")},
	})
	runtime.Spec.Dind = lo.ToPtr(true)

	changed, sha, err := runtime.Diff(hasher)
	if err != nil {
		t.Fatalf("Diff() error = %v", err)
	}
	if !changed {
		t.Fatal("expected first Diff to report a change")
	}

	runtime.Status.SHA = &sha
	changed, _, err = runtime.Diff(hasher)
	if err != nil {
		t.Fatalf("Diff() error = %v", err)
	}
	if changed {
		t.Fatal("expected unchanged attributes to skip upsert")
	}

	runtime.Spec.Dind = lo.ToPtr(false)
	changed, _, err = runtime.Diff(hasher)
	if err != nil {
		t.Fatalf("Diff() error = %v", err)
	}
	if changed {
		t.Fatal("expected spec fields that are not sent to Console to skip upsert")
	}

	runtime.Spec.Config.Codex.Model = lo.ToPtr("gpt-5")
	changed, _, err = runtime.Diff(hasher)
	if err != nil {
		t.Fatalf("Diff() error = %v", err)
	}
	if !changed {
		t.Fatal("expected model change to trigger upsert")
	}
}

func agentRuntimeWithModel(runtimeType console.AgentRuntimeType, aiProxy bool, config *AgentRuntimeConfig) *AgentRuntime {
	return &AgentRuntime{
		Spec: AgentRuntimeSpec{
			Type:    runtimeType,
			AiProxy: lo.ToPtr(aiProxy),
			Config:  config,
		},
	}
}
