package datasource

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
)

type DynatraceQueryState string

const (
	DynatraceQueryStateRunning    DynatraceQueryState = "RUNNING"
	DynatraceQueryStateSucceeded  DynatraceQueryState = "SUCCEEDED"
	DynatraceQueryStateFailed     DynatraceQueryState = "FAILED"
	DynatraceQueryStateCancelled  DynatraceQueryState = "CANCELLED"
	DynatraceQueryStateResultGone DynatraceQueryState = "RESULT_GONE"
)

type DynatraceExecutionResponse struct {
	RequestToken string `json:"requestToken"`
	DynatraceRawQueryResponse
}

type DynatracePollResponse = DynatraceRawQueryResponse

type DynatraceRawQueryResponse = DynatraceQueryResponse[map[string]any]

type DynatraceQueryResponse[T any] struct {
	State    DynatraceQueryState     `json:"state"`
	Progress int64                   `json:"progress"`
	Result   DynatraceQueryResult[T] `json:"result"`
}

type DynatraceQueryResult[T any] struct {
	Records  []T                       `json:"records"`
	Types    []DynatraceTypeDescriptor `json:"types"`
	Metadata DynatraceQueryMetadata    `json:"metadata"`
}

type DynatraceTypeDescriptor struct {
	IndexRange []int64                        `json:"indexRange"`
	Mappings   map[string]DynatraceTypeSchema `json:"mappings"`
}

type DynatraceTypeSchema struct {
	Type  string                    `json:"type"`
	Types []DynatraceTypeDescriptor `json:"types,omitempty"`
}

type DynatraceQueryMetadata struct {
	Grail   DynatraceGrailMetadata    `json:"grail"`
	Metrics []DynatraceMetricMetadata `json:"metrics,omitempty"`
}

type DynatraceGrailMetadata struct {
	CanonicalQuery            string             `json:"canonicalQuery"`
	Timezone                  string             `json:"timezone"`
	Query                     string             `json:"query"`
	ScannedRecords            int64              `json:"scannedRecords"`
	DQLVersion                string             `json:"dqlVersion"`
	ScannedBytes              int64              `json:"scannedBytes"`
	ScannedDataPoints         int64              `json:"scannedDataPoints"`
	AnalysisTimeframe         DynatraceTimeframe `json:"analysisTimeframe"`
	Locale                    string             `json:"locale"`
	ExecutionTimeMilliseconds int64              `json:"executionTimeMilliseconds"`
	Notifications             []map[string]any   `json:"notifications"`
	QueryID                   string             `json:"queryId"`
	Sampled                   bool               `json:"sampled"`
}

type DynatraceMetricMetadata struct {
	FieldName   string `json:"fieldName"`
	MetricKey   string `json:"metric.key"`
	Aggregation string `json:"aggregation"`
}

type DynatraceTimeframe struct {
	Start string `json:"start"`
	End   string `json:"end"`
}

type DynatraceMetricsQueryResponse struct {
	DynatraceQueryResponse[DynatraceMetricsQueryRecord]
}

type DynatraceMetricsSearchResponse struct {
	DynatraceQueryResponse[DynatraceMetricsSearchRecord]
}

type DynatraceLogsQueryResponse struct {
	DynatraceQueryResponse[DynatraceLogsQueryRecord]
}

type DynatraceTracesQueryResponse struct {
	DynatraceQueryResponse[DynatraceTraceRecord]
}

type DynatraceMetricsQueryRecord struct {
	Timeframe  DynatraceTimeframe    `json:"timeframe"`
	Interval   string                `json:"interval"`
	Dimensions map[string]string     `json:"-"`
	Series     map[string][]*float64 `json:"-"`
	Fields     map[string]any        `json:"-"`
}

func (r *DynatraceMetricsQueryRecord) UnmarshalJSON(data []byte) error {
	type alias DynatraceMetricsQueryRecord
	aux := &struct {
		*alias
	}{
		alias: (*alias)(r),
	}
	if err := json.Unmarshal(data, aux); err != nil {
		return err
	}

	var raw map[string]json.RawMessage
	if err := json.Unmarshal(data, &raw); err != nil {
		return err
	}
	delete(raw, "timeframe")
	delete(raw, "interval")

	r.Dimensions = make(map[string]string)
	r.Series = make(map[string][]*float64)
	r.Fields = make(map[string]any)

	for key, value := range raw {
		if len(value) > 0 && value[0] == '[' {
			var values []*float64
			if err := json.Unmarshal(value, &values); err == nil {
				r.Series[key] = values
				continue
			}
		}

		var s string
		if err := json.Unmarshal(value, &s); err == nil {
			r.Dimensions[key] = s
			continue
		}

		var unknown any
		if err := json.Unmarshal(value, &unknown); err != nil {
			return err
		}
		r.Fields[key] = unknown
	}

	return nil
}

