package datasource

import (
	"fmt"
	"regexp"
	"slices"
	"sort"
	"strings"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/monitor/query/azlogs"
	"github.com/Azure/azure-sdk-for-go/sdk/monitor/query/azmetrics"
	"github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/monitor/armmonitor"
	"github.com/samber/lo"
	"google.golang.org/protobuf/types/known/timestamppb"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
	"github.com/pluralsh/console/go/cloud-query/internal/tools/series"
)

type AzureMetricsRequest struct {
	MetricsEndpoint string
	MetricNamespace string
	MetricNames     []string
	ResourceIDs     azmetrics.ResourceIDList
	Options         *azmetrics.QueryResourcesOptions
}

func (in *AzureMetricsRequest) init(input *toolquery.MetricsQueryInput) (*AzureMetricsRequest, error) {
	metricNames, err := in.toMetricNames(input.GetQuery())
	if err != nil {
		return nil, err
	}

	options := input.GetOptions()
	if options == nil {
		return nil, fmt.Errorf("metrics options are required")
	}
	azure := options.GetAzure()
	if azure == nil {
		return nil, fmt.Errorf("azure metrics options are required")
	}
	if strings.TrimSpace(azure.GetMetricsNamespace()) == "" {
		return nil, fmt.Errorf("azure metrics options require metrics_namespace")
	}
	resourceID := strings.TrimSpace(azure.GetResourceId())
	if resourceID == "" {
		return nil, fmt.Errorf("azure metrics options require resource_id")
	}

	start, end := in.toTimeRange(input.GetRange())
	if start == "" || end == "" {
		return nil, fmt.Errorf("metrics range is required")
	}

	interval, err := in.toInterval(input.GetStep())
	if err != nil {
		return nil, err
	}
	interval = azureInterval(interval, series.MinStep(input.GetRange().GetStart().AsTime(), input.GetRange().GetEnd().AsTime()))

	in.MetricNames = metricNames
	in.MetricsEndpoint = strings.TrimSpace(azure.GetMetricsEndpoint())
	in.MetricNamespace = strings.TrimSpace(azure.GetMetricsNamespace())
	in.Options = &azmetrics.QueryResourcesOptions{
		Aggregation: lo.Ternary(len(azure.GetAggregation()) > 0, new(azure.GetAggregation()), nil),
		EndTime:     lo.Ternary(len(end) > 0, new(end), nil),
		Filter:      lo.Ternary(len(azure.GetFilter()) > 0, new(azure.GetFilter()), nil),
		Interval:    lo.Ternary(len(interval) > 0, new(interval), nil),
		OrderBy:     lo.Ternary(len(azure.GetOrderBy()) > 0, new(azure.GetOrderBy()), nil),
		RollUpBy:    lo.Ternary(len(azure.GetRollUpBy()) > 0, new(azure.GetRollUpBy()), nil),
		StartTime:   lo.Ternary(len(start) > 0, new(start), nil),
	}

	return in, nil
}

func (in *AzureMetricsRequest) toMetricNames(query string) ([]string, error) {
	metricNames := make([]string, 0, 4)
	for _, name := range strings.Split(query, ",") {
		if name = strings.TrimSpace(name); name != "" {
			metricNames = append(metricNames, name)
		}
	}
	if len(metricNames) == 0 {
		return nil, fmt.Errorf("azure metrics query requires at least one metric name in query")
	}

	return metricNames, nil
}

func (in *AzureMetricsRequest) toTimeRange(timeRange *toolquery.TimeRange) (string, string) {
	if timeRange == nil || timeRange.GetStart() == nil || timeRange.GetEnd() == nil {
		return "", ""
	}
	start := timeRange.GetStart().AsTime().UTC().Format(time.RFC3339Nano)
	end := timeRange.GetEnd().AsTime().UTC().Format(time.RFC3339Nano)

	return start, end
}

func (in *AzureMetricsRequest) toInterval(step string) (string, error) {
	if len(step) == 0 {
		return "", fmt.Errorf("%q is required", "step")
	}

	iso8601DurationRegex := regexp.MustCompile(`^P(?:\d+Y)?(?:\d+M)?(?:\d+W)?(?:\d+D)?(?:T(?:\d+H)?(?:\d+M)?(?:\d+S)?)?$`)

	if !iso8601DurationRegex.MatchString(step) {
		return "", fmt.Errorf("%q is not a valid ISO 8601 duration", step)
	}

	return step, nil
}

type azureTimeGrain struct {
	grain    string
	duration time.Duration
}

