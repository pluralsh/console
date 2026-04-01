package client

import (
	"context"
	"fmt"
	"strings"
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"
	"resty.dev/v3"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
)

type DynatraceMetricsResponse struct {
	Result []struct {
		MetricId string `json:"metricId"`
		Data     []struct {
			Dimensions map[string]string `json:"dimensions"`
			Timestamps []int64           `json:"timestamps"`
			Values     []float64         `json:"values"`
		} `json:"data"`
	} `json:"result"`
}

type DynatraceMetricsSearchResponse struct {
	Metrics []struct {
		MetricId string `json:"metricId"`
	} `json:"metrics"`
}

type DynatraceDqlResponse struct {
	Results []struct {
		Records []map[string]any `json:"records"`
	} `json:"results"`
}

type DynatraceClient struct {
	*resty.Client

	baseUrl string
}

func NewDynatraceClient(baseUrl, apiToken string) *DynatraceClient {
	client := resty.New()
	client.SetHeader("Authorization", "Bearer "+apiToken)

	return &DynatraceClient{Client: client, baseUrl: strings.TrimSuffix(baseUrl, "/")}
}

func (in *DynatraceClient) Metrics(ctx context.Context, query string, from, to int64) (*DynatraceMetricsResponse, error) {
	var resp DynatraceMetricsResponse
	response, err := in.R().
		SetContext(ctx).
		SetQueryParams(map[string]string{
			"metricSelector": query,
			"from":           fmt.Sprintf("%d", from),
			"to":             fmt.Sprintf("%d", to),
		}).
		SetResult(&resp).
		Get(in.baseUrl + "/api/v2/metrics/query")

	if err != nil {
		return nil, err
	}
	if response.IsError() {
		return nil, fmt.Errorf("dynatrace metrics query failed: status=%d body=%s", response.StatusCode(), response.String())
	}

	return &resp, nil
}

func (in *DynatraceClient) MetricsSearch(ctx context.Context, query string) (*DynatraceMetricsSearchResponse, error) {
	var resp DynatraceMetricsSearchResponse
	response, err := in.R().
		SetContext(ctx).
		SetQueryParam("text", query).
		SetResult(&resp).
		Get(in.baseUrl + "/api/v2/metrics")

	if err != nil {
		return nil, err
	}
	if response.IsError() {
		return nil, fmt.Errorf("dynatrace metrics search failed: status=%d body=%s", response.StatusCode(), response.String())
	}

	return &resp, nil
}

func (in *DynatraceClient) QueryGrail(ctx context.Context, query string, from, to string) (*toolquery.LogsQueryOutput, error) {
	var dqlResp DynatraceDqlResponse
	body := map[string]any{
		"query":                 query,
		"defaultTimeframeStart": from,
		"defaultTimeframeEnd":   to,
	}

	response, err := in.R().
		SetContext(ctx).
		SetBody(body).
		SetResult(&dqlResp).
		Post(in.baseUrl + "/api/v2/query/execute")

	if err != nil {
		return nil, err
	}
	if response.IsError() {
		return nil, fmt.Errorf("dynatrace grail query failed: status=%d body=%s", response.StatusCode(), response.String())
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

func (in *DynatraceClient) Logs(ctx context.Context, query string, from, to string) (*toolquery.LogsQueryOutput, error) {
	return in.QueryGrail(ctx, query, from, to)
}

func (in *DynatraceClient) Traces(ctx context.Context, query string, from, to string) (*toolquery.TracesQueryOutput, error) {
	res, err := in.QueryGrail(ctx, query, from, to)
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
