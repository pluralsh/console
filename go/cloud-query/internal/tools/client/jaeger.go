package client

import (
	"context"
	"encoding/json"
	"fmt"
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
	if response.IsError() {
		return nil, fmt.Errorf("jaeger traces search failed: status=%d body=%s", response.StatusCode(), response.String())
	}

	// Fallback: manually unmarshal if automatic unmarshalling failed due to incorrect Content-Type
	if len(traces.Result.ResourceSpans) == 0 && len(response.Bytes()) > 0 {
		if err := json.Unmarshal(response.Bytes(), traces); err != nil {
			return nil, fmt.Errorf("failed to unmarshal response: %w", err)
		}
	}

	return &traces.Result, nil
}
