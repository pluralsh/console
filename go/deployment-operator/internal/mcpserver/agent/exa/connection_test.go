package exa

import (
	"testing"

	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
)

func TestResolveConnectionUsesScmFallback(t *testing.T) {
	conn, enabled := ResolveConnection("{}", &console.ScmCredentialFragment{
		ExaKey: lo.ToPtr("scm-key"),
	})
	if !enabled {
		t.Fatal("expected exa connection to be enabled")
	}
	if conn.ApiKey != "scm-key" {
		t.Fatalf("expected scm fallback key, got %q", conn.ApiKey)
	}
}

func TestResolveConnectionPrefersConfiguredKey(t *testing.T) {
	raw := `{"apiKey":"runtime-key"}`
	conn, enabled := ResolveConnection(raw, nil)
	if !enabled {
		t.Fatal("expected exa connection to be enabled")
	}
	if conn.ApiKey != "runtime-key" {
		t.Fatalf("expected runtime key, got %q", conn.ApiKey)
	}
}

func TestResolveConnectionPropagatesProxyURL(t *testing.T) {
	raw := `{"proxyUrl":"http://proxy.example:8080"}`
	conn, enabled := ResolveConnection(raw, nil)
	if !enabled {
		t.Fatal("expected exa connection to be enabled")
	}
	if conn.ProxyURL != "http://proxy.example:8080" {
		t.Fatalf("expected proxy url, got %q", conn.ProxyURL)
	}
}
