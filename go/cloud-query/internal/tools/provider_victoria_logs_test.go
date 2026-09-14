package tools

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
)

func TestMergeVictoriaLogsQueryWithFacets(t *testing.T) {
	andQuery := mergeVictoriaLogsQueryWithFacets(`error`, []*toolquery.LogsQueryFacet{
		{Name: "service", Value: "api"},
		{Name: "env", Value: `prod"x`},
	}, toolquery.LogQueryOperator_LOG_QUERY_OPERATOR_AND)
	if andQuery != `error service:="api" env:="prod\"x"` {
		t.Fatalf("unexpected AND LogsQL: %q", andQuery)
	}

	orQuery := mergeVictoriaLogsQueryWithFacets(`error`, []*toolquery.LogsQueryFacet{
		{Name: "service", Value: "api"},
		{Name: "env", Value: "prod"},
	}, toolquery.LogQueryOperator_LOG_QUERY_OPERATOR_OR)
	if orQuery != `error (service:="api" OR env:="prod")` {
		t.Fatalf("unexpected OR LogsQL: %q", orQuery)
	}
}

func TestVictoriaLogsLogsRequestAndResponse(t *testing.T) {
	limit := int32(10)
	input := &toolquery.LogsQueryInput{
		Query: "error",
		Limit: &limit,
		Range: &toolquery.TimeRange{
			Start: timestamppb.New(time.Unix(1704067200, 0).UTC()),
			End:   timestamppb.New(time.Unix(1704070800, 0).UTC()),
		},
		Facets: []*toolquery.LogsQueryFacet{{Name: "service", Value: "api"}},
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Fatalf("unexpected method: %s", r.Method)
		}
		if r.URL.Path != "/select/logsql/query" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		if got := r.Header.Get("AccountID"); got != "12" {
			t.Fatalf("unexpected AccountID: %q", got)
		}
		if got := r.Header.Get("ProjectID"); got != "34" {
			t.Fatalf("unexpected ProjectID: %q", got)
		}
		if err := r.ParseForm(); err != nil {
			t.Fatalf("parse form: %v", err)
		}
		assertQueryValues(t, r.Form, map[string]string{
			"query": `error service:="api"`,
			"limit": "10",
			"start": "2024-01-01T00:00:00Z",
			"end":   "2024-01-01T01:00:00Z",
		})
		w.Header().Set("Content-Type", "application/stream+json")
		_, _ = io.WriteString(w, `{ "_msg":"boom","_time":"2024-01-01T00:00:00Z","_stream":"{}","level":"error"}`+"\n")
		_, _ = io.WriteString(w, `{ "_msg":"later","_time":"2024-01-01T00:05:00Z","pod":"api-1"}`+"\n")
	}))
	defer server.Close()

	accountID := "12"
	projectID := "34"
	provider := NewVictoriaLogsProvider(&toolquery.VictoriaLogsConnection{
		Url:       server.URL,
		AccountId: &accountID,
		ProjectId: &projectID,
	})
	output, err := provider.Logs(context.Background(), input)
	if err != nil {
		t.Fatalf("victoria logs Logs failed: %v", err)
	}
	if len(output.GetLogs()) != 2 {
		t.Fatalf("unexpected log count: %d", len(output.GetLogs()))
	}
	if output.Logs[0].GetMessage() != "boom" {
		t.Fatalf("unexpected first message: %q", output.Logs[0].GetMessage())
	}
	if output.Logs[0].GetLabels()["level"] != "error" {
		t.Fatalf("unexpected labels: %#v", output.Logs[0].GetLabels())
	}
	if got := output.Logs[1].GetTimestamp().AsTime().Unix(); got != 1704067500 {
		t.Fatalf("unexpected second timestamp: %d", got)
	}
}

func TestVictoriaLogsLogAggregateRequestAndResponse(t *testing.T) {
	input := logAggregateTestInput(toolquery.LogQueryOperator_LOG_QUERY_OPERATOR_OR)
	input.Query = "error"
	input.Facets = []*toolquery.LogsQueryFacet{
		{Name: "service", Value: "api"},
		{Name: "env", Value: "prod"},
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/select/logsql/hits" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		if err := r.ParseForm(); err != nil {
			t.Fatalf("parse form: %v", err)
		}
		assertQueryValues(t, r.Form, map[string]string{
			"query": `error (service:="api" OR env:="prod")`,
			"start": "2024-01-01T00:00:00Z",
			"end":   "2024-01-01T01:00:00Z",
			"step":  "5m",
		})
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, `{
			"hits": [
				{"timestamps": ["2024-01-01T00:00:00Z", "2024-01-01T00:05:00Z"], "values": [3, 8]}
			]
		}`)
	}))
	defer server.Close()

	provider := NewVictoriaLogsProvider(&toolquery.VictoriaLogsConnection{Url: server.URL})
	output, err := provider.LogAggregate(context.Background(), input)
	if err != nil {
		t.Fatalf("victoria logs LogAggregate failed: %v", err)
	}
	assertAggregateBuckets(t, output, []int64{1704067200, 1704067500}, []int64{3, 8})
}
