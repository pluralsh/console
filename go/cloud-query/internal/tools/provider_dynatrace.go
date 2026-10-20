package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
	"github.com/pluralsh/console/go/cloud-query/internal/tools/client"
)

type DynatraceProvider struct {
	client *client.DynatraceClient
}

func NewDynatraceProvider(conn *toolquery.DynatraceConnection) *DynatraceProvider {
	return &DynatraceProvider{client: client.NewDynatraceClient(conn.Url, conn.PlatformToken)}
}

func (in *DynatraceProvider) MetricsSeries(ctx context.Context, input *toolquery.MetricsQueryInput) (*toolquery.MetricsSeriesOutput, error) {
	if err := in.validateMetricsInput(input); err != nil {
		return nil, err
	}

	metricsResp, err := in.client.Metrics(ctx, input.GetQuery())
	if err != nil {
		return nil, err
	}

	return metricsResp.ToMetricsSeriesOutput(), nil
}

func (in *DynatraceProvider) validateMetricsInput(input *toolquery.MetricsQueryInput) error {
	if !strings.HasPrefix(input.GetQuery(), "timeseries") {
		return fmt.Errorf("invalid query: must start with 'timeseries'")
	}

	if len(input.GetStep()) > 0 {
		return fmt.Errorf("unsupported use of 'step', use 'from', 'to' or 'timeframe' directly in the query. Example: 'timeseries avg(dt.host.cpu.usage), interval:1h'")
	}

	if input.GetRange() != nil {
		return fmt.Errorf("unsupported use of 'range', use 'interval' directly in the query. Example: 'timeseries avg(dt.host.cpu.usage), from:-1h'")
	}

	return nil
}

func (in *DynatraceProvider) MetricsSearch(ctx context.Context, input *toolquery.MetricsSearchInput) (*toolquery.MetricsSearchOutput, error) {
	if in.client == nil || len(input.GetQuery()) == 0 {
		return nil, ErrInvalidArgument
	}

	result, err := in.client.MetricsSearch(ctx, input.GetQuery(), input.GetLimit())
	if err != nil {
		return nil, err
	}

	return result.ToMetricsSearchOutput(), nil
}

func (in *DynatraceProvider) MetricsLabelSearch(ctx context.Context, input *toolquery.MetricsLabelSearchInput) (*toolquery.MetricsLabelSearchOutput, error) {
	return nil, ErrUnsupportedOperation
}

func (in *DynatraceProvider) Logs(ctx context.Context, input *toolquery.LogsQueryInput) (*toolquery.LogsQueryOutput, error) {
	if in.client == nil || input == nil {
		return nil, ErrInvalidArgument
	}

	if err := in.validateLogsInput(input); err != nil {
		return nil, err
	}

	resp, err := in.client.Logs(
		ctx,
		defaultLogQuery(input.GetQuery(), "fetch logs"),
	)
	if err != nil {
		return nil, err
	}

	return resp.ToLogsQueryOutput(), nil
}

func (in *DynatraceProvider) LogAggregate(ctx context.Context, input *toolquery.LogAggregateInput) (*toolquery.LogAggregateOutput, error) {
	if in.client == nil || input == nil {
		return nil, ErrInvalidArgument
	}
	if !strings.HasPrefix(defaultLogQuery(input.GetQuery(), "fetch logs"), "fetch logs") {
		return nil, fmt.Errorf("invalid query: must start with 'fetch logs'")
	}

	query := dynatraceLogsQueryWithFacets(defaultLogQuery(input.GetQuery(), "fetch logs"), input.GetFacets(), input.GetOperator())
	query = fmt.Sprintf(
		"%s | summarize count = count(), by:{timestamp = bin(timestamp, %s)}",
		query,
		input.GetBucketSize(),
	)
	resp, err := in.client.LogAggregate(
		ctx,
		query,
		input.GetRange().GetStart().AsTime(),
		input.GetRange().GetEnd().AsTime(),
	)
	if err != nil {
		return nil, err
	}

	buckets := make([]*toolquery.LogAggregateBucket, 0, len(resp.Result.Records))
	for _, record := range resp.Result.Records {
		timestamp, ok := timeFromDynatraceTimestamp(record.Timestamp)
		if !ok {
			continue
		}
		count, ok := dynatraceAggregateCount(record.Fields["count"])
		if !ok {
			continue
		}
		buckets = append(buckets, &toolquery.LogAggregateBucket{
			Timestamp: timestamppb.New(timestamp),
			Count:     count,
		})
	}
	sort.Slice(buckets, func(i, j int) bool {
		return buckets[i].GetTimestamp().AsTime().Before(buckets[j].GetTimestamp().AsTime())
	})

	return &toolquery.LogAggregateOutput{Buckets: buckets}, nil
}

