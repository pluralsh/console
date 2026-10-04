package server

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/stretchr/testify/assert"
)

func TestStripPrefixExcept(t *testing.T) {
	r := chi.NewRouter()
	r.Use(stripPrefixExcept("/ext/ai", "/health", "/healthz", "/ready"))
	r.Get("/health", HealthHandler())
	r.Get("/healthz", HealthHandler())
	r.Get("/ready", ReadyHandler(nil))
	r.Get("/v1/models", func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) })

	cases := []struct {
		path string
		code int
	}{
		{"/ext/ai/health", http.StatusOK},
		{"/health", http.StatusOK},
		{"/ext/ai/healthz", http.StatusOK},
		{"/healthz", http.StatusOK},
		{"/ext/ai/ready", http.StatusOK},
		{"/ready", http.StatusOK},
		{"/ext/ai/v1/models", http.StatusOK},
		{"/v1/models", http.StatusNotFound},
	}

	for _, tc := range cases {
		t.Run(tc.path, func(t *testing.T) {
			w := httptest.NewRecorder()
			r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, tc.path, nil))
			assert.Equal(t, tc.code, w.Code)
		})
	}
}