// the time grains Azure Monitor metrics support, finest first
var azureIntervals = []azureTimeGrain{
	{"PT1M", time.Minute},
	{"PT5M", 5 * time.Minute},
	{"PT15M", 15 * time.Minute},
	{"PT30M", 30 * time.Minute},
	{"PT1H", time.Hour},
	{"PT6H", 6 * time.Hour},
	{"PT12H", 12 * time.Hour},
	{"P1D", 24 * time.Hour},
}

// azureInterval raises a supported time grain finer than minStep to the finest grain that isn't, or the coarsest
// one. Other durations are passed through for Azure to judge.
func azureInterval(interval string, minStep time.Duration) string {
	i := slices.IndexFunc(azureIntervals, func(g azureTimeGrain) bool { return g.grain == interval })
	if i < 0 || azureIntervals[i].duration >= minStep {
		return interval
	}

	for _, g := range azureIntervals[i:] {
		if g.duration >= minStep {
			return g.grain
		}
	}

	return azureIntervals[len(azureIntervals)-1].grain
}

func NewAzureMetricsRequest(input *toolquery.MetricsQueryInput) (*AzureMetricsRequest, error) {
	resourceID := ""
	if input != nil && input.GetOptions() != nil && input.GetOptions().GetAzure() != nil {
		resourceID = strings.TrimSpace(input.GetOptions().GetAzure().GetResourceId())
	}
	return (&AzureMetricsRequest{
		ResourceIDs: azmetrics.ResourceIDList{
			ResourceIDs: []string{resourceID},
		},
	}).init(input)
}

type AzureMetricsResponse struct {
	azmetrics.QueryResourcesResponse
}

func (r *AzureMetricsResponse) ToMetricsSeriesOutput() *toolquery.MetricsSeriesOutput {
	builder := series.NewBuilder()
	for _, metricData := range r.Values {
		resourceURI := strings.TrimSpace(lo.FromPtr(metricData.ResourceID))
		for _, metric := range metricData.Values {
			name := lo.FromPtr(metric.Name.Value)
			if name == "" {
				continue
			}

			for _, timeSeries := range metric.TimeSeries {
				baseLabels := map[string]string{
					"resource_uri": resourceURI,
				}
				if namespace := lo.FromPtr(metricData.Namespace); namespace != "" {
					baseLabels["metric_namespace"] = namespace
				}

				for _, metadata := range timeSeries.MetadataValues {
					key := lo.FromPtr(metadata.Name.Value)
					value := lo.FromPtr(metadata.Value)
					if key == "" || value == "" {
						continue
					}

					baseLabels[key] = value
				}

				labels := make([]map[string]string, len(azureAggregations))
				for i, aggregation := range azureAggregations {
					labels[i] = make(map[string]string, len(baseLabels)+1)
					for key, val := range baseLabels {
						labels[i][key] = val
					}
					labels[i]["aggregation"] = aggregation
				}

				for _, point := range timeSeries.Data {
					if point.TimeStamp == nil {
						continue
					}

					timestamp := point.TimeStamp.UTC()
					for i, value := range azureAggregationValues(&point) {
						if value != nil {
							builder.Add(name, labels[i], timestamp, *value)
						}
					}
				}
			}
		}
	}

	return builder.Output()
}

var azureAggregations = []string{"average", "minimum", "maximum", "total", "count"}

// azureAggregationValues returns the point's values in azureAggregations order.
func azureAggregationValues(point *azmetrics.MetricValue) []*float64 {
	return []*float64{point.Average, point.Minimum, point.Maximum, point.Total, point.Count}
}

func NewAzureMetricsResponse(response azmetrics.QueryResourcesResponse) *AzureMetricsResponse {
	return &AzureMetricsResponse{response}
}

type AzureMetricsSearchResponse []*armmonitor.MetricDefinition

func (r AzureMetricsSearchResponse) ToMetricsSearchOutput(query string, limit int) *toolquery.MetricsSearchOutput {
	if limit <= 0 {
		return &toolquery.MetricsSearchOutput{}
	}

	filter := strings.ToLower(strings.TrimSpace(query))
	namesSet := make(map[string]struct{}, len(r))
	names := make([]string, 0, len(r))

	for _, definition := range r {
		if definition == nil {
			continue
		}

		name := lo.FromPtr(definition.Name.Value)
		if name == "" {
			continue
		}
		if filter != "" && !strings.Contains(strings.ToLower(name), filter) {
			continue
		}
		if _, exists := namesSet[name]; exists {
			continue
		}

		namesSet[name] = struct{}{}
		names = append(names, name)
	}

	sort.Strings(names)
	if len(names) > limit {
		names = names[:limit]
	}

	results := make([]*toolquery.MetricsSearchResult, 0, len(names))
	for _, name := range names {
		results = append(results, &toolquery.MetricsSearchResult{Name: name})
	}

	return &toolquery.MetricsSearchOutput{Metrics: results}
}

