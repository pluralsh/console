package tools

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/DataDog/datadog-api-client-go/v2/api/datadogV2"
	"google.golang.org/protobuf/types/known/timestamppb"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
)

func TestElasticLogsMessageQuery(t *testing.T) {
	timeRange := &toolquery.TimeRange{
		Start: timestamppb.New(time.Unix(1704067200, 0)),
		End:   timestamppb.New(time.Unix(1704070800, 0)),
	}

	t.Run("defaults to OR matching on message", func(t *testing.T) {
		request := (&ElasticProvider{}).toRequest(&toolquery.LogsQueryInput{
			Query: "error OR failure",
			Range: timeRange,
			Facets: []*toolquery.LogsQueryFacet{
				{Name: "cluster.name.keyword", Value: "mgmt"},
			},
		})
		data, err := json.Marshal(request)
		if err != nil {
			t.Fatalf("failed to marshal Elasticsearch logs request: %v", err)
		}

		body := string(data)
		for _, expected := range []string{
			`"match":{"message":`,
			`"analyzer":"stop"`,
			`"operator":"or"`,
			`"query":"error OR failure"`,
			`"cluster.name.keyword":{"value":"mgmt"}`,
		} {
			if !strings.Contains(body, expected) {
				t.Fatalf("logs request missing %s: %s", expected, body)
			}
		}
	})

	for _, query := range []string{"", "   ", "*"} {
		t.Run("uses match_all for "+query, func(t *testing.T) {
			request := (&ElasticProvider{}).toRequest(&toolquery.LogsQueryInput{
				Query: query,
				Range: timeRange,
			})
			data, err := json.Marshal(request)
			if err != nil {
				t.Fatalf("failed to marshal Elasticsearch match-all request: %v", err)
			}

			body := string(data)
			if !strings.Contains(body, `"match_all":{}`) {
				t.Fatalf("empty or wildcard request missing match_all query: %s", body)
			}
			if strings.Contains(body, `"match":{"message":`) {
				t.Fatalf("empty or wildcard request unexpectedly contains a message match: %s", body)
			}
		})
	}
}

func TestEmptyLogProviderQueryDefaults(t *testing.T) {
	input := logAggregateTestInput(toolquery.LogQueryOperator_LOG_QUERY_OPERATOR_OR)
	input.Query = ""
	input.Facets = nil

	datadogFilter := datadogLogAggregateRequest(input).GetFilter()
	if got := datadogFilter.GetQuery(); got != "*" {
		t.Fatalf("unexpected Datadog empty query: %q", got)
	}
	if got := splunkSearchWithFacets("", 0, nil); got != "search *" {
		t.Fatalf("unexpected Splunk empty query: %q", got)
	}
	if got := lokiQueryWithFacets("", nil); got != `{job=~".+"}` {
		t.Fatalf("unexpected Loki empty query: %q", got)
	}
	if got := lokiQueryWithFacets("", []*toolquery.LogsQueryFacet{{Name: "namespace", Value: "prod"}}); got != `{namespace="prod"}` {
		t.Fatalf("unexpected Loki facets-only query: %q", got)
	}
	if got := mergeVictoriaLogsQueryWithFacets(defaultLogQuery("", "*"), nil, input.GetOperator()); got != "*" {
		t.Fatalf("unexpected VictoriaLogs empty query: %q", got)
	}
	if got := *azureLogAggregateQueryBody(input).Query; !strings.HasPrefix(got, "search * | summarize") {
		t.Fatalf("unexpected Azure empty query: %q", got)
	}
	if got := *cloudwatchLogAggregateStartQueryInput(input).QueryString; !strings.HasPrefix(got, "fields @timestamp | stats") {
		t.Fatalf("unexpected CloudWatch empty query: %q", got)
	}
	if got := defaultLogQuery("", "fetch logs"); got != "fetch logs" {
		t.Fatalf("unexpected Dynatrace empty query: %q", got)
	}
}

