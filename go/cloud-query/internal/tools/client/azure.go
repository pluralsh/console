package client

import (
	"context"
	"fmt"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/policy"
	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	"github.com/Azure/azure-sdk-for-go/sdk/monitor/query/azlogs"
	"github.com/Azure/azure-sdk-for-go/sdk/monitor/query/azmetrics"
	"github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/monitor/armmonitor"
)

const (
	azureMetricsEndpoint = "https://global.metrics.monitor.azure.com"
	azurePrometheusScope = "https://prometheus.monitor.azure.com/.default"
)

type AzureClient struct {
	subscriptionID string
	credential     azcore.TokenCredential
	promToken      *azcore.AccessToken
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

// PrometheusAccessToken returns an Azure AD bearer token for the Azure Monitor
// managed Prometheus query API.
func (in *AzureClient) PrometheusAccessToken(ctx context.Context) (string, error) {
	if in.promToken != nil && in.promToken.ExpiresOn.After(time.Now()) {
		return in.promToken.Token, nil
	}

	tk, err := in.credential.GetToken(ctx, policy.TokenRequestOptions{
		Scopes: []string{azurePrometheusScope},
	})

	if err != nil {
		return "", fmt.Errorf("azure token for managed prometheus: %w", err)
	}

	in.promToken = &tk
	return tk.Token, nil
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
