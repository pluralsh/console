package tools

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"

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

func TestDynatraceProvider_LogAggregate(t *testing.T) {
	start := time.Date(2026, time.September, 8, 12, 0, 0, 0, time.UTC)
	end := start.Add(time.Hour)
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var body map[string]any
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Fatalf("failed to decode execute body: %v", err)
		}
		const expectedQuery = "fetch logs | filter loglevel == \"ERROR\" | filter `k8s.namespace.name` == \"prod\" or `k8s.pod.name` == \"api\" | summarize count = count(), by:{timestamp = bin(timestamp, 5m)}"
		if body["query"] != expectedQuery {
			t.Fatalf("aggregate query = %q, want %q", body["query"], expectedQuery)
		}
		if body["defaultTimeframeStart"] != start.Format(time.RFC3339Nano) {
			t.Fatalf("defaultTimeframeStart = %v", body["defaultTimeframeStart"])
		}
		if body["defaultTimeframeEnd"] != end.Format(time.RFC3339Nano) {
			t.Fatalf("defaultTimeframeEnd = %v", body["defaultTimeframeEnd"])
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{
			"state":"SUCCEEDED",
			"result":{"records":[
				{"timestamp":"2026-09-08T12:05:00Z","count":7},
				{"timestamp":"2026-09-08T12:00:00Z","count":3}
			]}
		}`))
	}))
	defer ts.Close()

	provider := NewDynatraceProvider(&toolquery.DynatraceConnection{
		Url:           ts.URL,
		PlatformToken: "test-token",
	})
	output, err := provider.LogAggregate(context.Background(), &toolquery.LogAggregateInput{
		Query:      `fetch logs | filter loglevel == "ERROR"`,
		Range:      aggregateTestTimeRange(start, end),
		BucketSize: "5m",
		Operator:   toolquery.LogQueryOperator_LOG_QUERY_OPERATOR_OR,
		Facets: []*toolquery.LogsQueryFacet{
			{Name: "k8s.namespace.name", Value: "prod"},
			{Name: "k8s.pod.name", Value: "api"},
		},
	})
	if err != nil {
		t.Fatalf("LogAggregate() error = %v", err)
	}
	assertProviderAggregateBuckets(t, output, []aggregateTestBucket{
		{timestamp: start, count: 3},
		{timestamp: start.Add(5 * time.Minute), count: 7},
	})
}

type aggregateTestBucket struct {
	timestamp time.Time
	count     int64
}

func aggregateTestTimeRange(start, end time.Time) *toolquery.TimeRange {
	return &toolquery.TimeRange{
		Start: timestamppb.New(start),
		End:   timestamppb.New(end),
	}
}

func assertProviderAggregateBuckets(t *testing.T, output *toolquery.LogAggregateOutput, expected []aggregateTestBucket) {
	t.Helper()
	if len(output.GetBuckets()) != len(expected) {
		t.Fatalf("bucket count = %d, want %d", len(output.GetBuckets()), len(expected))
	}
	for i, want := range expected {
		got := output.GetBuckets()[i]
		if !got.GetTimestamp().AsTime().Equal(want.timestamp) {
			t.Errorf("bucket[%d] timestamp = %s, want %s", i, got.GetTimestamp().AsTime(), want.timestamp)
		}
		if got.GetCount() != want.count {
			t.Errorf("bucket[%d] count = %d, want %d", i, got.GetCount(), want.count)
		}
	}
}
