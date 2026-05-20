package opencode

import "testing"

func TestEnsureProvider(t *testing.T) {
	tests := []struct {
		name     string
		provider string
		proxy    bool
		want     Provider
	}{
		{name: "aiProxy forces plural", provider: "anthropic", proxy: true, want: ProviderPlural},
		{name: "empty defaults to plural", provider: "", proxy: false, want: ProviderPlural},
		{name: "passes through models.dev slug", provider: "anthropic", proxy: false, want: ProviderAnthropic},
		{name: "passes through amazon-bedrock", provider: "amazon-bedrock", proxy: false, want: ProviderAmazonBedrock},
		{name: "passes through google-vertex", provider: "google-vertex", proxy: false, want: ProviderGoogleVertex},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := EnsureProvider(tt.provider, tt.proxy); got != tt.want {
				t.Fatalf("EnsureProvider(%q, %v) = %q, want %q", tt.provider, tt.proxy, got, tt.want)
			}
		})
	}
}
