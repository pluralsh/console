package exa

import (
	"net/http"
	"strings"
	"testing"
)

func TestJSONResponseToYAML(t *testing.T) {
	out, err := jsonResponseToYAML([]byte(`{"requestId":"abc","results":[{"title":"Example","url":"https://example.com"}]}`))
	if err != nil {
		t.Fatalf("jsonResponseToYAML() failed: %v", err)
	}

	if !strings.Contains(out, "requestId: abc") {
		t.Fatalf("expected yaml requestId field, got %q", out)
	}
	if !strings.Contains(out, "title: Example") {
		t.Fatalf("expected yaml nested result field, got %q", out)
	}
}

func TestNewClientInvalidProxyURL(t *testing.T) {
	if _, err := NewClient(Connection{ProxyURL: "://bad"}); err == nil {
		t.Fatal("expected invalid proxy url error")
	}
}

func TestNewClientProxyTransport(t *testing.T) {
	client, err := NewClient(Connection{ProxyURL: "http://proxy.example:8080"})
	if err != nil {
		t.Fatalf("NewClient() failed: %v", err)
	}

	transport, ok := client.http.Transport.(*http.Transport)
	if !ok {
		t.Fatalf("expected *http.Transport, got %T", client.http.Transport)
	}
	if transport.Proxy == nil {
		t.Fatal("expected proxy function on transport")
	}
}