func TestElasticLogAggregateRequestAndResponse(t *testing.T) {
	input := logAggregateTestInput(toolquery.LogQueryOperator_LOG_QUERY_OPERATOR_OR)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/logs-*/_search" {
			t.Fatalf("unexpected search path: %s", r.URL.Path)
		}
		username, password, ok := r.BasicAuth()
		if !ok || username != "user" || password != "password" {
			t.Fatalf("unexpected basic auth: %q %q %t", username, password, ok)
		}
		assertElasticAggregateBody(t, r.Body, input, "or")
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-Elastic-Product", "Elasticsearch")
		_, _ = io.WriteString(w, `{
			"took": 1,
			"timed_out": false,
			"_shards": {"total": 1, "successful": 1, "skipped": 0, "failed": 0},
			"hits": {"total": {"value": 3, "relation": "eq"}, "hits": []},
			"aggregations": {
				"date_histogram#logs_over_time": {
					"buckets": [
						{"key": 1704067200000, "key_as_string": "2024-01-01T00:00:00.000Z", "doc_count": 2},
						{"key": 1704067500000, "key_as_string": "2024-01-01T00:05:00.000Z", "doc_count": 1}
					]
				}
			}
		}`)
	}))
	defer server.Close()

	provider, err := NewElasticProvider(&toolquery.ElasticConnection{
		Url:      server.URL,
		Username: "user",
		Password: "password",
		Index:    "logs-*",
	})
	if err != nil {
		t.Fatalf("failed to construct elastic provider: %v", err)
	}

	output, err := provider.LogAggregate(context.Background(), input)
	if err != nil {
		t.Fatalf("elastic LogAggregate failed: %v", err)
	}
	assertAggregateBuckets(t, output, []int64{1704067200, 1704067500}, []int64{2, 1})
}

func TestOpensearchLogAggregateRequestAndResponse(t *testing.T) {
	input := logAggregateTestInput(toolquery.LogQueryOperator_LOG_QUERY_OPERATOR_AND)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/application-logs/_search" {
			t.Fatalf("unexpected search path: %s", r.URL.Path)
		}
		assertElasticAggregateBody(t, r.Body, input, "and")
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, `{
			"aggregations": {
				"logs_over_time": {
					"buckets": [
						{"key": 1704067200000, "doc_count": 4},
						{"key": 1704067500000, "doc_count": 6}
					]
				}
			}
		}`)
	}))
	defer server.Close()

	provider := &OpensearchProvider{
		client: server.Client(),
		conn: &toolquery.OpensearchConnection{
			Host:  server.URL,
			Index: "application-logs",
		},
	}
	output, err := provider.LogAggregate(context.Background(), input)
	if err != nil {
		t.Fatalf("opensearch LogAggregate failed: %v", err)
	}
	assertAggregateBuckets(t, output, []int64{1704067200, 1704067500}, []int64{4, 6})
}

func TestLokiLogAggregateRequestAndResponse(t *testing.T) {
	input := logAggregateTestInput(toolquery.LogQueryOperator_LOG_QUERY_OPERATOR_OR)
	input.Query = `{app="api"} |= "error"`
	input.Facets = []*toolquery.LogsQueryFacet{{Name: "namespace", Value: "prod"}}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/loki/api/v1/query_range" {
			t.Fatalf("unexpected Loki path: %s", r.URL.Path)
		}
		assertQueryValues(t, r.URL.Query(), map[string]string{
			"query": `sum(count_over_time({app="api",namespace="prod"} |= "error"[5m]))`,
			"start": "1704067200000000000",
			"end":   "1704070800000000000",
			"step":  "5m",
		})
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, `{
			"status": "success",
			"data": {
				"resultType": "matrix",
				"result": [{"metric": {}, "values": [[1704067200, "3"], [1704067500, "8"]]}]
			}
		}`)
	}))
	defer server.Close()

	provider := NewLokiProvider(&toolquery.LokiConnection{Url: server.URL})
	output, err := provider.LogAggregate(context.Background(), input)
	if err != nil {
		t.Fatalf("Loki LogAggregate failed: %v", err)
	}
	assertAggregateBuckets(t, output, []int64{1704067200, 1704067500}, []int64{3, 8})
}