func dynatraceLogsQueryWithFacets(
	base string,
	facets []*toolquery.LogsQueryFacet,
	operator toolquery.LogQueryOperator,
) string {
	conditions := make([]string, 0, len(facets))
	for _, facet := range facets {
		if facet == nil {
			continue
		}
		name := strings.TrimSpace(facet.GetName())
		value := strings.TrimSpace(facet.GetValue())
		if name == "" || value == "" {
			continue
		}
		name = strings.NewReplacer(`\`, `\\`, "`", "\\`").Replace(name)
		conditions = append(conditions, fmt.Sprintf(
			"`%s` == \"%s\"",
			name,
			escapeDoubleQuoted(value),
		))
	}
	if len(conditions) == 0 {
		return base
	}
	return fmt.Sprintf("%s | filter %s", base, strings.Join(conditions, logFacetOperator(operator)))
}

func timeFromDynatraceTimestamp(value string) (time.Time, bool) {
	for _, layout := range []string{time.RFC3339Nano, time.RFC3339} {
		if timestamp, err := time.Parse(layout, value); err == nil {
			return timestamp.UTC(), true
		}
	}
	return time.Time{}, false
}

func dynatraceAggregateCount(value any) (int64, bool) {
	switch count := value.(type) {
	case float64:
		return int64(count), true
	case float32:
		return int64(count), true
	case int:
		return int64(count), true
	case int64:
		return count, true
	case json.Number:
		parsed, err := strconv.ParseInt(string(count), 10, 64)
		return parsed, err == nil
	case string:
		parsed, err := strconv.ParseInt(count, 10, 64)
		return parsed, err == nil
	default:
		return 0, false
	}
}

func (in *DynatraceProvider) validateLogsInput(input *toolquery.LogsQueryInput) error {
	if !strings.HasPrefix(defaultLogQuery(input.GetQuery(), "fetch logs"), "fetch logs") {
		return fmt.Errorf("invalid query: must start with 'fetch logs'")
	}

	if input.GetRange() != nil {
		return fmt.Errorf("unsupported use of 'range', use 'interval' directly in the query. Example: 'fetch logs, from:-1h'")
	}

	if input.GetLimit() > 0 {
		return fmt.Errorf("unsupported use of 'limit', use 'limit' pipe directly in the query. Example: 'fetch logs | limit 100'")
	}

	return nil
}

func (in *DynatraceProvider) Traces(ctx context.Context, input *toolquery.TracesQueryInput) (*toolquery.TracesQueryOutput, error) {
	if in.client == nil {
		return nil, ErrInvalidArgument
	}

	query, err := in.tracesQuery(input)
	if err != nil {
		return nil, err
	}

	resp, err := in.client.Traces(ctx, query)
	if err != nil {
		return nil, err
	}

	return resp.ToTracesQueryOutput(), nil
}

// tracesQuery is the raw DQL query, or one built from structured filters,
// which may also refine a raw query.
func (in *DynatraceProvider) tracesQuery(input *toolquery.TracesQueryInput) (string, error) {
	if !HasTraceFilters(input.GetFilters()) {
		if err := in.validateTracesInput(input); err != nil {
			return "", err
		}
		return input.GetQuery(), nil
	}

	if raw := strings.TrimSpace(input.GetQuery()); raw != "" {
		if !strings.HasPrefix(raw, "fetch spans") {
			return "", fmt.Errorf("invalid query: must start with 'fetch spans'")
		}
		filter, err := dqlTraceFilter(input.GetFilters())
		if err != nil {
			return "", err
		}
		return raw + " | filter " + filter, nil
	}

	return toDQLSpans(input.GetFilters(), input.GetRange(), int64(input.GetLimit()))
}

const dynatraceSpanSampleSize = 200

func (in *DynatraceProvider) TraceFacets(ctx context.Context, input *toolquery.TraceFacetsInput) (*toolquery.TraceFacetsOutput, error) {
	if in.client == nil || input == nil {
		return nil, ErrInvalidArgument
	}

	attribute := strings.TrimSpace(input.GetAttribute())
	if attribute == "" {
		query, err := toDQLSpans(input.GetFilters(), input.GetRange(), dynatraceSpanSampleSize)
		if err != nil {
			return nil, err
		}
		resp, err := in.client.Traces(ctx, query)
		if err != nil {
			return nil, err
		}
		return facetValues(input, spanAttributeNames(resp.ToTracesQueryOutput().GetSpans())), nil
	}

	query, err := toDQLSpans(input.GetFilters(), input.GetRange(), 0)
	if err != nil {
		return nil, err
	}
	query += fmt.Sprintf(
		" | summarize count = count(), by:{value = %s} | sort count desc | limit %d",
		dqlField(attribute),
		traceFacetLimit(input),
	)

	records, err := in.client.Records(ctx, query)
	if err != nil {
		return nil, err
	}

	values := make([]*toolquery.TraceFacetValue, 0, len(records))
	for _, record := range records {
		value, ok := record["value"]
		if !ok || value == nil {
			continue
		}
		facetValue := &toolquery.TraceFacetValue{Name: fmt.Sprint(value)}
		// counts arrive as strings or JSON numbers
		if count, err := strconv.ParseFloat(fmt.Sprint(record["count"]), 64); err == nil {
			n := int64(count)
			facetValue.Count = &n
		}
		values = append(values, facetValue)
	}

	return facetValues(input, values), nil
}

func (in *DynatraceProvider) validateTracesInput(input *toolquery.TracesQueryInput) error {
	if !strings.HasPrefix(input.GetQuery(), "fetch spans") {
		return fmt.Errorf("invalid query: must start with 'fetch spans'")
	}

	if input.GetRange() != nil {
		return fmt.Errorf("unsupported use of 'range', use 'interval' directly in the query. Example: 'fetch spans, from:-1h'")
	}

	if input.GetLimit() > 0 {
		return fmt.Errorf("unsupported use of 'limit', use 'limit' pipe directly in the query. Example: 'fetch spans | limit 100'")
	}

	return nil
}
