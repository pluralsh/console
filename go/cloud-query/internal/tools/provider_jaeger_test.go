package tools

import (
	"context"
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
		if r.Method != http.MethodGet {
			t.Fatalf("unexpected method: %s", r.Method)
		}

		q := r.URL.Query()
		if q.Get("query.service_name") != "frontend" {
			t.Fatalf("unexpected query.service_name: %v", q.Get("query.service_name"))
		}
		if q.Get("query.operation_name") != "GET /api/products" {
			t.Fatalf("unexpected query.operation_name: %v", q.Get("query.operation_name"))
		}
		if q.Get("query.duration_min") != "10ms" {
			t.Fatalf("unexpected query.duration_min: %v", q.Get("query.duration_min"))
		}
		if q.Get("query.duration_max") != "1s" {
			t.Fatalf("unexpected query.duration_max: %v", q.Get("query.duration_max"))
		}
		if q.Get("query.search_depth") != "25" {
			t.Fatalf("unexpected query.search_depth: %v", q.Get("query.search_depth"))
		}
		if q.Get("query.attributes") == "" {
			t.Fatalf("missing query.attributes")
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