type DynatraceMetricsSearchRecord struct {
	MetricKey string         `json:"metric.key"`
	Fields    map[string]any `json:"-"`
}

func (r *DynatraceMetricsSearchRecord) UnmarshalJSON(data []byte) error {
	type alias DynatraceMetricsSearchRecord
	aux := &struct {
		*alias
	}{
		alias: (*alias)(r),
	}
	if err := json.Unmarshal(data, aux); err != nil {
		return err
	}

	var fields map[string]any
	if err := json.Unmarshal(data, &fields); err != nil {
		return err
	}
	delete(fields, "metric.key")
	r.Fields = fields

	return nil
}

type DynatraceLogsQueryRecord struct {
	Timestamp             string         `json:"timestamp"`
	Content               string         `json:"content"`
	Message               string         `json:"message"`
	Status                string         `json:"status"`
	LogLevel              string         `json:"loglevel"`
	ProcessTechnology     []string       `json:"process.technology"`
	OpenPipelinePipelines []string       `json:"dt.openpipeline.pipelines"`
	Fields                map[string]any `json:"-"`
}

type DynatraceTraceRecord struct {
	SpanName          string         `json:"span.name"`
	StartTimeUnixNano int64          `json:"start_time_unix_nano"`
	EndTimeUnixNano   int64          `json:"end_time_unix_nano"`
	TraceID           string         `json:"trace_id"`
	SpanID            string         `json:"span_id"`
	Timestamp         string         `json:"timestamp"`
	Fields            map[string]any `json:"-"`
}

func (r *DynatraceTraceRecord) UnmarshalJSON(data []byte) error {
	type alias DynatraceTraceRecord
	aux := &struct {
		*alias
	}{
		alias: (*alias)(r),
	}
	if err := json.Unmarshal(data, aux); err != nil {
		return err
	}

	var fields map[string]any
	if err := json.Unmarshal(data, &fields); err != nil {
		return err
	}
	delete(fields, "span.name")
	delete(fields, "start_time_unix_nano")
	delete(fields, "end_time_unix_nano")
	delete(fields, "trace_id")
	delete(fields, "span_id")
	delete(fields, "timestamp")
	r.Fields = fields

	return nil
}

func (r *DynatraceLogsQueryRecord) UnmarshalJSON(data []byte) error {
	type alias DynatraceLogsQueryRecord
	aux := &struct {
		*alias
	}{
		alias: (*alias)(r),
	}
	if err := json.Unmarshal(data, aux); err != nil {
		return err
	}

	var fields map[string]any
	if err := json.Unmarshal(data, &fields); err != nil {
		return err
	}
	delete(fields, "timestamp")
	delete(fields, "content")
	delete(fields, "message")
	delete(fields, "status")
	delete(fields, "loglevel")
	delete(fields, "process.technology")
	delete(fields, "dt.openpipeline.pipelines")
	r.Fields = fields

	return nil
}

func (r *DynatraceMetricsQueryResponse) ToMetricsQueryOutput() *toolquery.MetricsQueryOutput {
	if r == nil {
		return &toolquery.MetricsQueryOutput{}
	}

	output := &toolquery.MetricsQueryOutput{}
	metricNames := make(map[string]string, len(r.Result.Metadata.Metrics))
	for _, metric := range r.Result.Metadata.Metrics {
		if metric.FieldName != "" && metric.MetricKey != "" {
			metricNames[metric.FieldName] = metric.MetricKey
		}
	}

	for _, record := range r.Result.Records {
		output.Metrics = append(output.Metrics, record.ToMetricPoints(metricNames)...)
	}

	return output
}

func (r *DynatraceMetricsSearchResponse) ToMetricsSearchOutput() *toolquery.MetricsSearchOutput {
	if r == nil {
		return &toolquery.MetricsSearchOutput{}
	}

	output := &toolquery.MetricsSearchOutput{}
	for _, record := range r.Result.Records {
		if name := record.MetricKey; name != "" {
			output.Metrics = append(output.Metrics, &toolquery.MetricsSearchResult{Name: name})
		}
	}

	return output
}

func (r *DynatraceLogsQueryResponse) ToLogsQueryOutput() *toolquery.LogsQueryOutput {
	if r == nil {
		return &toolquery.LogsQueryOutput{}
	}

	output := &toolquery.LogsQueryOutput{}
	for _, record := range r.Result.Records {
		output.Logs = append(output.Logs, record.ToLogEntry())
	}

	return output
}

