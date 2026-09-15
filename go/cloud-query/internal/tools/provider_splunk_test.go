package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
)

func TestSplunkProvider_LogsTimestampFallbacks(t *testing.T) {
	expected := time.Date(2026, time.September, 15, 20, 26, 40, 816574048, time.UTC)
	provider := &SplunkProvider{}

	for _, field := range splunkRawTimestampFields {
		t.Run(field, func(t *testing.T) {
			raw, err := json.Marshal(map[string]string{
				field: expected.Format(time.RFC3339Nano),
				"log": "audit event",
			})
			if err != nil {
				t.Fatalf("json.Marshal() raw error = %v", err)
			}
			response, err := json.Marshal(SplunkSearchResponse{
				Result: SplunkSearchResponseResult{
					Timestamp: "2026-09-15 13:26:40.816 Pacific Daylight Time",
					Message:   string(raw),
					IndexTime: "1789504009",
				},
			})
			if err != nil {
				t.Fatalf("json.Marshal() response error = %v", err)
			}

			output, err := provider.toLogsQueryOutput(string(response))
			if err != nil {
				t.Fatalf("toLogsQueryOutput() error = %v", err)
			}
			if len(output.GetLogs()) != 1 {
				t.Fatalf("logs count = %d, want 1", len(output.GetLogs()))
			}
			if got := output.GetLogs()[0].GetTimestamp().AsTime(); !got.Equal(expected) {
				t.Fatalf("timestamp = %s, want %s", got, expected)
			}
		})
	}
}

func TestSplunkProvider_LogsFallsBackToIndexTime(t *testing.T) {
	provider := &SplunkProvider{}
	response, err := json.Marshal(SplunkSearchResponse{
		Result: SplunkSearchResponseResult{
			Timestamp: "2026-09-15 13:26:40.816 Pacific Daylight Time",
			Message:   "plain text event",
			IndexTime: "1789504009",
		},
	})
	if err != nil {
		t.Fatalf("json.Marshal() error = %v", err)
	}

	output, err := provider.toLogsQueryOutput(string(response))
	if err != nil {
		t.Fatalf("toLogsQueryOutput() error = %v", err)
	}
	if len(output.GetLogs()) != 1 {
		t.Fatalf("logs count = %d, want 1", len(output.GetLogs()))
	}
	if got, want := output.GetLogs()[0].GetTimestamp().AsTime(), time.Unix(1789504009, 0).UTC(); !got.Equal(want) {
		t.Fatalf("timestamp = %s, want %s", got, want)
	}
}

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
