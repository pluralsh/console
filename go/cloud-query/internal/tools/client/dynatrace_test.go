package client

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestDynatraceClient_Encoding(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify that the query parameters are correctly encoded in the raw URL
		if !strings.Contains(r.URL.RawQuery, "metricSelector=builtin%3Ahost.cpu.usage%3AsplitBy%28%22dt.entity.host%22%29") {
			t.Errorf("Expected encoded metricSelector in raw query, got: %s", r.URL.RawQuery)
		}
		if !strings.Contains(r.URL.RawQuery, "text=builtin%3Ahost.cpu.usage%3AsplitBy%28%22dt.entity.host%22%29") {
			// This will be checked in the MetricsSearch call
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"result": []}`))
	}))
	defer ts.Close()

	c := NewDynatraceClient(ts.URL, "test-token")
	query := `builtin:host.cpu.usage:splitBy("dt.entity.host")`

	// Test Metrics
	_, err := c.Metrics(context.Background(), query, 123, 456)
	if err != nil {
		t.Fatalf("Metrics call failed: %v", err)
	}

	// Test MetricsSearch
	ts.Config.Handler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.Contains(r.URL.RawQuery, "text=builtin%3Ahost.cpu.usage%3AsplitBy%28%22dt.entity.host%22%29") {
			t.Errorf("Expected encoded text in raw query, got: %s", r.URL.RawQuery)
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"metrics": []}`))
	})

	_, err = c.MetricsSearch(context.Background(), query)
	if err != nil {
		t.Fatalf("MetricsSearch call failed: %v", err)
	}
}