func (r *DynatraceTracesQueryResponse) ToTracesQueryOutput() *toolquery.TracesQueryOutput {
	if r == nil {
		return &toolquery.TracesQueryOutput{}
	}

	output := &toolquery.TracesQueryOutput{}
	for _, record := range r.Result.Records {
		output.Spans = append(output.Spans, record.ToTraceSpan())
	}

	return output
}

func (r *DynatraceMetricsQueryRecord) ToMetricPoints(metricNames map[string]string) []*toolquery.MetricPoint {
	points := make([]*toolquery.MetricPoint, 0)

	start, hasStart := parseTimestamp(r.Timeframe.Start)
	if hasStart && len(r.Series) > 0 {
		interval, hasInterval := parseDynatraceDuration(r.Interval)

		labels := make(map[string]string, len(r.Dimensions)+len(r.Fields))
		for k, v := range r.Dimensions {
			labels[k] = v
		}
		for k, v := range r.Fields {
			labels[k] = fmt.Sprint(v)
		}

		for fieldName, series := range r.Series {
			name := fieldName
			if metricName, ok := metricNames[fieldName]; ok && metricName != "" {
				name = metricName
			} else if derived, ok := deriveMetricKeyFromSeriesField(fieldName); ok {
				name = derived
			}

			for i, value := range series {
				if value == nil {
					continue
				}

				timestamp := start
				if hasInterval {
					timestamp = timestamp.Add(time.Duration(i) * interval)
				}

				point := &toolquery.MetricPoint{
					Timestamp: timestamppb.New(timestamp),
					Name:      name,
					Value:     *value,
					Labels:    make(map[string]string, len(labels)),
				}
				for k, v := range labels {
					point.Labels[k] = v
				}
				points = append(points, point)
			}
		}
	}

	if len(points) > 0 {
		return points
	}

	return nil
}

func (r *DynatraceLogsQueryRecord) ToLogEntry() *toolquery.LogEntry {
	entry := &toolquery.LogEntry{Labels: make(map[string]string)}
	if r.Message != "" {
		entry.Message = r.Message
	} else if r.Content != "" {
		entry.Message = r.Content
	}

	if ts, ok := parseTimestamp(r.Timestamp); ok {
		entry.Timestamp = timestamppb.New(ts)
	}

	for k, v := range r.Fields {
		entry.Labels[k] = fmt.Sprint(v)
	}

	if entry.Timestamp == nil {
		entry.Timestamp = timestamppb.New(time.Now())
	}

	return entry
}

func (r *DynatraceTraceRecord) ToTraceSpan() *toolquery.TraceSpan {
	span := &toolquery.TraceSpan{
		Name:    r.SpanName,
		TraceId: r.TraceID,
		SpanId:  r.SpanID,
		Tags:    make(map[string]string),
	}

	if r.StartTimeUnixNano > 0 {
		span.Start = timestamppb.New(time.Unix(0, r.StartTimeUnixNano))
	}
	if r.EndTimeUnixNano > 0 {
		span.End = timestamppb.New(time.Unix(0, r.EndTimeUnixNano))
	}
	if span.Start == nil {
		if ts, ok := parseTimestamp(r.Timestamp); ok {
			span.Start = timestamppb.New(ts)
		}
	}

	for k, v := range r.Fields {
		span.Tags[k] = fmt.Sprint(v)
	}

	if span.Start == nil {
		span.Start = timestamppb.New(time.Now())
	}
	if span.End == nil {
		span.End = span.Start
	}

	return span
}

func parseDynatraceDuration(value string) (time.Duration, bool) {
	if value == "" {
		return 0, false
	}

	nanos, err := strconv.ParseInt(value, 10, 64)
	if err != nil {
		return 0, false
	}

	return time.Duration(nanos), true
}

func deriveMetricKeyFromSeriesField(fieldName string) (string, bool) {
	openIdx := strings.Index(fieldName, "(")
	closeIdx := strings.LastIndex(fieldName, ")")
	if openIdx < 0 || closeIdx <= openIdx+1 {
		return "", false
	}

	key := strings.TrimSpace(fieldName[openIdx+1 : closeIdx])
	if key == "" {
		return "", false
	}

	return key, true
}

func parseTimestamp(t string) (time.Time, bool) {
	for _, layout := range []string{time.RFC3339Nano, time.RFC3339} {
		if parsed, err := time.Parse(layout, t); err == nil {
			return parsed, true
		}
	}

	return time.Time{}, false
}
