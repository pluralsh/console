package agent

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
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
	handler, err := newBearerTokenProxy(
		upstream.URL+"/mcp/workbench/id?categories=metrics%2Clogs",
		func() string { return token },
	)
	if err != nil {
		t.Fatalf("newBearerTokenProxy() error = %v", err)
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
	if _, err := newBearerTokenProxy("not-a-url", func() string { return "token" }); err == nil {
		t.Fatal("expected invalid URL error")
	}
	if _, err := newBearerTokenProxy("https://console.example/mcp", func() string { return "" }); err == nil {
		t.Fatal("expected missing token error")
	}
}

func TestConsoleExtProxyMarksClientAndInjectsToken(t *testing.T) {
	var received *http.Request
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		received = r.Clone(r.Context())
	}))
	defer upstream.Close()

	server := &Server{}
	WithConsoleExtProxy(upstream.URL+"/ext/gql", "deploy-token", "run-id")(server)

	request := httptest.NewRequest(http.MethodPost, "http://127.0.0.1/plural/ext/gql", strings.NewReader(`{}`))
	request.Header.Set(consoleExtClientHeader, "spoofed")
	request.Header.Set(consoleExtAgentRunHeader, "spoofed")
	server.consoleExtProxy.ServeHTTP(httptest.NewRecorder(), request)

	if received == nil {
		t.Fatal("upstream did not receive request")
	}
	if got := received.Header.Get(consoleExtClientHeader); got != consoleExtClient {
		t.Fatalf("%s = %q", consoleExtClientHeader, got)
	}
	if got := received.Header.Get(consoleExtAgentRunHeader); got != "run-id" {
		t.Fatalf("%s = %q", consoleExtAgentRunHeader, got)
	}
	if got := received.Header.Get("Authorization"); got != "Bearer deploy-token" {
		t.Fatalf("authorization = %q", got)
	}
}
