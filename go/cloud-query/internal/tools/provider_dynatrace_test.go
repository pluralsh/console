package tools

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
)

func TestDynatraceProvider_MetricsFromDqlRecords(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		if strings.HasSuffix(r.URL.Path, "query:execute") {
			var body map[string]any
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				t.Fatalf("failed to decode execute body: %v", err)
			}
			if body["query"] != "timeseries avg(dt.host.cpu.usage), by:{dt.entity.host}" {
				t.Fatalf("unexpected metrics query: %v", body["query"])
			}
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"requestToken":"token-123","state":"RUNNING"}`))
			return
		}
		if strings.HasSuffix(r.URL.Path, "query:poll") {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{
				"state":"SUCCEEDED",
				"result":{
					"metadata": {
						"metrics": [
							{
								"fieldName":"avg(dt.host.cpu.usage)",
								"metric.key":"dt.host.cpu.usage",
								"aggregation":"avg"
							}
						]
					},
					"records":[
						{
							"timeframe":{
								"start":"2021-04-01T15:16:00Z",
								"end":"2021-04-01T15:19:00Z"
							},
							"interval":"60000000000",
							"host.name":"node-1",
							"avg(dt.host.cpu.usage)":[13.37,14.37,null]
						}
					]
				}
			}`))
			return
		}
		t.Fatalf("unexpected path: %s", r.URL.Path)
	}))
	defer ts.Close()

	provider := NewDynatraceProvider(&toolquery.DynatraceConnection{
		Url:           ts.URL,
		PlatformToken: "test-token",
	})

	resp, err := provider.Metrics(context.Background(), &toolquery.MetricsQueryInput{
		Query: "timeseries avg(dt.host.cpu.usage), by:{dt.entity.host}",
	})
	if err != nil {
		t.Fatalf("provider metrics failed: %v", err)
	}

	if got := len(resp.Metrics); got != 2 {
		t.Fatalf("expected 2 metric points, got %d", got)
	}
	if resp.Metrics[0].GetName() != "dt.host.cpu.usage" {
		t.Fatalf("unexpected first metric name: %s", resp.Metrics[0].GetName())
	}
	if resp.Metrics[0].GetLabels()["host.name"] != "node-1" {
		t.Fatalf("unexpected first metric label: %v", resp.Metrics[0].GetLabels())
	}
	if resp.Metrics[1].GetName() != "dt.host.cpu.usage" {
		t.Fatalf("unexpected second metric name: %s", resp.Metrics[1].GetName())
	}
	if resp.Metrics[1].GetValue() != 14.37 {
		t.Fatalf("unexpected second metric value: %v", resp.Metrics[1].GetValue())
	}
}

func TestDynatraceProvider_MetricsSearchFromDqlRecords(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		if strings.HasSuffix(r.URL.Path, "query:execute") {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"requestToken":"token-123","state":"RUNNING"}`))
			return
		}
		if strings.HasSuffix(r.URL.Path, "query:poll") {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{
				"state":"SUCCEEDED",
				"result":{
					"records":[
						{"metric.key":"dt.host.cpu.usage"},
						{"metric.key":"dt.host.mem.usage"},
						{"metric.key":"fallback.metric.name"}
					]
				}
			}`))
			return
		}
		t.Fatalf("unexpected path: %s", r.URL.Path)
	}))
	defer ts.Close()

	provider := NewDynatraceProvider(&toolquery.DynatraceConnection{
		Url:           ts.URL,
		PlatformToken: "test-token",
	})

	resp, err := provider.MetricsSearch(context.Background(), &toolquery.MetricsSearchInput{
		Query: "host",
		Limit: new(int64(3)),
	})
	if err != nil {
		t.Fatalf("provider metrics search failed: %v", err)
	}
	if got := len(resp.GetMetrics()); got != 3 {
		t.Fatalf("expected 3 search results, got %d", got)
	}
	if resp.GetMetrics()[0].GetName() != "dt.host.cpu.usage" {
		t.Fatalf("unexpected first metric name: %s", resp.GetMetrics()[0].GetName())
	}
	if resp.GetMetrics()[1].GetName() != "dt.host.mem.usage" {
		t.Fatalf("unexpected second metric name: %s", resp.GetMetrics()[1].GetName())
	}
	if resp.GetMetrics()[2].GetName() != "fallback.metric.name" {
		t.Fatalf("unexpected third metric name: %s", resp.GetMetrics()[2].GetName())
	}
}
