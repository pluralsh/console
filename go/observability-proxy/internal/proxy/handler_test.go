package proxy

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/pluralsh/console/go/observability-proxy/internal/console"
	"github.com/pluralsh/console/go/observability-proxy/internal/ratelimit"
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
	handler := NewHandler(provider, 5*time.Second, ratelimit.NewIPLimiter(100, 100))

	mux := http.NewServeMux()
	handler.Register(mux)

	req := httptest.NewRequest(http.MethodDelete, "/ext/v1/ingest/elastic/_bulk", nil)
	rec := httptest.NewRecorder()

	mux.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("unexpected status: got %d want %d", rec.Code, http.StatusNotFound)
	}
}

func TestPrometheusQueryRateLimit(t *testing.T) {
	provider := staticProvider{cfg: console.ObservabilityConfig{PrometheusHost: "http://example.com/select/t/prometheus", ElasticHost: "http://example.com"}}
	limiter := ratelimit.NewIPLimiter(1, 1)

	if !limiter.Allow("1.2.3.4") {
		t.Fatalf("expected warmup allowance")
	}

	handler := NewHandler(provider, 5*time.Second, limiter)
	mux := http.NewServeMux()
	handler.Register(mux)

	req := httptest.NewRequest(http.MethodGet, "/ext/v1/query/prometheus/api/v1/query", nil)
	req.RemoteAddr = "1.2.3.4:12345"
	rec := httptest.NewRecorder()

	mux.ServeHTTP(rec, req)
	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf("unexpected status: got %d want %d", rec.Code, http.StatusTooManyRequests)
	}
}
