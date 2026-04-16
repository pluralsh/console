package client

import (
	"context"
	"fmt"
	"strings"

	"resty.dev/v3"

	"github.com/pluralsh/console/go/cloud-query/internal/tools/datasource"
)

const jaegerTracesEndpoint = "/api/v3/traces"

type JaegerTraceQuery struct {
	ServiceName   string
	OperationName string
	Attributes    map[string]string
	StartTimeMin  string
	StartTimeMax  string
	DurationMin   string
	DurationMax   string
	SearchDepth   int32
}

type jaegerTracesRequest struct {
	Query *jaegerTraceQueryBody `json:"query"`
}

type jaegerTraceQueryBody struct {
	ServiceName   string            `json:"service_name,omitempty"`
	OperationName string            `json:"operation_name,omitempty"`
	Attributes    map[string]string `json:"attributes,omitempty"`
	StartTimeMin  string            `json:"start_time_min,omitempty"`
	StartTimeMax  string            `json:"start_time_max,omitempty"`
	DurationMin   string            `json:"duration_min,omitempty"`
	DurationMax   string            `json:"duration_max,omitempty"`
	SearchDepth   int32             `json:"search_depth,omitempty"`
}

type jaegerTracesResponse struct {
	Result datasource.TempoTraceResponse `json:"result"`
}

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

func (in *JaegerClient) Traces(ctx context.Context, query JaegerTraceQuery) (*datasource.TempoTraceResponse, error) {
	body := &jaegerTracesRequest{
		Query: &jaegerTraceQueryBody{
			ServiceName:   query.ServiceName,
			OperationName: query.OperationName,
			Attributes:    query.Attributes,
			StartTimeMin:  query.StartTimeMin,
			StartTimeMax:  query.StartTimeMax,
			DurationMin:   query.DurationMin,
			DurationMax:   query.DurationMax,
			SearchDepth:   query.SearchDepth,
		},
	}

	var resp jaegerTracesResponse
	response, err := in.R().
		SetContext(ctx).
		SetBody(body).
		SetResult(&resp).
		Post(in.baseURL + jaegerTracesEndpoint)
	if err != nil {
		return nil, err
	}
	if response.IsError() {
		return nil, fmt.Errorf("jaeger traces search failed: status=%d body=%s", response.StatusCode(), response.String())
	}

	return &resp.Result, nil
}