func TestDatadogLogAggregateRequestAndResponse(t *testing.T) {
	input := logAggregateTestInput(toolquery.LogQueryOperator_LOG_QUERY_OPERATOR_OR)
	request := datadogLogAggregateRequest(input)
	filter := request.GetFilter()
	if got, want := filter.GetFrom(), "2024-01-01T00:00:00Z"; got != want {
		t.Fatalf("unexpected Datadog from: got %q want %q", got, want)
	}
	if got, want := filter.GetTo(), "2024-01-01T01:00:00Z"; got != want {
		t.Fatalf("unexpected Datadog to: got %q want %q", got, want)
	}
	if got, want := filter.GetQuery(), "error OR timeout service:api"; got != want {
		t.Fatalf("unexpected Datadog query: got %q want %q", got, want)
	}
	computes := request.GetCompute()
	if len(computes) != 1 {
		t.Fatalf("expected one Datadog compute, got %d", len(computes))
	}
	if got := computes[0].GetAggregation(); got != datadogV2.LOGSAGGREGATIONFUNCTION_COUNT {
		t.Fatalf("unexpected Datadog aggregation: %s", got)
	}
	if got := computes[0].GetType(); got != datadogV2.LOGSCOMPUTETYPE_TIMESERIES {
		t.Fatalf("unexpected Datadog compute type: %s", got)
	}
	if got, want := computes[0].GetInterval(), "5m"; got != want {
		t.Fatalf("unexpected Datadog interval: got %q want %q", got, want)
	}

	var response datadogV2.LogsAggregateResponse
	if err := json.Unmarshal([]byte(`{
		"data": {
			"buckets": [{
				"computes": {
					"c0": [
						{"time": "2024-01-01T00:00:00Z", "value": 5},
						{"time": "2024-01-01T00:05:00Z", "value": 9}
					]
				}
			}]
		}
	}`), &response); err != nil {
		t.Fatalf("failed to decode Datadog response fixture: %v", err)
	}
	output, err := (&DatadogProvider{}).toLogAggregateOutput(response)
	if err != nil {
		t.Fatalf("failed to parse Datadog aggregate response: %v", err)
	}
	assertAggregateBuckets(t, output, []int64{1704067200, 1704067500}, []int64{5, 9})
}

func logAggregateTestInput(operator toolquery.LogQueryOperator) *toolquery.LogAggregateInput {
	return &toolquery.LogAggregateInput{
		Query:      "error timeout",
		Range:      &toolquery.TimeRange{Start: timestamppb.New(time.Unix(1704067200, 0)), End: timestamppb.New(time.Unix(1704070800, 0))},
		BucketSize: "5m",
		Facets:     []*toolquery.LogsQueryFacet{{Name: "service", Value: "api"}},
		Operator:   operator,
	}
}

func assertElasticAggregateBody(t *testing.T, body io.Reader, input *toolquery.LogAggregateInput, operator string) {
	t.Helper()
	data, err := io.ReadAll(body)
	if err != nil {
		t.Fatalf("failed to read request body: %v", err)
	}
	request := string(data)
	for _, expected := range []string{
		`"size":0`,
		`"field":"@timestamp"`,
		`"fixed_interval":"` + input.GetBucketSize() + `"`,
		`"match":{"message":`,
		`"analyzer":"stop"`,
		`"operator":"` + operator + `"`,
		`"query":"error timeout"`,
		`"gte":"2024-01-01T00:00:00Z"`,
		`"lte":"2024-01-01T01:00:00Z"`,
		`"service":{"value":"api"}`,
	} {
		if !strings.Contains(request, expected) {
			t.Fatalf("aggregate request missing %s: %s", expected, request)
		}
	}
}

func assertQueryValues(t *testing.T, values url.Values, expected map[string]string) {
	t.Helper()
	for key, want := range expected {
		if got := values.Get(key); got != want {
			t.Fatalf("unexpected %s query parameter: got %q want %q", key, got, want)
		}
	}
}

func assertAggregateBuckets(t *testing.T, output *toolquery.LogAggregateOutput, timestamps, counts []int64) {
	t.Helper()
	if len(output.GetBuckets()) != len(counts) {
		t.Fatalf("unexpected bucket count: got %d want %d", len(output.GetBuckets()), len(counts))
	}
	for i, bucket := range output.GetBuckets() {
		if got := bucket.GetTimestamp().AsTime().Unix(); got != timestamps[i] {
			t.Fatalf("unexpected bucket %d timestamp: got %d want %d", i, got, timestamps[i])
		}
		if got := bucket.GetCount(); got != counts[i] {
			t.Fatalf("unexpected bucket %d count: got %d want %d", i, got, counts[i])
		}
	}
}
