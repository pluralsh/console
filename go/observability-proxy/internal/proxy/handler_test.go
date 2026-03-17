package proxy

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
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
	handler := NewHandler(provider, 5*time.Second, nil)

	mux := http.NewServeMux()
	handler.Register(mux)

	req := httptest.NewRequest(http.MethodDelete, "/ext/v1/ingest/elastic/_bulk", nil)
	rec := httptest.NewRecorder()

	mux.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("unexpected status: got %d want %d", rec.Code, http.StatusNotFound)
	}
}

func TestPrometheusIngestForwardsExpectedUpstreamPath(t *testing.T) {
	var gotPath string
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		w.WriteHeader(http.StatusNoContent)
	}))
	defer upstream.Close()

	provider := staticProvider{
		cfg: console.ObservabilityConfig{
			PrometheusHost: upstream.URL + "/select/t/prometheus",
			ElasticHost:    "http://example.com",
		},
	}
	handler := NewHandler(provider, 5*time.Second, nil)

	mux := http.NewServeMux()
	handler.Register(mux)

	req := httptest.NewRequest(http.MethodPost, "/ext/v1/ingest/prometheus", strings.NewReader(""))
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("unexpected status: got %d want %d", rec.Code, http.StatusNoContent)
	}
	if gotPath != "/insert/t/prometheus/api/v1/write" {
		t.Fatalf("unexpected upstream path: got %q", gotPath)
	}
}

func TestPrometheusQueryForwardsMappedPathAndQuery(t *testing.T) {
	var gotPath string
	var gotQuery string
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		gotQuery = r.URL.RawQuery
		w.WriteHeader(http.StatusOK)
	}))
	defer upstream.Close()

	provider := staticProvider{
		cfg: console.ObservabilityConfig{
			PrometheusHost: upstream.URL + "/select/t/prometheus",
			ElasticHost:    "http://example.com",
		},
	}
	handler := NewHandler(provider, 5*time.Second, nil)

	mux := http.NewServeMux()
	handler.Register(mux)

	req := httptest.NewRequest(http.MethodGet, "/ext/v1/query/prometheus/api/v1/query?query=up", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("unexpected status: got %d want %d", rec.Code, http.StatusOK)
	}
	if gotPath != "/select/t/prometheus/api/v1/query" {
		t.Fatalf("unexpected upstream path: got %q", gotPath)
	}
	if gotQuery != "query=up" {
		t.Fatalf("unexpected upstream query: got %q", gotQuery)
	}
}

func TestPrometheusIngestCountsRequestBytes(t *testing.T) {
	var counted atomic.Int64
	var addCalls atomic.Int64
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.ReadAll(r.Body)
		w.WriteHeader(http.StatusNoContent)
	}))
	defer upstream.Close()

	provider := staticProvider{
		cfg: console.ObservabilityConfig{
			PrometheusHost: upstream.URL + "/select/t/prometheus",
			ElasticHost:    "http://example.com",
		},
	}
	handler := NewHandler(provider, 5*time.Second, func(n int64) {
		addCalls.Add(1)
		counted.Add(n)
	})

	mux := http.NewServeMux()
	handler.Register(mux)

	body := "abc123"
	req := httptest.NewRequest(http.MethodPost, "/ext/v1/ingest/prometheus", strings.NewReader(body))
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("unexpected status: got %d want %d", rec.Code, http.StatusNoContent)
	}
	if counted.Load() != int64(len(body)) {
		t.Fatalf("unexpected counted bytes: got %d want %d", counted.Load(), len(body))
	}
	if addCalls.Load() != 1 {
		t.Fatalf("unexpected meter call count: got %d want 1", addCalls.Load())
	}
}

func TestPrometheusQueryMethodValidation(t *testing.T) {
	provider := staticProvider{
		cfg: console.ObservabilityConfig{
			PrometheusHost: "http://example.com/select/t/prometheus",
			ElasticHost:    "http://example.com",
		},
	}
	handler := NewHandler(provider, 5*time.Second, nil)

	mux := http.NewServeMux()
	handler.Register(mux)

	req := httptest.NewRequest(http.MethodDelete, "/ext/v1/query/prometheus/api/v1/query?query=up", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("unexpected status: got %d want %d", rec.Code, http.StatusMethodNotAllowed)
	}
}
