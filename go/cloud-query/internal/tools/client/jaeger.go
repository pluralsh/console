package client

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"strconv"
	"strings"

	"resty.dev/v3"

	"github.com/pluralsh/console/go/cloud-query/internal/tools/datasource"
)

const (
	jaegerTracesEndpoint = "/api/v3/traces"
	defaultLimit         = 100
)

type JaegerClient struct {
	*resty.Client

	baseURL string
}

func NewJaegerClient(baseURL, token, username, password string) *JaegerClient {
	client := resty.New()

	if token != "" {
		client.SetAuthToken(token)
		client.SetAuthScheme("Bearer")
	} else if username != "" && password != "" {
		client.SetBasicAuth(username, password)
	}

	return &JaegerClient{
		Client:  client,
		baseURL: strings.TrimSuffix(baseURL, "/"),
	}
}

func (in *JaegerClient) Traces(ctx context.Context, query datasource.JaegerTraceQuery) (*datasource.JaegerTraceResponse, error) {
	traces := new(datasource.JaegerTracesResponse)
	req := in.R().
		SetContext(ctx).
		SetHeader("Accept", "application/json").
		SetResult(traces)

	if query.ServiceName != "" {
		req.SetQueryParam("query.service_name", query.ServiceName)
	}
	if query.OperationName != "" {
		req.SetQueryParam("query.operation_name", query.OperationName)
	}
	if query.StartTimeMin != "" {
		req.SetQueryParam("query.start_time_min", query.StartTimeMin)
	}
	if query.StartTimeMax != "" {
		req.SetQueryParam("query.start_time_max", query.StartTimeMax)
	}
	if query.DurationMin != "" {
		req.SetQueryParam("query.duration_min", query.DurationMin)
	}
	if query.DurationMax != "" {
		req.SetQueryParam("query.duration_max", query.DurationMax)
	}
	if query.Limit > 0 {
		req.SetQueryParam("query.num_traces", strconv.Itoa(int(query.Limit)))
		req.SetQueryParam("query.search_depth", strconv.Itoa(int(query.Limit)))
		req.SetQueryParam("query.limit", strconv.Itoa(int(query.Limit)))
	} else {
		req.SetQueryParam("query.num_traces", strconv.Itoa(defaultLimit))
		req.SetQueryParam("query.search_depth", strconv.Itoa(defaultLimit))
		req.SetQueryParam("query.limit", strconv.Itoa(defaultLimit))
	}
	if len(query.Attributes) > 0 {
		attrsJSON, err := json.Marshal(query.Attributes)
		if err != nil {
			return nil, fmt.Errorf("jaeger: failed to encode attributes: %w", err)
		}
		req.SetQueryParam("query.attributes", string(attrsJSON))
	}

	response, err := req.Get(in.baseURL + jaegerTracesEndpoint)
	if err != nil {
		return nil, err
	}

	return in.tracesResult(response, traces, "jaeger traces search")
}

// Trace fetches every span of one trace.
func (in *JaegerClient) Trace(ctx context.Context, traceID string) (*datasource.JaegerTraceResponse, error) {
	traces := new(datasource.JaegerTracesResponse)
	response, err := in.R().
		SetContext(ctx).
		SetHeader("Accept", "application/json").
		SetResult(traces).
		Get(in.baseURL + jaegerTracesEndpoint + "/" + url.PathEscape(traceID))
	if err != nil {
		return nil, err
	}

	return in.tracesResult(response, traces, "jaeger trace fetch")
}

// Services lists the services that reported spans.
func (in *JaegerClient) Services(ctx context.Context) ([]string, error) {
	var resp struct {
		Services []string `json:"services"`
	}
	if err := in.getJSON(ctx, "/api/v3/services", nil, &resp); err != nil {
		return nil, err
	}

	return resp.Services, nil
}

// Operations lists a service's span names.
func (in *JaegerClient) Operations(ctx context.Context, service string) ([]string, error) {
	var resp struct {
		Operations []struct {
			Name string `json:"name"`
		} `json:"operations"`
	}
	if err := in.getJSON(ctx, "/api/v3/operations", map[string]string{"service": service}, &resp); err != nil {
		return nil, err
	}

	names := make([]string, 0, len(resp.Operations))
	for _, op := range resp.Operations {
		names = append(names, op.Name)
	}

	return names, nil
}

// getJSON decodes the body itself, as Jaeger can answer with text/plain.
func (in *JaegerClient) getJSON(ctx context.Context, path string, params map[string]string, result any) error {
	response, err := in.R().
		SetContext(ctx).
		SetHeader("Accept", "application/json").
		SetQueryParams(params).
		Get(in.baseURL + path)
	if err != nil {
		return err
	}
	if response.IsError() {
		return fmt.Errorf("jaeger request to %s failed: status=%d body=%s", path, response.StatusCode(), response.String())
	}

	return json.Unmarshal(response.Bytes(), result)
}

func (in *JaegerClient) tracesResult(response *resty.Response, traces *datasource.JaegerTracesResponse, operation string) (*datasource.JaegerTraceResponse, error) {
	if response.IsError() {
		return nil, fmt.Errorf("%s failed: status=%d body=%s", operation, response.StatusCode(), response.String())
	}

	// Fallback: manually unmarshal if automatic unmarshalling failed due to incorrect Content-Type
	if len(traces.Result.ResourceSpans) == 0 && len(response.Bytes()) > 0 {
		if err := json.Unmarshal(response.Bytes(), traces); err != nil {
			return nil, fmt.Errorf("failed to unmarshal response: %w", err)
		}
	}

	return &traces.Result, nil
}
