package router

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
)

func TestGeminiRouteCapturesProviderPrefixedModel(t *testing.T) {
	router := chi.NewRouter()
	router.Post(routeGeminiV1BetaGenerateContent, func(w http.ResponseWriter, r *http.Request) {
		if got := chi.URLParam(r, "model"); got != "vertex/gemini-custom" {
			t.Errorf("model path parameter = %q, want %q", got, "vertex/gemini-custom")
		}
		w.WriteHeader(http.StatusNoContent)
	})

	req := httptest.NewRequest(
		http.MethodPost,
		"/gemini/v1beta/models/vertex/gemini-custom:generateContent",
		nil,
	)
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusNoContent)
	}
}
