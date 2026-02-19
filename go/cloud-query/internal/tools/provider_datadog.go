package tools

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/DataDog/datadog-api-client-go/v2/api/datadog"
	"github.com/DataDog/datadog-api-client-go/v2/api/datadogV1"
	"github.com/DataDog/datadog-api-client-go/v2/api/datadogV2"
	"google.golang.org/protobuf/types/known/timestamppb"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
)

type DatadogProvider struct {
	conn *toolquery.DatadogConnection
}

func NewDatadogProvider(conn *toolquery.DatadogConnection) *DatadogProvider {
	return &DatadogProvider{conn: conn}
}

func (in *DatadogProvider) Metrics(ctx context.Context, input *toolquery.MetricsQueryInput) (*toolquery.MetricsQueryOutput, error) {
	if in.conn == nil {
		return nil, ErrInvalidArgument
	}
	if input == nil || input.Query == "" {
		return nil, ErrInvalidArgument
	}

	ctx, client, err := in.newDatadogClient(ctx, in.conn)
	if err != nil {
		return nil, err
	}

	api := datadogV1.NewMetricsApi(client)
	resp, _, err := api.QueryMetrics(
		ctx,
		input.GetRange().GetStart().AsTime().Unix(),
		input.GetRange().GetEnd().AsTime().Unix(),
		input.Query,
	)
	if err != nil {
		return nil, err
	}

	return in.toMetricsQueryOutput(resp), nil
}

func (in *DatadogProvider) toMetricsQueryOutput(resp datadogV1.MetricsQueryResponse) *toolquery.MetricsQueryOutput {
	metrics := make([]*toolquery.MetricPoint, 0)

	for _, series := range resp.GetSeries() {
		labels := in.tagsToLabels(series.TagSet)
		if len(labels) == 0 {
			if scope := series.GetScope(); scope != "" {
				labels = in.tagsToLabels(strings.Split(scope, ","))
			}
		}

		metricName := series.GetMetric()
		for _, pair := range series.Pointlist {
			if len(pair) < 2 || pair[0] == nil || pair[1] == nil {
				continue
			}

			ts := timestamppb.New(time.Unix(0, int64(*pair[0])*int64(time.Millisecond)))
			metrics = append(metrics, &toolquery.MetricPoint{
				Timestamp: ts,
				Name:      metricName,
				Value:     *pair[1],
				Labels:    labels,
			})
		}
	}

	return &toolquery.MetricsQueryOutput{Metrics: metrics}
}

func (in *DatadogProvider) Logs(ctx context.Context, input *toolquery.LogsQueryInput) (*toolquery.LogsQueryOutput, error) {
	if in.conn == nil {
		return nil, ErrInvalidArgument
	}
	if input == nil || input.Query == "" {
		return nil, ErrInvalidArgument
	}

	ctx, client, err := in.newDatadogClient(ctx, in.conn)
	if err != nil {
		return nil, err
	}

	filter := datadogV2.NewLogsQueryFilter()
	filter.SetFrom(input.GetRange().GetStart().AsTime().UTC().Format(time.RFC3339Nano))
	filter.SetTo(input.GetRange().GetEnd().AsTime().UTC().Format(time.RFC3339Nano))
	filter.SetQuery(input.Query)

	request := datadogV2.NewLogsListRequest()
	request.SetFilter(*filter)

	if input.GetLimit() > 0 {
		page := datadogV2.NewLogsListRequestPage()
		page.SetLimit(input.GetLimit())
		request.SetPage(*page)
	}

	api := datadogV2.NewLogsApi(client)
	resp, _, err := api.ListLogs(ctx, *datadogV2.NewListLogsOptionalParameters().WithBody(*request))
	if err != nil {
		return nil, err
	}

	return in.toLogsQueryOutput(resp), nil
}

func (in *DatadogProvider) toLogsQueryOutput(resp datadogV2.LogsListResponse) *toolquery.LogsQueryOutput {
	logs := make([]*toolquery.LogEntry, 0)

	for _, entry := range resp.GetData() {
		attributes := entry.GetAttributes()
		timestamp := attributes.GetTimestamp()
		if timestamp.IsZero() {
			timestamp = time.Now()
		}

		labels := in.tagsToLabels(attributes.Tags)
		if service := attributes.GetService(); service != "" {
			labels["service"] = service
		}
		if host := attributes.GetHost(); host != "" {
			labels["host"] = host
		}
		if status := attributes.GetStatus(); status != "" {
			labels["status"] = status
		}

		logs = append(logs, &toolquery.LogEntry{
			Timestamp: timestamppb.New(timestamp),
			Message:   attributes.GetMessage(),
			Labels:    labels,
		})
	}

	return &toolquery.LogsQueryOutput{Logs: logs}
}

