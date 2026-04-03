package client

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"resty.dev/v3"

	"github.com/pluralsh/console/go/cloud-query/internal/tools/datasource"
)

const (
	DynatraceDqlExecuteEndpoint = "/platform/storage/query/v1/query:execute"
	DynatraceDqlPollEndpoint    = "/platform/storage/query/v1/query:poll"
)

type DynatraceClient struct {
	*resty.Client

	baseUrl string
}

func NewDynatraceClient(baseUrl, apiToken string) *DynatraceClient {
	client := resty.New()
	client.SetHeader("Authorization", "Bearer "+apiToken)

	return &DynatraceClient{Client: client, baseUrl: strings.TrimSuffix(baseUrl, "/")}
}

func (in *DynatraceClient) Metrics(ctx context.Context, query string) (*datasource.DynatraceMetricsQueryResponse, error) {
	var resp datasource.DynatraceMetricsQueryResponse
	if err := in.queryGrail(ctx, query, &resp); err != nil {
		return nil, err
	}

	return &resp, nil
}

func (in *DynatraceClient) MetricsSearch(ctx context.Context, query string, limit int64) (*datasource.DynatraceMetricsSearchResponse, error) {
	var resp datasource.DynatraceMetricsSearchResponse

	dql := fmt.Sprintf("metrics | filter contains(metric.key, %s, caseSensitive: false)", strconv.Quote(query))
	if limit > 0 {
		dql = fmt.Sprintf("%s | limit %d", dql, limit)
	}

	if err := in.queryGrail(ctx, dql, &resp); err != nil {
		return nil, err
	}

	return &resp, nil
}

func (in *DynatraceClient) Logs(ctx context.Context, query string) (*datasource.DynatraceLogsQueryResponse, error) {
	var resp datasource.DynatraceLogsQueryResponse
	if err := in.queryGrail(ctx, query, &resp); err != nil {
		return nil, err
	}

	return &resp, nil
}

func (in *DynatraceClient) Traces(ctx context.Context, query string) (*datasource.DynatraceTracesQueryResponse, error) {
	var resp datasource.DynatraceTracesQueryResponse
	if err := in.queryGrail(ctx, query, &resp); err != nil {
		return nil, err
	}

	return &resp, nil
}

func (in *DynatraceClient) queryGrail(ctx context.Context, query string, result any) error {
	body := map[string]any{"query": query}

	var execResp datasource.DynatraceExecutionResponse
	response, err := in.R().
		SetContext(ctx).
		SetBody(body).
		SetResult(&execResp).
		Post(in.baseUrl + DynatraceDqlExecuteEndpoint)
	if err != nil {
		return err
	}
	if response.IsError() {
		return fmt.Errorf("dynatrace grail query execution failed: status=%d body=%s", response.StatusCode(), response.String())
	}

	if err = in.validateState(execResp.State); err != nil {
		return err
	}

	if execResp.State == datasource.DynatraceQueryStateSucceeded {
		payload, err := json.Marshal(execResp)
		if err != nil {
			return err
		}

		return json.Unmarshal(payload, result)
	}

	if execResp.RequestToken == "" {
		return fmt.Errorf("dynatrace grail query execution did not return request token")
	}

	for {
		var pollResp datasource.DynatracePollResponse
		response, err = in.R().
			SetContext(ctx).
			SetQueryParam("request-token", execResp.RequestToken).
			SetResult(&pollResp).
			Get(in.baseUrl + DynatraceDqlPollEndpoint)

		if err != nil {
			return err
		}
		if response.IsError() {
			return fmt.Errorf("dynatrace grail query polling failed: status=%d body=%s", response.StatusCode(), response.String())
		}

		if err = in.validateState(pollResp.State); err != nil {
			return err
		}

		if pollResp.State == datasource.DynatraceQueryStateSucceeded {
			payload, err := json.Marshal(pollResp)
			if err != nil {
				return err
			}

			return json.Unmarshal(payload, result)
		}

		// If we got here, the query is still running
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(time.Second):
			// poll again
		}
	}
}

func (in *DynatraceClient) validateState(state datasource.DynatraceQueryState) error {
	switch state {
	case datasource.DynatraceQueryStateSucceeded,
		datasource.DynatraceQueryStateRunning:
		return nil
	case datasource.DynatraceQueryStateFailed,
		datasource.DynatraceQueryStateCancelled,
		datasource.DynatraceQueryStateResultGone:
		return fmt.Errorf("dynatrace grail query ended with state=%s", state)
	default:
		return fmt.Errorf("invalid dynatrace grail query state: %s", state)
	}
}
