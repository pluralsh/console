package scm

import (
	"net/http"
	"net/url"
	"testing"
)

func TestSCMClientUsesExplicitProxyTransport(t *testing.T) {
	client := NewClient(
		"token",
		WithHTTPProxy("http://proxy.example.com:8080", "github.internal"),
	).(*dispatchClient).httpClient
	transport := client.Transport.(*http.Transport)

	proxy, err := transport.Proxy(&http.Request{URL: mustURL(t, "https://github.com/org/repo")})
	if err != nil {
		t.Fatalf("Proxy() error = %v", err)
	}
	if proxy == nil || proxy.String() != "http://proxy.example.com:8080" {
		t.Fatalf("Proxy() = %v, want configured proxy", proxy)
	}

	proxy, err = transport.Proxy(&http.Request{URL: mustURL(t, "https://github.internal/org/repo")})
	if err != nil {
		t.Fatalf("Proxy() no-proxy error = %v", err)
	}
	if proxy != nil {
		t.Fatalf("Proxy() = %v, want no proxy for excluded host", proxy)
	}
}

func TestSCMClientDoesNotInheritProxyEnvironment(t *testing.T) {
	t.Setenv("HTTP_PROXY", "http://container-proxy.example.com:8080")
	t.Setenv("HTTPS_PROXY", "http://container-proxy.example.com:8080")

	client := NewClient("token").(*dispatchClient).httpClient
	transport := client.Transport.(*http.Transport)
	if transport.Proxy != nil {
		t.Fatal("SCM transport inherited process-wide proxy configuration")
	}
}

func mustURL(t *testing.T, raw string) *url.URL {
	t.Helper()
	parsed, err := url.Parse(raw)
	if err != nil {
		t.Fatalf("url.Parse(%q): %v", raw, err)
	}
	return parsed
}
