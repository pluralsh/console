package tools

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type DynatraceProvider struct {
	conn *toolquery.DynatraceConnection
}

func NewDynatraceProvider(conn *toolquery.DynatraceConnection) *DynatraceProvider {
	return &DynatraceProvider{conn: conn}
}

type dynatraceMetricsResponse struct {
	Result []struct {
		MetricId string `json:"metricId"`
		Data     []struct {
			Dimensions map[string]string `json:"dimensions"`
			Timestamps []int64           `json:"timestamps"`
			Values     []float64         `json:"values"`
		} `json:"data"`
	} `json:"result"`
}

func (in *DynatraceProvider) Metrics(ctx context.Context, input *toolquery.MetricsQueryInput) (*toolquery.MetricsQueryOutput, error) {
	if in.conn == nil {
		return nil, ErrInvalidArgument
	}

	url := fmt.Sprintf("%s/api/v2/metrics/query?metricSelector=%s&from=%d&to=%d",
		in.conn.Url,
		input.Query,
		input.GetRange().GetStart().AsTime().UnixMilli(),
		input.GetRange().GetEnd().AsTime().UnixMilli())

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+in.conn.ApiToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("dynatrace api error: %s", string(body))
	}

	var metricsResp dynatraceMetricsResponse
	if err := json.NewDecoder(resp.Body).Decode(&metricsResp); err != nil {
		return nil, err
	}

	output := &toolquery.MetricsQueryOutput{}
	for _, res := range metricsResp.Result {
		for _, data := range res.Data {
			for i, ts := range data.Timestamps {
				output.Metrics = append(output.Metrics, &toolquery.MetricPoint{
					Timestamp: timestamppb.New(time.UnixMilli(ts)),
					Name:      res.MetricId,
					Value:     data.Values[i],
					Labels:    data.Dimensions,
				})
			}
		}
	}

	return output, nil
}

func (in *DynatraceProvider) MetricsSearch(ctx context.Context, input *toolquery.MetricsSearchInput) (*toolquery.MetricsSearchOutput, error) {
	if in.conn == nil {
		return nil, ErrInvalidArgument
	}

	url := fmt.Sprintf("%s/api/v2/metrics?text=%s", in.conn.Url, input.Query)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+in.conn.ApiToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result struct {
		Metrics []struct {
			MetricId string `json:"metricId"`
		} `json:"metrics"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	output := &toolquery.MetricsSearchOutput{}
	for _, m := range result.Metrics {
		output.Metrics = append(output.Metrics, &toolquery.MetricsSearchResult{Name: m.MetricId})
	}
	return output, nil
}

type dynatraceDqlResponse struct {
	Results []struct {
		Records []map[string]any `json:"records"`
	} `json:"results"`
}

func (in *DynatraceProvider) Logs(ctx context.Context, input *toolquery.LogsQueryInput) (*toolquery.LogsQueryOutput, error) {
	return in.queryGrail(ctx, input.Query, input.Range)
}

func (in *DynatraceProvider) Traces(ctx context.Context, input *toolquery.TracesQueryInput) (*toolquery.TracesQueryOutput, error) {
	res, err := in.queryGrail(ctx, input.Query, input.Range)
	if err != nil {
		return nil, err
	}

	output := &toolquery.TracesQueryOutput{}
	for _, log := range res.Logs {
		output.Spans = append(output.Spans, &toolquery.TraceSpan{
			TraceId: log.Labels["trace_id"],
			SpanId:  log.Labels["span_id"],
			Name:    log.Message,
			Start:   log.Timestamp,
			End:     log.Timestamp,
			Tags:    log.Labels,
		})
	}
	return output, nil
}

func (in *DynatraceProvider) queryGrail(ctx context.Context, query string, timeRange *toolquery.TimeRange) (*toolquery.LogsQueryOutput, error) {
	if in.conn == nil {
		return nil, ErrInvalidArgument
	}

	url := fmt.Sprintf("%s/api/v2/query/execute", in.conn.Url)
	body := map[string]any{
		"query":                 query,
		"defaultTimeframeStart": timeRange.GetStart().AsTime().Format(time.RFC3339),
		"defaultTimeframeEnd":   timeRange.GetEnd().AsTime().Format(time.RFC3339),
	}
	jsonBody, _ := json.Marshal(body)

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+in.conn.ApiToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("dynatrace grail api error: %s", string(respBody))
	}

	var dqlResp dynatraceDqlResponse
	if err := json.NewDecoder(resp.Body).Decode(&dqlResp); err != nil {
		return nil, err
	}

	output := &toolquery.LogsQueryOutput{}
	for _, res := range dqlResp.Results {
		for _, record := range res.Records {
			entry := &toolquery.LogEntry{
				Labels: make(map[string]string),
			}
			for k, v := range record {
				if k == "content" || k == "message" {
					entry.Message = fmt.Sprint(v)
				} else if k == "timestamp" {
					if tsStr, ok := v.(string); ok {
						if t, err := time.Parse(time.RFC3339, tsStr); err == nil {
							entry.Timestamp = timestamppb.New(t)
						}
					}
				} else {
					entry.Labels[k] = fmt.Sprint(v)
				}
			}
			if entry.Timestamp == nil {
				entry.Timestamp = timestamppb.New(time.Now())
			}
			output.Logs = append(output.Logs, entry)
		}
	}

	return output, nil
}
