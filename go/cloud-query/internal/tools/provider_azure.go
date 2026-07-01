package tools

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/monitor/query/azlogs"
	"github.com/Azure/azure-sdk-for-go/sdk/monitor/query/azmetrics"
	"github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/monitor/armmonitor"
	"github.com/samber/lo"

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

	if input.GetOptions() == nil || input.GetOptions().GetAzure() == nil {
		return nil, fmt.Errorf("%w: azure metrics options are required", ErrInvalidArgument)
	}

	opts := input.GetOptions().GetAzure()
	if u := opts.GetPrometheusUrl(); u != "" {
		return in.metricsManagedPrometheus(ctx, input, u)
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

func (in *AzureProvider) metricsManagedPrometheus(ctx context.Context, input *toolquery.MetricsQueryInput, url string) (*toolquery.MetricsQueryOutput, error) {
	token, err := in.client.PrometheusAccessToken(ctx)
	if err != nil {
		return nil, err
	}

	prom := NewPrometheusProvider(&toolquery.PrometheusConnection{
		Url:   strings.TrimRight(strings.TrimSpace(url), "/"),
		Token: new(token),
	})

	return prom.Metrics(ctx, input)
}

func (in *AzureProvider) MetricsSearch(ctx context.Context, input *toolquery.MetricsSearchInput) (*toolquery.MetricsSearchOutput, error) {
	if input == nil || len(input.GetQuery()) == 0 {
		return nil, fmt.Errorf("%w: query is required", ErrInvalidArgument)
	}

	if input.GetOptions() == nil || input.GetOptions().GetAzure() == nil {
		return nil, fmt.Errorf("%w: azure metrics search options are required", ErrInvalidArgument)
	}

	opts := input.GetOptions().GetAzure()
	if u := opts.GetPrometheusUrl(); u != "" {
		return in.metricsSearchManagedPrometheus(ctx, input, u)
	}

	resourceID := strings.TrimSpace(opts.GetResourceId())
	if resourceID == "" {
		return nil, fmt.Errorf("%w: azure metrics search requires resource_id unless prometheus_query_url is set", ErrInvalidArgument)
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

func (in *AzureProvider) metricsSearchManagedPrometheus(ctx context.Context, input *toolquery.MetricsSearchInput, url string) (*toolquery.MetricsSearchOutput, error) {
	token, err := in.client.PrometheusAccessToken(ctx)
	if err != nil {
		return nil, err
	}

	prom := NewPrometheusProvider(&toolquery.PrometheusConnection{
		Url:   strings.TrimRight(strings.TrimSpace(url), "/"),
		Token: new(token),
	})

	return prom.MetricsSearch(ctx, input)
}

func (in *AzureProvider) MetricsLabelSearch(ctx context.Context, input *toolquery.MetricsLabelSearchInput) (*toolquery.MetricsLabelSearchOutput, error) {
	if input == nil || strings.TrimSpace(input.GetMetric()) == "" {
		return nil, fmt.Errorf("%w: metric is required", ErrInvalidArgument)
	}
	if input.GetOptions() == nil || input.GetOptions().GetAzure() == nil {
		return nil, fmt.Errorf("%w: azure metrics label search options are required", ErrInvalidArgument)
	}

	opts := input.GetOptions().GetAzure()
	if u := opts.GetPrometheusUrl(); u != "" {
		return in.metricsLabelSearchManagedPrometheus(ctx, input, u)
	}

	resourceID := strings.TrimSpace(opts.GetResourceId())
	if resourceID == "" {
		return nil, fmt.Errorf("%w: azure metrics label search requires resource_id unless prometheus_url is set", ErrInvalidArgument)
	}

	if strings.TrimSpace(input.GetLabel()) != "" {
		return in.metricsLabelSearchValues(ctx, input, opts, resourceID)
	}

	listOptions := &armmonitor.MetricDefinitionsClientListOptions{}
	if namespace := strings.TrimSpace(opts.GetMetricsNamespace()); namespace != "" {
		listOptions.Metricnamespace = &namespace
	}

	definitions, err := in.client.MetricsSearch(ctx, resourceID, listOptions)
	if err != nil {
		return nil, err
	}

	values := make([]string, 0)
	metricName := strings.TrimSpace(input.GetMetric())
	for _, definition := range definitions {
		if definition == nil || lo.FromPtr(definition.Name.Value) != metricName {
			continue
		}
		for _, dimension := range definition.Dimensions {
			values = append(values, lo.FromPtr(dimension.Value))
		}
	}

	return newMetricsLabelSearchOutput(values, input.GetQuery(), metricsLabelSearchLimit(input.GetLimit())), nil
}

func (in *AzureProvider) metricsLabelSearchManagedPrometheus(ctx context.Context, input *toolquery.MetricsLabelSearchInput, url string) (*toolquery.MetricsLabelSearchOutput, error) {
	token, err := in.client.PrometheusAccessToken(ctx)
	if err != nil {
		return nil, err
	}

	prom := NewPrometheusProvider(&toolquery.PrometheusConnection{
		Url:   strings.TrimRight(strings.TrimSpace(url), "/"),
		Token: new(token),
	})

	return prom.MetricsLabelSearch(ctx, input)
}

func (in *AzureProvider) metricsLabelSearchValues(ctx context.Context, input *toolquery.MetricsLabelSearchInput, opts *toolquery.AzureMetricsLabelSearchOptions, resourceID string) (*toolquery.MetricsLabelSearchOutput, error) {
	namespace := strings.TrimSpace(opts.GetMetricsNamespace())
	if namespace == "" {
		return nil, fmt.Errorf("%w: azure metrics label value search requires metrics_namespace", ErrInvalidArgument)
	}

	end := time.Now().UTC()
	start := end.Add(-24 * time.Hour)
	resp, err := in.client.Metrics(
		ctx,
		strings.TrimSpace(opts.GetMetricsEndpoint()),
		namespace,
		[]string{strings.TrimSpace(input.GetMetric())},
		azmetrics.ResourceIDList{ResourceIDs: []string{resourceID}},
		&azmetrics.QueryResourcesOptions{
			StartTime: new(start.Format(time.RFC3339Nano)),
			EndTime:   new(end.Format(time.RFC3339Nano)),
			Interval:  new("PT1M"),
		},
	)
	if err != nil {
		return nil, err
	}

	label := strings.TrimSpace(input.GetLabel())
	values := make([]string, 0)
	for _, point := range datasource.NewAzureMetricsResponse(resp).ToMetricsQueryOutput().GetMetrics() {
		values = append(values, point.GetLabels()[label])
	}

	return newMetricsLabelSearchOutput(values, input.GetQuery(), metricsLabelSearchLimit(input.GetLimit())), nil
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
