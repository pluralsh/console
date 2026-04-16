package tools

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"google.golang.org/protobuf/types/known/timestamppb"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
)

func TestJaegerProvider_TracesUsesServiceQueryAndOptions(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/v3/traces" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		if r.Method != http.MethodPost {
			t.Fatalf("unexpected method: %s", r.Method)
		}

		var body map[string]any
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Fatalf("failed to decode request body: %v", err)
		}

		query, ok := body["query"].(map[string]any)
		if !ok {
			t.Fatalf("missing query body: %v", body)
		}
		if query["service_name"] != "frontend" {
			t.Fatalf("unexpected service_name: %v", query["service_name"])
		}
		if query["operation_name"] != "GET /api/products" {
			t.Fatalf("unexpected operation_name: %v", query["operation_name"])
		}
		if query["duration_min"] != "10ms" {
			t.Fatalf("unexpected duration_min: %v", query["duration_min"])
		}
		if query["duration_max"] != "1s" {
			t.Fatalf("unexpected duration_max: %v", query["duration_max"])
		}
		if query["search_depth"] != float64(25) {
			t.Fatalf("unexpected search_depth: %v", query["search_depth"])
		}

		attrs, ok := query["attributes"].(map[string]any)
		if !ok {
			t.Fatalf("missing attributes in query: %v", query)
		}
		if attrs["http.status_code"] != "500" {
			t.Fatalf("unexpected attributes: %v", attrs)
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{
			"result": {
				"resourceSpans": [{
					"resource": {
						"attributes": [{
							"key": "service.name",
							"value": {"stringValue": "frontend"}
						}]
					},
					"scopeSpans": [{
						"spans": [{
							"traceId": "trace-1",
							"spanId": "span-1",
							"parentSpanId": "parent-1",
							"name": "GET /api/products",
							"startTimeUnixNano": "1712000000000000000",
							"endTimeUnixNano": "1712000000001000000",
							"attributes": [{
								"key": "http.status_code",
								"value": {"stringValue": "500"}
							}]
						}]
					}]
				}]
			}
		}`))
	}))
	defer ts.Close()

	provider := NewJaegerProvider(&toolquery.JaegerConnection{
		Url:      ts.URL,
		Username: strPtr("user"),
		Password: strPtr("pass"),
	})
	limit := int32(25)

	resp, err := provider.Traces(context.Background(), &toolquery.TracesQueryInput{
		Query: "frontend",
		Range: &toolquery.TimeRange{
			Start: timestamppb.Now(),
			End:   timestamppb.Now(),
		},
		Limit: &limit,
		Options: &toolquery.TracesOptions{
			Jaeger: &toolquery.JaegerTracesOptions{
				OperationName: strPtr("GET /api/products"),
				DurationMin:   strPtr("10ms"),
				DurationMax:   strPtr("1s"),
				Attributes: []*toolquery.JaegerTraceQueryAttribute{
					{Name: "http.status_code", Value: "500"},
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("provider traces failed: %v", err)
	}
	if got := len(resp.GetSpans()); got != 1 {
		t.Fatalf("expected 1 span, got %d", got)
	}
	if resp.GetSpans()[0].GetService() != "frontend" {
		t.Fatalf("unexpected span service: %s", resp.GetSpans()[0].GetService())
	}
}

func strPtr(s string) *string {
	return &s
}
