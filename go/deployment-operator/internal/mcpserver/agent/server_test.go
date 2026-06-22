package agent

import (
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

	srv := NewServer(nil, WithOpenAIProxy(upstream.URL, upstream.URL))

	mux, ok := srv.httpServer.Handler.(*http.ServeMux)
	if !ok {
		t.Fatalf("expected *http.ServeMux handler, got %T", srv.httpServer.Handler)
	}

	req := httptest.NewRequest(http.MethodPost, common.AgentOpenAIChatCompletionsPath, strings.NewReader(`{"model":"gpt-4","messages":[]}`))
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

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

	srv := NewServer(nil, WithOpenAIProxy("", upstream.URL))

	req := httptest.NewRequest(http.MethodPost, common.AgentOpenAIResponsesPath, strings.NewReader(`{"model":"gpt-5.4","input":"hi"}`))
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
	rec := httptest.NewRecorder()
	srv.httpServer.Handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", rec.Code)
	}
}
