package model

import (
	"testing"

	console "github.com/pluralsh/console/go/client"
)

func TestProxyProvider(t *testing.T) {
	tests := []struct {
		runtimeType console.AgentRuntimeType
		want        string
	}{
		{console.AgentRuntimeTypeClaude, "anthropic"},
		{console.AgentRuntimeTypeCodex, "openai"},
		{console.AgentRuntimeTypeOpencode, "openai"},
		{console.AgentRuntimeTypeGemini, "vertex"},
		{console.AgentRuntimeTypeCustom, ""},
	}

	for _, tt := range tests {
		t.Run(string(tt.runtimeType), func(t *testing.T) {
			if got := ProxyProvider(tt.runtimeType); got != tt.want {
				t.Fatalf("ProxyProvider(%q) = %q, want %q", tt.runtimeType, got, tt.want)
			}
		})
	}
}

func TestProxyModel(t *testing.T) {
	tests := []struct {
		name        string
		runtimeType console.AgentRuntimeType
		model       string
		want        string
	}{
		{
			name:        "codex joins openai and bare model",
			runtimeType: console.AgentRuntimeTypeCodex,
			model:       "gpt-5.4",
			want:        "openai/gpt-5.4",
		},
		{
			name:        "opencode joins openai and bare model",
			runtimeType: console.AgentRuntimeTypeOpencode,
			model:       "gpt-5.4",
			want:        "openai/gpt-5.4",
		},
		{
			name:        "claude joins anthropic and bare model",
			runtimeType: console.AgentRuntimeTypeClaude,
			model:       "claude-sonnet-4-5",
			want:        "anthropic/claude-sonnet-4-5",
		},
		{
			name:        "preserves existing provider prefix",
			runtimeType: console.AgentRuntimeTypeCodex,
			model:       "anthropic/claude-sonnet-4-5",
			want:        "anthropic/claude-sonnet-4-5",
		},
		{
			name:        "returns bare model without known runtime provider",
			runtimeType: console.AgentRuntimeTypeCustom,
			model:       "gpt-5.4",
			want:        "gpt-5.4",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := ProxyModel(tt.runtimeType, tt.model); got != tt.want {
				t.Fatalf("ProxyModel(%q, %q) = %q, want %q", tt.runtimeType, tt.model, got, tt.want)
			}
		})
	}
}
