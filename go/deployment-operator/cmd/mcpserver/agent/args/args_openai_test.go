package args

import "testing"

func TestResolveOpenAIUpstreamURLExplicit(t *testing.T) {
	t.Parallel()

	got := resolveOpenAIUpstreamURL("https://upstream.example/v1/chat/completions", "https://console.example")
	if got != "https://upstream.example/v1/chat/completions" {
		t.Fatalf("resolveOpenAIUpstreamURL() = %q, want explicit upstream", got)
	}
}

func TestResolveOpenAIUpstreamURLDefaultsFromConsole(t *testing.T) {
	t.Parallel()

	got := resolveOpenAIUpstreamURL("", "https://console.example/gql")
	want := "https://console.example/ext/ai/v1/chat/completions"
	if got != want {
		t.Fatalf("resolveOpenAIUpstreamURL() = %q, want %q", got, want)
	}
}

func TestResolveOpenAIUpstreamURLEmptyWithoutConsole(t *testing.T) {
	t.Parallel()

	if got := resolveOpenAIUpstreamURL("", ""); got != "" {
		t.Fatalf("resolveOpenAIUpstreamURL() = %q, want empty", got)
	}
}

func TestOpenAIUpstreamURLUsesRuntimeEnv(t *testing.T) {
	t.Setenv(EnvOpenAIUpstreamURL, "https://runtime.example/v1/chat/completions")
	t.Setenv(EnvConsoleURL, "https://console.example")

	got := OpenAIUpstreamURL()
	if got != "https://runtime.example/v1/chat/completions" {
		t.Fatalf("OpenAIUpstreamURL() = %q, want runtime env value", got)
	}
}
