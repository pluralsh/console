package tools

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
)

func TestSplunkProvider_LogAggregate(t *testing.T) {
	start := time.Date(2026, time.September, 8, 12, 0, 0, 0, time.UTC)
	end := start.Add(time.Hour)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/services/search/v2/jobs/export" {
			t.Fatalf("request path = %q", r.URL.Path)
		}
		if err := r.ParseForm(); err != nil {
			t.Fatalf("ParseForm() error = %v", err)
		}
		const expectedSearch = `search index=main service="api" | bin _time span=5m | stats count as count by _time | sort 0 _time`
		if got := r.Form.Get("search"); got != expectedSearch {
			t.Fatalf("search = %q, want %q", got, expectedSearch)
		}
		if got := r.Form.Get("earliest_time"); got != "1788868800.000000" {
			t.Fatalf("earliest_time = %q", got)
		}
		if got := r.Form.Get("latest_time"); got != "1788872400.000000" {
			t.Fatalf("latest_time = %q", got)
		}
		if got := r.Form.Get("output_mode"); got != "json" {
			t.Fatalf("output_mode = %q", got)
		}

		fmt.Fprintln(w, `{"preview":false,"result":{"_time":"2026-09-08T12:00:00Z","count":"4"}}`)
		fmt.Fprintln(w, `{"preview":false,"result":{"_time":"2026-09-08T12:05:00Z","count":"9"}}`)
	}))
	defer server.Close()

	provider := &SplunkProvider{conn: &toolquery.SplunkConnection{
		Url:   server.URL,
		Token: new("test-token"),
	}}
	output, err := provider.LogAggregate(context.Background(), &toolquery.LogAggregateInput{
		Query:      "index=main",
		Range:      aggregateTestTimeRange(start, end),
		BucketSize: "5m",
		Facets: []*toolquery.LogsQueryFacet{
			{Name: "service", Value: "api"},
		},
	})
	if err != nil {
		t.Fatalf("LogAggregate() error = %v", err)
	}
	assertProviderAggregateBuckets(t, output, []aggregateTestBucket{
		{timestamp: start, count: 4},
		{timestamp: start.Add(5 * time.Minute), count: 9},
	})
}