type AzureLogsQueryOutput struct {
	azlogs.QueryResourceResponse
}

func (in AzureLogsQueryOutput) ToLogsQueryOutput(limit int32) *toolquery.LogsQueryOutput {
	logs := make([]*toolquery.LogEntry, 0)
	for _, table := range in.Tables {
		messageIdx, timestampIdx := in.inferAzureLogColumnIndexes(table.Columns)
		columns := make([]string, len(table.Columns))
		for i, col := range table.Columns {
			columns[i] = strings.TrimSpace(lo.FromPtr(col.Name))
		}

		for _, row := range table.Rows {
			timestamp := in.extractAzureTimestamp(row, timestampIdx)
			message := in.extractAzureMessage(row, messageIdx)
			labels := make(map[string]string, len(columns))
			for i, colName := range columns {
				if colName == "" || i == messageIdx || i == timestampIdx || i >= len(row) {
					continue
				}
				if value := strings.TrimSpace(fmt.Sprintf("%v", row[i])); value != "" && value != "<nil>" {
					labels[colName] = value
				}
			}
			// In Azure logs queries, actual log text can be returned in fields like
			// "LogEntry" while another column (for example resource ID) might be
			// selected as the fallback message. Prefer known log-text label fields.
			if candidate, key, ok := in.messageFromLabels(labels); ok {
				message = candidate
				delete(labels, key)
			}
			logs = append(logs, &toolquery.LogEntry{
				Timestamp: timestamppb.New(timestamp),
				Message:   message,
				Labels:    labels,
			})
		}
	}

	sort.Slice(logs, func(i, j int) bool { return logs[i].Timestamp.AsTime().Before(logs[j].Timestamp.AsTime()) })
	if limit > 0 && int32(len(logs)) > limit {
		logs = logs[:limit]
	}

	return &toolquery.LogsQueryOutput{Logs: logs}
}

func (in AzureLogsQueryOutput) inferAzureLogColumnIndexes(columns []azlogs.Column) (messageIdx int, timestampIdx int) {
	messageIdx = -1
	timestampIdx = -1
	for i, column := range columns {
		name := strings.ToLower(strings.TrimSpace(lo.FromPtr(column.Name)))
		switch name {
		case "timestamp", "timegenerated", "time":
			if timestampIdx == -1 {
				timestampIdx = i
			}
		case "message", "msg", "log", "renderedmessage", "logentry", "logmessage":
			if messageIdx == -1 {
				messageIdx = i
			}
		}
	}

	return messageIdx, timestampIdx
}

func (in AzureLogsQueryOutput) extractAzureMessage(row azlogs.Row, messageIdx int) string {
	if messageIdx >= 0 && messageIdx < len(row) {
		msg := strings.TrimSpace(fmt.Sprintf("%v", row[messageIdx]))
		if msg != "" && msg != "<nil>" {
			return msg
		}
	}
	if len(row) == 0 {
		return ""
	}

	return strings.TrimSpace(fmt.Sprintf("%v", row[len(row)-1]))
}

func (in AzureLogsQueryOutput) extractAzureTimestamp(row azlogs.Row, timestampIdx int) time.Time {
	if timestampIdx >= 0 && timestampIdx < len(row) {
		switch v := row[timestampIdx].(type) {
		case time.Time:
			return v.UTC()
		case string:
			if parsed, err := time.Parse(time.RFC3339Nano, v); err == nil {
				return parsed.UTC()
			}
			if parsed, err := time.Parse(time.RFC3339, v); err == nil {
				return parsed.UTC()
			}
		}
	}

	return time.Now().UTC()
}

func (in AzureLogsQueryOutput) messageFromLabels(labels map[string]string) (string, string, bool) {
	if len(labels) == 0 {
		return "", "", false
	}

	preferred := []string{
		"logentry",
		"message",
		"renderedmessage",
		"logmessage",
		"log",
		"msg",
	}

	for _, preferredKey := range preferred {
		for key, value := range labels {
			if strings.EqualFold(key, preferredKey) {
				if message := strings.TrimSpace(value); message != "" {
					return message, key, true
				}
			}
		}
	}

	return "", "", false
}
