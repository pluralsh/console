package tools

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
)

func testTraceFilters() *toolquery.TraceFilters {
	return &toolquery.TraceFilters{
		Service:     strPtr("checkout"),
		Operation:   strPtr("POST /orders"),
		Attributes:  []*toolquery.TraceAttributeFilter{{Name: "http.route", Value: "/orders"}},
		DurationMin: strPtr("250ms"),
		ErrorsOnly:  boolPtr(true),
	}
}

func boolPtr(v bool) *bool { return &v }

func TestCombineTraceQL(t *testing.T) {
	got, err := combineTraceQL("", testTraceFilters())
	if err != nil {
		t.Fatal(err)
	}
	want := `{ resource.service.name = "checkout" && name = "POST /orders" && .http.route = "/orders" && duration >= 250ms && status = error }`
	if got != want {
		t.Fatalf("got %s, want %s", got, want)
	}

	got, err = combineTraceQL(`{ span.db.system = "postgresql" }`, &toolquery.TraceFilters{Service: strPtr("api")})
	if err != nil {
		t.Fatal(err)
	}
	if want := `({ span.db.system = "postgresql" }) && { resource.service.name = "api" }`; got != want {
		t.Fatalf("got %s, want %s", got, want)
	}

	if _, err := combineTraceQL("", &toolquery.TraceFilters{DurationMin: strPtr("soon")}); !errors.Is(err, ErrInvalidArgument) {
		t.Fatalf("expected invalid argument for a bad duration, got %v", err)
	}
}

func TestToDatadogQuery(t *testing.T) {
	got, err := toDatadogQuery("env:prod", testTraceFilters())
	if err != nil {
		t.Fatal(err)
	}
	want := `(env:prod) service:"checkout" resource_name:"POST /orders" @http.route:"/orders" @duration:>=250000000 status:error`
	if got != want {
		t.Fatalf("got %s, want %s", got, want)
	}

	got, _ = toDatadogQuery("env:prod", &toolquery.TraceFilters{TraceId: strPtr("abc")})
	if got != "trace_id:abc" {
		t.Fatalf("trace id should replace the query, got %s", got)
	}

	if got, _ := toDatadogQuery("", nil); got != "*" {
		t.Fatalf("empty query should match everything, got %s", got)
	}
}

func TestToDQLSpans(t *testing.T) {
	start := time.Date(2026, 1, 2, 3, 4, 5, 0, time.UTC)
	got, err := toDQLSpans(testTraceFilters(), &toolquery.TimeRange{
		Start: timestamppb.New(start),
		End:   timestamppb.New(start.Add(time.Hour)),
	}, 50)
	if err != nil {
		t.Fatal(err)
	}
	want := `fetch spans, from:"2026-01-02T03:04:05Z", to:"2026-01-02T04:04:05Z"` +
		` | filter service.name == "checkout" and span.name == "POST /orders" and ` + "`http.route`" +
		` == "/orders" and duration >= 250ms and span.status_code == "error" | limit 50`
	if got != want {
		t.Fatalf("got %s, want %s", got, want)
	}

	got, _ = toDQLSpans(&toolquery.TraceFilters{TraceId: strPtr("abc")}, nil, 0)
	if want := `fetch spans | filter trace.id == toUid("abc")`; got != want {
		t.Fatalf("got %s, want %s", got, want)
	}
}

func TestFacetValues(t *testing.T) {
	two, one := int64(2), int64(1)
	limit := int64(2)
	out := facetValues(&toolquery.TraceFacetsInput{Query: strPtr("SVC"), Limit: &limit}, []*toolquery.TraceFacetValue{
		{Name: "svc-b", Count: &one},
		{Name: "svc-a", Count: &one},
		{Name: "svc-b", Count: &one},
		{Name: "other", Count: &two},
		{Name: "svc-c"},
	})

	names := make([]string, 0)
	for _, v := range out.GetValues() {
		names = append(names, v.GetName())
	}
	if len(names) != 2 || names[0] != "svc-b" || names[1] != "svc-a" {
		t.Fatalf("unexpected facet values: %v", names)
	}
	if out.GetValues()[0].GetCount() != 2 {
		t.Fatalf("duplicate counts should be summed, got %d", out.GetValues()[0].GetCount())
	}
}

const otlpTrace = `{
	"batches": [{
		"resource": {"attributes": [{"key": "service.name", "value": {"stringValue": "checkout"}}]},
		"scopeSpans": [{"spans": [{
			"traceId": "trace-1",
			"spanId": "span-1",
			"name": "POST /orders",
			"startTimeUnixNano": "1712000000000000000",
			"endTimeUnixNano": "1712000000300000000"
		}]}]
	}]
}`

