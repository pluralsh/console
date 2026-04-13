package tools

import (
	"context"
	"fmt"
	"strings"

	"github.com/Azure/azure-sdk-for-go/sdk/monitor/query/azlogs"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
	"github.com/pluralsh/console/go/cloud-query/internal/tools/client"
	"github.com/pluralsh/console/go/cloud-query/internal/tools/datasource"
)

type AzureProvider struct {
	conn   *toolquery.AzureConnection
	client *client.AzureClient
}

func NewAzureProvider(conn *toolquery.AzureConnection) (*AzureProvider, error) {
	if conn == nil {
		return nil, fmt.Errorf("%w: azure connection is required", ErrInvalidArgument)
	}
	azClient, err := client.NewAzureClient(conn.GetSubscriptionId(), conn.GetTenantId(), conn.GetClientId(), conn.GetClientSecret())
	if err != nil {
		return nil, err
	}

	return (&AzureProvider{
		conn:   conn,
		client: azClient,
	}).validate()
}

func (in *AzureProvider) Metrics(ctx context.Context, input *toolquery.MetricsQueryInput) (*toolquery.MetricsQueryOutput, error) {
	if input == nil || input.GetQuery() == "" {
		return nil, fmt.Errorf("%w: query is required", ErrInvalidArgument)
	}

	request, err := datasource.NewAzureMetricsRequest(input)
	if err != nil {
		return nil, fmt.Errorf("%w: %w", ErrInvalidArgument, err)
	}

	resp, err := in.client.Metrics(
		ctx,
		request.MetricsEndpoint,
		request.MetricNamespace,
		request.MetricNames,
		request.ResourceIDs,
		request.Options,
	)
	if err != nil {
		return nil, err
	}

	return datasource.NewAzureMetricsResponse(resp).ToMetricsQueryOutput(), nil
}

func (in *AzureProvider) MetricsSearch(ctx context.Context, input *toolquery.MetricsSearchInput) (*toolquery.MetricsSearchOutput, error) {
	if input == nil || len(input.GetQuery()) == 0 {
		return nil, fmt.Errorf("%w: query is required", ErrInvalidArgument)
	}
	resourceID := strings.TrimSpace(input.GetOptions().GetAzure().GetResourceId())
	if resourceID == "" {
		return nil, fmt.Errorf("%w: azure metrics search options require resource_id", ErrInvalidArgument)
	}

	definitions, err := in.client.MetricsSearch(ctx, resourceID, nil)
	if err != nil {
		return nil, err
	}

	const defaultLimit = 100
	limit := defaultLimit
	if input.GetLimit() > 0 {
		limit = min(int(input.GetLimit()), 500)
	}

	return datasource.AzureMetricsSearchResponse(definitions).ToMetricsSearchOutput(input.GetQuery(), limit), nil
}

func (in *AzureProvider) Logs(ctx context.Context, input *toolquery.LogsQueryInput) (*toolquery.LogsQueryOutput, error) {
	if input == nil || strings.TrimSpace(input.GetQuery()) == "" {
		return nil, fmt.Errorf("%w: query is required", ErrInvalidArgument)
	}
	resourceID := strings.TrimSpace(input.GetOptions().GetAzure().GetResourceId())
	if resourceID == "" {
		return nil, fmt.Errorf("%w: azure logs options require resource_id", ErrInvalidArgument)
	}

	body := azlogs.QueryBody{
		Query:    new(input.GetQuery()),
		Timespan: logsTimeRange(input.GetRange()),
	}
	resp, err := in.client.Logs(ctx, resourceID, body, nil)
	if err != nil {
		return nil, err
	}

	return datasource.AzureLogsQueryOutput{QueryResourceResponse: resp}.ToLogsQueryOutput(input.GetLimit()), nil
}

func (in *AzureProvider) validate() (*AzureProvider, error) {
	if in.conn == nil {
		return in, fmt.Errorf("%w: azure connection is required", ErrInvalidArgument)
	}
	if in.conn.GetSubscriptionId() == "" {
		return in, fmt.Errorf("%w: subscription_id is required", ErrInvalidArgument)
	}
	if in.conn.GetTenantId() == "" {
		return in, fmt.Errorf("%w: tenant_id is required", ErrInvalidArgument)
	}
	if in.conn.GetClientId() == "" {
		return in, fmt.Errorf("%w: client_id is required", ErrInvalidArgument)
	}
	if in.conn.GetClientSecret() == "" {
		return in, fmt.Errorf("%w: client_secret is required", ErrInvalidArgument)
	}
	if in.client == nil {
		return in, fmt.Errorf("%w: azure connection is required", ErrInvalidArgument)
	}

	return in, nil
}

func logsTimeRange(timeRange *toolquery.TimeRange) *azlogs.TimeInterval {
	if timeRange == nil || timeRange.GetStart() == nil || timeRange.GetEnd() == nil {
		return nil
	}
	start := timeRange.GetStart().AsTime().UTC()
	end := timeRange.GetEnd().AsTime().UTC()
	if !start.Before(end) {
		return nil
	}
	return new(azlogs.NewTimeInterval(start, end))
}
