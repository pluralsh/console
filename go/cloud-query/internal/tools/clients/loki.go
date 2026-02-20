package clients

import (
	"context"
	"fmt"
	"net/url"
	"strings"

	"resty.dev/v3"
)

type LokiLogsResponse struct {
	Status string `json:"status"`
	Data   struct {
		ResultType string `json:"resultType"`
		Result     []struct {
			Stream map[string]string `json:"stream"`
			Values [][]any           `json:"values"`
		} `json:"result"`
	} `json:"data"`
}

type LokiClient struct {
	*resty.Client

	baseUrl string
}

func (in *LokiClient) Logs(ctx context.Context, query, start, end, limit string) (*LokiLogsResponse, error) {
	var resp LokiLogsResponse
	response, err := in.R().
		SetContext(ctx).
		SetQueryString(in.logsParams(query, start, end, limit).Encode()).
		SetResult(&resp).
		Get(in.logsEndpoint())
	if err != nil {
		return nil, err
	}
	if response.IsError() {
		return nil, fmt.Errorf("loki query failed: status=%d body=%s", response.StatusCode(), response.String())
	}

	return &resp, nil
}

func (in *LokiClient) logsEndpoint() string {
	return strings.TrimSuffix(in.baseUrl, "/") + "/loki/api/v1/query_range"
}

func (in *LokiClient) logsParams(query, start, end, limit string) url.Values {
	params := url.Values{
		"query": {query},
		"start": {start},
		"end":   {end},
	}

	if len(limit) > 0 {
		params.Add("limit", limit)
	}

	return params
}

func NewLokiClient(baseUrl, token, tenantID string) *LokiClient {
	client := resty.New()

	client.SetAuthToken(token)
	client.SetAuthScheme("Bearer")

	if len(tenantID) > 0 {
		client.SetHeader("X-Scope-OrgID", tenantID)
	}

	return &LokiClient{Client: client, baseUrl: baseUrl}
}