func TestTempoProvider_TracesCompilesFilters(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/api/search":
			if got, want := r.URL.Query().Get("q"), `{ resource.service.name = "checkout" && status = error }`; got != want {
				t.Fatalf("unexpected TraceQL: %s", got)
			}
			_, _ = w.Write([]byte(`{"traces": [{"traceID": "trace-1"}]}`))
		case "/api/traces/trace-1":
			_, _ = w.Write([]byte(otlpTrace))
		default:
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
	}))
	defer ts.Close()

	resp, err := NewTempoProvider(&toolquery.TempoConnection{Url: ts.URL}).Traces(context.Background(), &toolquery.TracesQueryInput{
		Range:   &toolquery.TimeRange{Start: timestamppb.Now(), End: timestamppb.Now()},
		Filters: &toolquery.TraceFilters{Service: strPtr("checkout"), ErrorsOnly: boolPtr(true)},
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(resp.GetSpans()) != 1 || resp.GetSpans()[0].GetService() != "checkout" {
		t.Fatalf("unexpected spans: %v", resp.GetSpans())
	}
}

func TestTempoProvider_TracesFetchesTraceID(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/traces/trace-1" {
			t.Fatalf("expected a direct trace fetch, got %s", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(otlpTrace))
	}))
	defer ts.Close()

	resp, err := NewTempoProvider(&toolquery.TempoConnection{Url: ts.URL}).Traces(context.Background(), &toolquery.TracesQueryInput{
		Filters: &toolquery.TraceFilters{TraceId: strPtr("trace-1")},
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(resp.GetSpans()) != 1 {
		t.Fatalf("expected 1 span, got %d", len(resp.GetSpans()))
	}
}

func TestTempoProvider_TraceFacets(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/api/v2/search/tags":
			_, _ = w.Write([]byte(`{"scopes": [
				{"name": "span", "tags": ["http.route"]},
				{"name": "resource", "tags": ["k8s.namespace.name"]},
				{"name": "intrinsic", "tags": ["duration"]}
			]}`))
		case "/api/v2/search/tag/resource.service.name/values":
			if got := r.URL.Query().Get("q"); got != `{ name = "GET /" }` {
				t.Fatalf("unexpected scoping query: %s", got)
			}
			_, _ = w.Write([]byte(`{"tagValues": [{"type": "string", "value": "checkout"}, {"type": "string", "value": "cart"}]}`))
		default:
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
	}))
	defer ts.Close()

	provider := NewTempoProvider(&toolquery.TempoConnection{Url: ts.URL})
	names, err := provider.TraceFacets(context.Background(), &toolquery.TraceFacetsInput{})
	if err != nil {
		t.Fatal(err)
	}
	if got := facetValueNames(names); !equalStrings(got, []string{"name", "resource.k8s.namespace.name", "service.name", "span.http.route"}) {
		t.Fatalf("unexpected attribute names: %v", got)
	}

	values, err := provider.TraceFacets(context.Background(), &toolquery.TraceFacetsInput{
		Attribute: strPtr(TraceFacetService),
		Filters:   &toolquery.TraceFilters{Operation: strPtr("GET /")},
	})
	if err != nil {
		t.Fatal(err)
	}
	if got := facetValueNames(values); !equalStrings(got, []string{"cart", "checkout"}) {
		t.Fatalf("unexpected service values: %v", got)
	}
}

func TestJaegerProvider_TraceFacets(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		switch r.URL.Path {
		case "/api/v3/services":
			_, _ = w.Write([]byte(`{"services": ["frontend", "checkout"]}`))
		case "/api/v3/operations":
			if r.URL.Query().Get("service") != "checkout" {
				t.Fatalf("unexpected service: %s", r.URL.Query().Get("service"))
			}
			_, _ = w.Write([]byte(`{"operations": [{"name": "POST /orders", "spanKind": "server"}]}`))
		default:
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
	}))
	defer ts.Close()

	provider := NewJaegerProvider(&toolquery.JaegerConnection{Url: ts.URL})
	services, err := provider.TraceFacets(context.Background(), &toolquery.TraceFacetsInput{Attribute: strPtr(TraceFacetService), Query: strPtr("check")})
	if err != nil {
		t.Fatal(err)
	}
	if got := facetValueNames(services); !equalStrings(got, []string{"checkout"}) {
		t.Fatalf("unexpected services: %v", got)
	}

	ops, err := provider.TraceFacets(context.Background(), &toolquery.TraceFacetsInput{
		Attribute: strPtr(TraceFacetSpanName),
		Filters:   &toolquery.TraceFilters{Service: strPtr("checkout")},
	})
	if err != nil {
		t.Fatal(err)
	}
	if got := facetValueNames(ops); !equalStrings(got, []string{"POST /orders"}) {
		t.Fatalf("unexpected operations: %v", got)
	}

	if _, err := provider.TraceFacets(context.Background(), &toolquery.TraceFacetsInput{Attribute: strPtr(TraceFacetSpanName)}); !errors.Is(err, ErrInvalidArgument) {
		t.Fatalf("span names without a service should be rejected, got %v", err)
	}
	if _, err := provider.TraceFacets(context.Background(), &toolquery.TraceFacetsInput{Attribute: strPtr("http.route")}); !errors.Is(err, ErrInvalidArgument) {
		t.Fatalf("unindexed attributes should be rejected, got %v", err)
	}
}

func TestJaegerProvider_TracesUsesFilters(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()
		if q.Get("query.service_name") != "checkout" || q.Get("query.duration_min") != "250ms" {
			t.Fatalf("unexpected query: %v", q)
		}
		if got := q.Get("query.attributes"); got != `{"error":"true","http.route":"/orders"}` {
			t.Fatalf("unexpected attributes: %s", got)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"result": {"resourceSpans": []}}`))
	}))
	defer ts.Close()

	filters := testTraceFilters()
	filters.Operation = nil
	if _, err := NewJaegerProvider(&toolquery.JaegerConnection{Url: ts.URL}).Traces(context.Background(), &toolquery.TracesQueryInput{
		Range:   &toolquery.TimeRange{Start: timestamppb.Now(), End: timestamppb.Now()},
		Filters: filters,
	}); err != nil {
		t.Fatal(err)
	}
}

func facetValueNames(out *toolquery.TraceFacetsOutput) []string {
	names := make([]string, 0, len(out.GetValues()))
	for _, v := range out.GetValues() {
		names = append(names, v.GetName())
	}
	return names
}

func equalStrings(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
