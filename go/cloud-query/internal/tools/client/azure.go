package client

import (
	"context"
	"fmt"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	"github.com/Azure/azure-sdk-for-go/sdk/monitor/query/azlogs"
	"github.com/Azure/azure-sdk-for-go/sdk/monitor/query/azmetrics"
	"github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/monitor/armmonitor"
)

const azureMetricsEndpoint = "https://global.metrics.monitor.azure.com"

type AzureClient struct {
	subscriptionID string
	credential     azcore.TokenCredential
}

func NewAzureClient(subscriptionID, tenantID, clientID, clientSecret string) (*AzureClient, error) {
	cred, err := azidentity.NewClientSecretCredential(tenantID, clientID, clientSecret, nil)
	if err != nil {
		return nil, err
	}

	return &AzureClient{
		subscriptionID: subscriptionID,
		credential:     cred,
	}, nil
}

func (in *AzureClient) Logs(ctx context.Context, resourceID string, body azlogs.QueryBody, options *azlogs.QueryResourceOptions) (azlogs.QueryResourceResponse, error) {
	logsClient, err := azlogs.NewClient(in.credential, nil)
	if err != nil {
		return azlogs.QueryResourceResponse{}, err
	}

	resp, err := logsClient.QueryResource(ctx, resourceID, body, options)
	if err != nil {
		return azlogs.QueryResourceResponse{}, fmt.Errorf("azure logs request failed: %w", err)
	}

	return resp, nil
}

func (in *AzureClient) Metrics(ctx context.Context, metricsEndpoint string, metricNamespace string, metricNames []string, resourceIDs azmetrics.ResourceIDList, options *azmetrics.QueryResourcesOptions) (azmetrics.QueryResourcesResponse, error) {
	if metricsEndpoint == "" {
		metricsEndpoint = azureMetricsEndpoint
	}

	metricsClient, err := azmetrics.NewClient(metricsEndpoint, in.credential, nil)
	if err != nil {
		return azmetrics.QueryResourcesResponse{}, fmt.Errorf("azure monitor client creation failed: %w", err)
	}

	resp, err := metricsClient.QueryResources(ctx, in.subscriptionID, metricNamespace, metricNames, resourceIDs, options)
	if err != nil {
		return azmetrics.QueryResourcesResponse{}, fmt.Errorf("azure monitor request failed: %w", err)
	}

	return resp, nil
}

func (in *AzureClient) MetricsSearch(ctx context.Context, resourceURI string, options *armmonitor.MetricDefinitionsClientListOptions) ([]*armmonitor.MetricDefinition, error) {
	metricDefinitionsClient, err := armmonitor.NewMetricDefinitionsClient(in.subscriptionID, in.credential, nil)
	if err != nil {
		return nil, err
	}

	pager := metricDefinitionsClient.NewListPager(resourceURI, options)
	definitions := make([]*armmonitor.MetricDefinition, 0)

	for pager.More() {
		page, err := pager.NextPage(ctx)
		if err != nil {
			return nil, fmt.Errorf("azure monitor request failed: %w", err)
		}
		definitions = append(definitions, page.Value...)
	}

	return definitions, nil
}
