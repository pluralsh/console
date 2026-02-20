package clients

import (
	"context"
	"fmt"
	"net/url"
	"strings"

	"resty.dev/v3"

	"github.com/pluralsh/console/go/cloud-query/internal/tools/datasource"
)

type TempoSearchResponse struct {
	Traces []struct {
		TraceID string `json:"traceID"`
	} `json:"traces"`
}

type TempoClient struct {
	*resty.Client

	baseUrl string
}

func (in *TempoClient) Search(ctx context.Context, query, start, end, limit string) (*TempoSearchResponse, error) {
	var resp TempoSearchResponse
	response, err := in.R().
		SetContext(ctx).
		SetQueryString(in.searchParams(query, start, end, limit).Encode()).
		SetResult(&resp).
		Get(in.searchEndpoint())
	if err != nil {
		return nil, err
	}
	if response.IsError() {
		return nil, fmt.Errorf("tempo search failed: status=%d body=%s", response.StatusCode(), response.String())
	}

	return &resp, nil
}

func (in *TempoClient) Trace(ctx context.Context, traceID string) (*datasource.TempoTraceResponse, error) {
	var resp datasource.TempoTraceResponse
	response, err := in.R().
		SetContext(ctx).
		SetResult(&resp).
		Get(in.traceEndpoint(traceID))
	if err != nil {
		return nil, err
	}
	if response.IsError() {
		return nil, fmt.Errorf("tempo trace fetch failed: status=%d body=%s", response.StatusCode(), response.String())
	}

	return &resp, nil
}

func (in *TempoClient) searchEndpoint() string {
	return strings.TrimSuffix(in.baseUrl, "/") + "/api/search"
}

func (in *TempoClient) traceEndpoint(traceID string) string {
	return strings.TrimSuffix(in.baseUrl, "/") + "/api/traces/" + traceID
}

func (in *TempoClient) searchParams(query, start, end, limit string) url.Values {
	params := url.Values{
		"q":     {query},
		"start": {start},
		"end":   {end},
	}

	if len(limit) > 0 {
		params.Add("limit", limit)
	}

	return params
}

func NewTempoClient(baseUrl, token, tenantID string) *TempoClient {
	client := resty.New()

	client.SetAuthToken(token)
	client.SetAuthScheme("Bearer")

	if len(tenantID) > 0 {
		client.SetHeader("X-Scope-OrgID", tenantID)
	}

	return &TempoClient{Client: client, baseUrl: baseUrl}
}
