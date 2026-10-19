package agent

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
)

func TestConsoleAIProxyInjectsTokenAndKeepsPath(t *testing.T) {
	var received *http.Request
	var body string
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		received = r.Clone(r.Context())
		content, _ := io.ReadAll(r.Body)
		body = string(content)
		_, _ = w.Write([]byte("ok"))
	}))
	defer upstream.Close()

	token := "plural-token"
	srv := NewServer(nil, WithConsoleAIProxy(upstream.URL+"/ext/ai", func() string { return token }))

	request := localRequest(http.MethodPost, common.AgentConsoleAIPath+"anthropic/v1/messages?beta=true", strings.NewReader(`{"model":"claude"}`))
	request.Header.Set("Authorization", "Bearer "+common.AgentAIProxyAPIKey)
	request.Header.Set("X-Api-Key", common.AgentAIProxyAPIKey)
	response := httptest.NewRecorder()
	srv.httpServer.Handler.ServeHTTP(response, request)

	if response.Code != http.StatusOK || received == nil {
		t.Fatalf("status = %d, upstream received = %v", response.Code, received != nil)
	}
	if received.URL.Path != "/ext/ai/anthropic/v1/messages" || received.URL.RawQuery != "beta=true" {
		t.Fatalf("upstream URL = %s", received.URL.String())
	}
	if got := received.Header.Get("Authorization"); got != "Bearer plural-token" {
		t.Fatalf("authorization = %q", got)
	}
	if got := received.Header.Get("X-Api-Key"); got != "" {
		t.Fatalf("x-api-key leaked upstream: %q", got)
	}
	if body != `{"model":"claude"}` {
		t.Fatalf("body = %q", body)
	}

	token = "refreshed-token"
	srv.httpServer.Handler.ServeHTTP(httptest.NewRecorder(), localRequest(http.MethodGet, common.AgentConsoleAIPath+"v1/models", nil))
	if got := received.Header.Get("Authorization"); got != "Bearer refreshed-token" {
		t.Fatalf("refreshed authorization = %q", got)
	}
}

func TestConsoleAIProxyRejectsPathsOutsideAI(t *testing.T) {
	called := false
	upstream := httptest.NewServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) { called = true }))
	defer upstream.Close()

	handler, err := newConsoleAIProxy(common.AgentConsoleAIPath, upstream.URL+"/ext/ai", func() string { return "plural-token" })
	if err != nil {
		t.Fatal(err)
	}

	for _, target := range []string{
		common.AgentConsoleAIPath + "../gql",
		common.AgentConsoleAIPath + "%2e%2e/gql",
		common.AgentConsoleAIPath + "v1/./../../gql",
		"/plural/ext/gql",
	} {
		response := httptest.NewRecorder()
		handler.ServeHTTP(response, httptest.NewRequest(http.MethodPost, "http://127.0.0.1"+target, nil))
		if response.Code != http.StatusForbidden {
			t.Errorf("%s: status = %d, want 403", target, response.Code)
		}
	}
	if called {
		t.Fatal("upstream was called")
	}
}

func TestOpenAIProxyReplacesCallerCredential(t *testing.T) {
	var authorization string
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authorization = r.Header.Get("Authorization")
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"id":"chatcmpl-1","object":"chat.completion","choices":[]}`))
	}))
	defer upstream.Close()

	srv := NewServer(nil, WithOpenAIProxy(upstream.URL, "", func() string { return "plural-token" }))

	request := localRequest(http.MethodPost, common.AgentOpenAIChatCompletionsPath, strings.NewReader(`{"model":"gpt-4","messages":[]}`))
	request.Header.Set("Authorization", "Bearer "+common.AgentAIProxyAPIKey)
	srv.httpServer.Handler.ServeHTTP(httptest.NewRecorder(), request)

	if authorization != "Bearer plural-token" {
		t.Fatalf("authorization = %q", authorization)
	}
}
