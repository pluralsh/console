package agent

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
)

func TestWorkbenchMCPProxyInjectsCredentialAndPreservesProtocol(t *testing.T) {
	var received *http.Request
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		received = r.Clone(r.Context())
		body, _ := io.ReadAll(r.Body)
		if string(body) != `{"jsonrpc":"2.0"}` {
			t.Errorf("body = %q", body)
		}
		w.Header().Set("Mcp-Session-Id", "upstream-session")
		w.WriteHeader(http.StatusAccepted)
		_, _ = w.Write([]byte("proxied"))
	}))
	defer upstream.Close()

	token := "user-token"
	handler, err := newTokenProxy(
		upstream.URL+"/mcp/workbench/id?categories=metrics%2Clogs",
		"Bearer",
		func() string { return token },
		nil,
	)
	if err != nil {
		t.Fatalf("newTokenProxy() error = %v", err)
	}

	request := httptest.NewRequest(http.MethodPost, "http://127.0.0.1/workbench/mcp", strings.NewReader(`{"jsonrpc":"2.0"}`))
	request.Header.Set("Authorization", "Bearer agent-visible-token")
	request.Header.Set("Cookie", "secret=cookie")
	request.Header.Set("Mcp-Session-Id", "client-session")
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, request)

	if response.Code != http.StatusAccepted || response.Body.String() != "proxied" {
		t.Fatalf("response = %d %q", response.Code, response.Body.String())
	}
	if response.Header().Get("Mcp-Session-Id") != "upstream-session" {
		t.Fatalf("response session = %q", response.Header().Get("Mcp-Session-Id"))
	}
	if received == nil {
		t.Fatal("upstream did not receive request")
	}
	if received.URL.Path != "/mcp/workbench/id" || received.URL.Query().Get("categories") != "metrics,logs" {
		t.Fatalf("upstream URL = %s", received.URL.String())
	}
	if received.Header.Get("Authorization") != "Bearer user-token" {
		t.Fatalf("authorization = %q", received.Header.Get("Authorization"))
	}
	if received.Header.Get("Cookie") != "" {
		t.Fatalf("cookie leaked upstream: %q", received.Header.Get("Cookie"))
	}
	if received.Header.Get("Mcp-Session-Id") != "client-session" {
		t.Fatalf("request session = %q", received.Header.Get("Mcp-Session-Id"))
	}

	token = "refreshed-token"
	handler.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(
		http.MethodPost,
		"http://127.0.0.1/workbench/mcp",
		strings.NewReader(`{"jsonrpc":"2.0"}`),
	))
	if received.Header.Get("Authorization") != "Bearer refreshed-token" {
		t.Fatalf("refreshed authorization = %q", received.Header.Get("Authorization"))
	}
}

func TestWorkbenchMCPProxyRejectsInvalidConfiguration(t *testing.T) {
	if _, err := newTokenProxy("not-a-url", "Bearer", func() string { return "token" }, nil); err == nil {
		t.Fatal("expected invalid URL error")
	}
	if _, err := newTokenProxy("https://console.example/mcp", "Bearer", func() string { return "" }, nil); err == nil {
		t.Fatal("expected missing token error")
	}
}

func TestWorkbenchMCPProxyKeepsOperatorToolFilter(t *testing.T) {
	var query string
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		query = r.URL.RawQuery
	}))
	defer upstream.Close()

	srv := NewServer(nil, WithWorkbenchMCPProxy(
		upstream.URL+"/mcp/workbench/id?categories=metrics%2Clogs",
		func() string { return "user-token" },
	))

	for _, target := range []string{"", "?tools=raw_kube_get", "?categories=infrastructure"} {
		srv.httpServer.Handler.ServeHTTP(httptest.NewRecorder(), localRequest(
			http.MethodPost,
			common.AgentWorkbenchMCPPath+target,
			strings.NewReader(`{"jsonrpc":"2.0"}`),
		))
		if query != "categories=metrics%2Clogs" {
			t.Fatalf("%q: upstream query = %q", target, query)
		}
	}
}
