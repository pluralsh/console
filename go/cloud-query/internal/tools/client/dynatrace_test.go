package client

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestDynatraceClient_MetricsUsesGrailQueryAPI(t *testing.T) {
	var executeCalled bool
	var pollCalled bool

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		if strings.HasSuffix(r.URL.Path, "query:execute") {
			executeCalled = true

			var body map[string]any
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				t.Fatalf("failed to decode execute body: %v", err)
			}
			if body["query"] != `timeseries avg(dt.host.cpu.usage), by:{dt.entity.host}, from:now()-10m` {
				t.Fatalf("unexpected query in execute body: %v", body["query"])
			}
			if _, ok := body["defaultTimeframeStart"]; ok {
				t.Fatalf("did not expect defaultTimeframeStart in execute body")
			}
			if _, ok := body["defaultTimeframeEnd"]; ok {
				t.Fatalf("did not expect defaultTimeframeEnd in execute body")
			}

			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"requestToken":"token-123","state":"RUNNING"}`))
			return
		}

		if strings.HasSuffix(r.URL.Path, "query:poll") {
			pollCalled = true
			if r.URL.Query().Get("request-token") != "token-123" {
				t.Fatalf("expected request-token=token-123, got: %s", r.URL.RawQuery)
			}
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{
				"state":"SUCCEEDED",
				"result":{
					"records":[
						{
							"metric":"dt.host.cpu.usage",
							"timestamp":"2021-04-01T15:16:00Z",
							"value":13.37
						}
					]
				}
			}`))
			return
		}

		t.Fatalf("unexpected path: %s", r.URL.Path)
	}))
	defer ts.Close()

	c := NewDynatraceClient(ts.URL, "test-token")
	resp, err := c.Metrics(context.Background(), `timeseries avg(dt.host.cpu.usage), by:{dt.entity.host}, from:now()-10m`)
	if err != nil {
		t.Fatalf("Metrics call failed: %v", err)
	}
	if !executeCalled || !pollCalled {
		t.Fatalf("expected both execute and poll endpoints to be called, got execute=%v poll=%v", executeCalled, pollCalled)
	}
	if got := len(resp.Result.Records); got != 1 {
		t.Fatalf("expected 1 metric record, got %d", got)
	}
}

func TestDynatraceClient_MetricsSearchEncoding(t *testing.T) {
	var executeCalled bool
	var pollCalled bool

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		if strings.HasSuffix(r.URL.Path, "query:execute") {
			executeCalled = true
			var body map[string]any
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				t.Fatalf("failed to decode execute body: %v", err)
			}

			const expectedQuery = `metrics | filter contains(metric.key, "builtin:host.cpu.usage:splitBy(\"dt.entity.host\")", caseSensitive: false) | limit 3`
			if body["query"] != expectedQuery {
				t.Fatalf("unexpected query in execute body: %v", body["query"])
			}
			if _, ok := body["defaultTimeframeStart"]; ok {
				t.Fatalf("did not expect defaultTimeframeStart for metrics search")
			}
			if _, ok := body["defaultTimeframeEnd"]; ok {
				t.Fatalf("did not expect defaultTimeframeEnd for metrics search")
			}

			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"requestToken":"token-123","state":"RUNNING"}`))
			return
		}

		if strings.HasSuffix(r.URL.Path, "query:poll") {
			pollCalled = true
			if r.URL.Query().Get("request-token") != "token-123" {
				t.Fatalf("expected request-token=token-123, got: %s", r.URL.RawQuery)
			}
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{
				"state":"SUCCEEDED",
				"result":{
					"records":[
						{"metric.key":"builtin:host.cpu.usage"},
						{"metric":{"key":"builtin:host.mem.usage"}}
					]
				}
			}`))
			return
		}

		t.Fatalf("unexpected path: %s", r.URL.Path)
	}))
	defer ts.Close()

	c := NewDynatraceClient(ts.URL, "test-token")
	resp, err := c.MetricsSearch(context.Background(), `builtin:host.cpu.usage:splitBy("dt.entity.host")`, 3)
	if err != nil {
		t.Fatalf("MetricsSearch call failed: %v", err)
	}
	if !executeCalled || !pollCalled {
		t.Fatalf("expected both execute and poll endpoints to be called, got execute=%v poll=%v", executeCalled, pollCalled)
	}
	if got := len(resp.Result.Records); got != 2 {
		t.Fatalf("expected 2 records, got %d", got)
	}
}

func TestDynatraceClient_Traces(t *testing.T) {
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
				"state": "SUCCEEDED",
				"result": {
					"records": [
						{
							"span.name": "test-span",
							"start_time": "2021-04-01T15:00:00.000000000Z",
							"end_time": "2021-04-01T15:00:01.000000000Z",
							"trace.id": "trace-1",
							"span.id": "span-1"
						}
					]
				}
			}`))
			return
		}
	}))
	defer ts.Close()

	c := NewDynatraceClient(ts.URL, "test-token")
	res, err := c.Traces(context.Background(), "fetch spans, from:-5m | limit 10")
	if err != nil {
		t.Fatalf("Traces call failed: %v", err)
	}

	if len(res.Result.Records) != 1 {
		t.Fatalf("Expected 1 record, got %v", res)
	}

	record := res.Result.Records[0]
	if record.SpanName != "test-span" {
		t.Errorf("Expected span name 'test-span', got '%v'", record.SpanName)
	}
	if record.TraceID != "trace-1" {
		t.Errorf("Expected trace_id 'trace-1', got '%v'", record.TraceID)
	}
}

func TestDynatraceClient_Logs(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if strings.HasSuffix(r.URL.Path, "query:execute") {
			var body map[string]any
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				t.Fatalf("failed to decode execute body: %v", err)
			}

			if body["query"] == "invalid query" {
				w.WriteHeader(http.StatusBadRequest)
				w.Write([]byte(`{"error":{"message":"invalid query"}}`))
				return
			}

			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"requestToken":"token-123","state":"RUNNING"}`))
			return
		}
		if strings.HasSuffix(r.URL.Path, "query:poll") {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{
				"state": "SUCCEEDED",
				"result": {
					"records": [
						{
							"content": "test-log",
							"timestamp": "2021-04-01T15:16:00Z",
							"custom.field": "custom-value"
						}
					]
				}
			}`))
			return
		}
	}))
	defer ts.Close()

	c := NewDynatraceClient(ts.URL, "test-token")
	res, err := c.Logs(context.Background(), "fetch logs, from:-5m | filter loglevel == \"ERROR\" | limit 10")
	if err != nil {
		t.Fatalf("Logs call failed: %v", err)
	}

	if len(res.Result.Records) != 1 {
		t.Fatalf("Expected 1 record, got %v", res)
	}

	record := res.Result.Records[0]
	if record.Content != "test-log" {
		t.Errorf("Expected content 'test-log', got '%v'", record.Content)
	}
	if record.Fields["custom.field"] != "custom-value" {
		t.Errorf("Expected custom.field 'custom-value', got '%v'", record.Fields["custom.field"])
	}

	// Test invalid query
	_, err = c.Logs(context.Background(), "invalid query")
	if err == nil {
		t.Error("Expected error for invalid logs query, got nil")
	}
}
