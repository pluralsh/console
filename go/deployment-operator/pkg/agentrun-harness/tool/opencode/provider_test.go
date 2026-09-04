package opencode

import (
	"testing"

	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

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
