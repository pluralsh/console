package proxy

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/pluralsh/console/go/observability-proxy/internal/console"
)

type staticProvider struct {
	cfg console.ObservabilityConfig
}

func (s staticProvider) GetConfig(context.Context) (console.ObservabilityConfig, error) {
	return s.cfg, nil
}

func (s staticProvider) Ready() bool { return true }

func TestElasticRouteValidation(t *testing.T) {
	provider := staticProvider{cfg: console.ObservabilityConfig{PrometheusHost: "http://example.com/select/t/prometheus", ElasticHost: "http://example.com"}}
	handler := NewHandler(provider, 5*time.Second)

	mux := http.NewServeMux()
	handler.Register(mux)

	req := httptest.NewRequest(http.MethodDelete, "/ext/v1/ingest/elastic/_bulk", nil)
	rec := httptest.NewRecorder()

	mux.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("unexpected status: got %d want %d", rec.Code, http.StatusNotFound)
	}
}
