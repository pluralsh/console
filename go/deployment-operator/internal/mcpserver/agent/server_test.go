package agent

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
)

func TestServerRegistersOpenAIProxyRoute(t *testing.T) {
	t.Parallel()

	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"id":"chatcmpl-1","object":"chat.completion","choices":[]}`))
	}))
	defer upstream.Close()

	srv := NewServer(nil, WithOpenAIProxy(upstream.URL, upstream.URL, func() string { return "plural-token" }))

	req := httptest.NewRequest(http.MethodPost, common.AgentOpenAIChatCompletionsPath, strings.NewReader(`{"model":"gpt-4","messages":[]}`))
	req.RemoteAddr = "127.0.0.1:34567"
	rec := httptest.NewRecorder()
	srv.httpServer.Handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%q", rec.Code, rec.Body.String())
	}
}

func TestServerRegistersOpenAIResponsesProxyRoute(t *testing.T) {
	t.Parallel()

	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"id":"resp-1","object":"response","status":"completed"}`))
	}))
	defer upstream.Close()

	srv := NewServer(nil, WithOpenAIProxy("", upstream.URL, func() string { return "plural-token" }))

	req := httptest.NewRequest(http.MethodPost, common.AgentOpenAIResponsesPath, strings.NewReader(`{"model":"gpt-5.4","input":"hi"}`))
	req.RemoteAddr = "127.0.0.1:34567"
	rec := httptest.NewRecorder()
	srv.httpServer.Handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%q", rec.Code, rec.Body.String())
	}
}

func TestServerOmitsOpenAIProxyWhenUnset(t *testing.T) {
	t.Parallel()

	srv := NewServer(nil)

	req := httptest.NewRequest(http.MethodPost, common.AgentOpenAIChatCompletionsPath, nil)
	req.RemoteAddr = "127.0.0.1:34567"
	rec := httptest.NewRecorder()
	srv.httpServer.Handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", rec.Code)
	}
}

func TestServerRejectsNonLoopbackCallers(t *testing.T) {
	t.Parallel()

	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("upstream must not be reached by a non-local caller")
	}))
	defer upstream.Close()

	srv := NewServer(nil, WithOpenAIProxy(upstream.URL, "", func() string { return "plural-token" }))

	for _, remote := range []string{"10.1.2.3:4444", "[2001:db8::1]:4444", "not-an-address", ""} {
		req := httptest.NewRequest(http.MethodPost, common.AgentOpenAIChatCompletionsPath, strings.NewReader(`{}`))
		req.RemoteAddr = remote
		rec := httptest.NewRecorder()
		srv.httpServer.Handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusForbidden {
			t.Errorf("remote %q: status = %d, want 403", remote, rec.Code)
		}
	}

	req := httptest.NewRequest(http.MethodPost, "/missing", nil)
	req.RemoteAddr = "[::1]:4444"
	rec := httptest.NewRecorder()
	srv.httpServer.Handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Errorf("ipv6 loopback: status = %d, want 404 (allowed through to the mux)", rec.Code)
	}
}

// localRequest is a request as the server sees one from the agent container: from the pod's loopback.
func localRequest(method, target string, body io.Reader) *http.Request {
	req := httptest.NewRequest(method, target, body)
	req.RemoteAddr = "127.0.0.1:34567"
	return req
}