func (in *DatadogProvider) Traces(ctx context.Context, input *toolquery.TracesQueryInput) (*toolquery.TracesQueryOutput, error) {
	if in.conn == nil {
		return nil, ErrInvalidArgument
	}
	if input == nil || input.Query == "" {
		return nil, ErrInvalidArgument
	}

	ctx, client, err := in.newDatadogClient(ctx, in.conn)
	if err != nil {
		return nil, err
	}

	filter := datadogV2.NewSpansQueryFilter()
	filter.SetFrom(input.GetRange().GetStart().AsTime().UTC().Format(time.RFC3339Nano))
	filter.SetTo(input.GetRange().GetEnd().AsTime().UTC().Format(time.RFC3339Nano))
	filter.SetQuery(input.Query)

	attrs := datadogV2.NewSpansListRequestAttributes()
	attrs.SetFilter(*filter)
	if input.GetLimit() > 0 {
		page := datadogV2.NewSpansListRequestPage()
		page.SetLimit(input.GetLimit())
		attrs.SetPage(*page)
	}
	sort := datadogV2.SPANSSORT_TIMESTAMP_ASCENDING
	attrs.SetSort(sort)

	data := datadogV2.NewSpansListRequestData()
	data.SetAttributes(*attrs)

	request := datadogV2.NewSpansListRequest()
	request.SetData(*data)

	api := datadogV2.NewSpansApi(client)
	resp, _, err := api.ListSpans(ctx, *request)
	if err != nil {
		return nil, err
	}

	return in.toTraceQueryOutput(resp), nil
}

func (in *DatadogProvider) toTraceQueryOutput(resp datadogV2.SpansListResponse) *toolquery.TracesQueryOutput {
	spans := make([]*toolquery.TraceSpan, 0)

	for _, span := range resp.GetData() {
		attributes := span.GetAttributes()
		startTime := attributes.GetStartTimestamp()
		endTime := attributes.GetEndTimestamp()
		if endTime.IsZero() {
			endTime = startTime
		}

		labels := in.tagsToLabels(attributes.Tags)
		if env := attributes.GetEnv(); env != "" {
			labels["env"] = env
		}
		if resource := attributes.GetResourceName(); resource != "" {
			labels["resource"] = resource
		}

		spans = append(spans, &toolquery.TraceSpan{
			TraceId:  attributes.GetTraceId(),
			SpanId:   attributes.GetSpanId(),
			ParentId: attributes.GetParentId(),
			Name:     attributes.GetResourceName(),
			Service:  attributes.GetService(),
			Start:    timestamppb.New(startTime),
			End:      timestamppb.New(endTime),
			Tags:     labels,
		})
	}

	return &toolquery.TracesQueryOutput{Spans: spans}
}

func (in *DatadogProvider) newDatadogClient(ctx context.Context, conn *toolquery.DatadogConnection) (context.Context, *datadog.APIClient, error) {
	apiKey := conn.GetApiKey()
	appKey := conn.GetAppKey()
	if apiKey == "" || appKey == "" {
		return ctx, nil, fmt.Errorf("%w: missing api key or app key", ErrInvalidArgument)
	}

	ctx = context.WithValue(ctx, datadog.ContextAPIKeys, map[string]datadog.APIKey{
		"apiKeyAuth": {
			Key: apiKey,
		},
		"appKeyAuth": {
			Key: appKey,
		},
	})

	configuration := datadog.NewConfiguration()
	client := datadog.NewAPIClient(configuration)

	return in.datadogWithSite(ctx, conn.GetSite()), client, nil
}

func (in *DatadogProvider) datadogWithSite(ctx context.Context, site string) context.Context {
	if len(site) == 0 {
		return ctx
	}

	return context.WithValue(ctx, datadog.ContextServerVariables, map[string]string{
		"site": site,
	})
}

func (in *DatadogProvider) tagsToLabels(tags []string) map[string]string {
	labels := make(map[string]string, len(tags))
	for _, tag := range tags {
		parts := strings.SplitN(tag, ":", 2)
		if len(parts) == 2 {
			labels[parts[0]] = parts[1]
		} else if len(parts) == 1 {
			labels[parts[0]] = ""
		}
	}
	return labels
}
