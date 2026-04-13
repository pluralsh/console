package tools

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
	"github.com/Azure/azure-sdk-for-go/sdk/monitor/query/azlogs"
	"github.com/Azure/azure-sdk-for-go/sdk/monitor/query/azmetrics"
	"github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/monitor/armmonitor"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/timestamppb"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
)

type fakeAzureMonitorClient struct {
	metricsResponse           azmetrics.QueryResourcesResponse
	metricsErr                error
	metricDefinitionsResponse []*armmonitor.MetricDefinition
	logsResponse              azlogs.QueryResourceResponse
	logsErr                   error
	metricsNamespace          string
	metricsNames              []string
	metricsResourceIDs        azmetrics.ResourceIDList
	metricsOptions            *azmetrics.QueryResourcesOptions
	logsResourceID            string
	logsBody                  azlogs.QueryBody
	logsOptions               *azlogs.QueryResourceOptions
	defsResourceURI           string
	defsOptions               *armmonitor.MetricDefinitionsClientListOptions
}

func (f *fakeAzureMonitorClient) Metrics(_ context.Context, metricNamespace string, metricNames []string, resourceIDs azmetrics.ResourceIDList, options *azmetrics.QueryResourcesOptions) (azmetrics.QueryResourcesResponse, error) {
	f.metricsNamespace = metricNamespace
	f.metricsNames = metricNames
	f.metricsResourceIDs = resourceIDs
	f.metricsOptions = options
	return f.metricsResponse, f.metricsErr
}

func (f *fakeAzureMonitorClient) MetricDefinitions(_ context.Context, resourceURI string, options *armmonitor.MetricDefinitionsClientListOptions) ([]*armmonitor.MetricDefinition, error) {
	f.defsResourceURI = resourceURI
	f.defsOptions = options
	return f.metricDefinitionsResponse, nil
}

func (f *fakeAzureMonitorClient) Logs(_ context.Context, resourceID string, body azlogs.QueryBody, options *azlogs.QueryResourceOptions) (azlogs.QueryResourceResponse, error) {
	f.logsResourceID = resourceID
	f.logsBody = body
	f.logsOptions = options
	return f.logsResponse, f.logsErr
}

func TestAzureProvider_Metrics(t *testing.T) {
	const resourceURI = "/subscriptions/sub-123/resourceGroups/rg-test/providers/Microsoft.Compute/virtualMachines/vm-1"

	fakeClient := &fakeAzureMonitorClient{
		metricsResponse: azmetrics.QueryResourcesResponse{
			MetricResults: azmetrics.MetricResults{
				Values: []azmetrics.MetricData{{
					ResourceID: to.Ptr(resourceURI),
					Namespace:  to.Ptr("Microsoft.Compute/virtualMachines"),
					Values: []azmetrics.Metric{{
						Name: &azmetrics.LocalizableString{Value: to.Ptr("Percentage CPU"), LocalizedValue: to.Ptr("Percentage CPU")},
						TimeSeries: []azmetrics.TimeSeriesElement{{
							MetadataValues: []azmetrics.MetadataValue{{
								Name:  &azmetrics.LocalizableString{Value: to.Ptr("VMName")},
								Value: to.Ptr("vm-1"),
							}},
							Data: []azmetrics.MetricValue{{
								TimeStamp: to.Ptr(mustTime(t, "2026-04-10T10:00:00Z")),
								Average:   to.Ptr(42.5),
								Maximum:   to.Ptr(65.0),
							}},
						}},
					}},
				}},
			},
		},
	}

	provider := NewAzureProvider(&toolquery.AzureConnection{
		SubscriptionId: "sub-123",
		TenantId:       "tenant-123",
		ClientId:       "client-123",
		ClientSecret:   "secret-123",
		ResourceId:     resourceURI,
	})
	provider.client = fakeClient
	provider.clientErr = nil

	resp, err := provider.Metrics(context.Background(), &toolquery.MetricsQueryInput{
		Query: "Percentage CPU",
		Range: &toolquery.TimeRange{
			Start: mustTimestampPB(t, "2026-04-10T09:00:00Z"),
			End:   mustTimestampPB(t, "2026-04-10T11:00:00Z"),
		},
		Step: proto.String("5m"),
		Options: &toolquery.Options{
			Azure: &toolquery.AzureOptions{
				MetricsNamespace: "Microsoft.Compute/virtualMachines",
				Aggregation:      proto.String("Average,Maximum"),
				Filter:           proto.String("VMName eq '*'"),
				OrderBy:          proto.String("average desc"),
				RollUpBy:         proto.String("VMName"),
			},
		},
	})
	if err != nil {
		t.Fatalf("metrics returned error: %v", err)
	}

	if got := len(resp.GetMetrics()); got != 2 {
		t.Fatalf("expected 2 metric points, got %d", got)
	}

	first := resp.GetMetrics()[0]
	if first.GetName() != "Percentage CPU" {
		t.Fatalf("unexpected metric name %q", first.GetName())
	}
	if first.GetLabels()["aggregation"] != "average" {
		t.Fatalf("expected average aggregation label, got %v", first.GetLabels())
	}
	if first.GetLabels()["VMName"] != "vm-1" {
		t.Fatalf("expected VMName label, got %v", first.GetLabels())
	}
	if first.GetLabels()["resource_uri"] != resourceURI {
		t.Fatalf("expected resource_uri label, got %v", first.GetLabels())
	}
	if first.GetValue() != 42.5 {
		t.Fatalf("unexpected first value %v", first.GetValue())
	}

	second := resp.GetMetrics()[1]
	if second.GetLabels()["aggregation"] != "maximum" {
		t.Fatalf("expected maximum aggregation label, got %v", second.GetLabels())
	}
	if second.GetValue() != 65.0 {
		t.Fatalf("unexpected second value %v", second.GetValue())
	}

	if got := fakeClient.metricsNamespace; got != "Microsoft.Compute/virtualMachines" {
		t.Fatalf("unexpected metric namespace %q", got)
	}
	if got := len(fakeClient.metricsNames); got != 1 || fakeClient.metricsNames[0] != "Percentage CPU" {
		t.Fatalf("unexpected metric names %v", fakeClient.metricsNames)
	}
	if got := len(fakeClient.metricsResourceIDs.ResourceIDs); got != 1 || fakeClient.metricsResourceIDs.ResourceIDs[0] != resourceURI {
		t.Fatalf("unexpected resource IDs %v", fakeClient.metricsResourceIDs.ResourceIDs)
	}
	if got := protoString(fakeClient.metricsOptions.Interval); got != "PT5M" {
		t.Fatalf("unexpected interval %q", got)
	}
	if got := protoString(fakeClient.metricsOptions.StartTime); got != "2026-04-10T09:00:00Z" {
		t.Fatalf("unexpected start time %q", got)
	}
	if got := protoString(fakeClient.metricsOptions.EndTime); got != "2026-04-10T11:00:00Z" {
		t.Fatalf("unexpected end time %q", got)
	}
	if got := protoString(fakeClient.metricsOptions.RollUpBy); got != "VMName" {
		t.Fatalf("unexpected roll up by %q", got)
	}
}

func TestAzureProvider_MetricsSearch(t *testing.T) {
	const resourceURI = "/subscriptions/sub-123/resourceGroups/rg-test/providers/Microsoft.ContainerService/managedClusters/aks-1"

	fakeClient := &fakeAzureMonitorClient{
		metricDefinitionsResponse: []*armmonitor.MetricDefinition{
			{Name: &armmonitor.LocalizableString{Value: to.Ptr("node_cpu_usage_percentage")}},
			{Name: &armmonitor.LocalizableString{Value: to.Ptr("node_memory_working_set")}},
			{Name: &armmonitor.LocalizableString{Value: to.Ptr("node_cpu_usage_percentage")}},
			{Name: &armmonitor.LocalizableString{Value: to.Ptr("pod_count")}},
		},
	}

	provider := NewAzureProvider(&toolquery.AzureConnection{
		SubscriptionId: "sub-123",
		TenantId:       "tenant-123",
		ClientId:       "client-123",
		ClientSecret:   "secret-123",
		ResourceId:     resourceURI,
	})
	provider.client = fakeClient
	provider.clientErr = nil

	query := `{
		"resource_uri": "` + resourceURI + `",
		"query": "node"
	}`

	resp, err := provider.MetricsSearch(context.Background(), &toolquery.MetricsSearchInput{
		Query: query,
		Limit: proto.Int64(2),
	})
	if err != nil {
		t.Fatalf("metrics search returned error: %v", err)
	}

	if got := len(resp.GetMetrics()); got != 2 {
		t.Fatalf("expected 2 search results, got %d", got)
	}
	if resp.GetMetrics()[0].GetName() != "node_cpu_usage_percentage" {
		t.Fatalf("unexpected first result %q", resp.GetMetrics()[0].GetName())
	}
	if resp.GetMetrics()[1].GetName() != "node_memory_working_set" {
		t.Fatalf("unexpected second result %q", resp.GetMetrics()[1].GetName())
	}
	if got := fakeClient.defsResourceURI; got != resourceURI {
		t.Fatalf("unexpected resource uri %q", got)
	}
}

func TestAzureProvider_Logs(t *testing.T) {
	const resourceURI = "/subscriptions/sub-123/resourceGroups/rg-test/providers/Microsoft.OperationalInsights/workspaces/la-1"

	fakeClient := &fakeAzureMonitorClient{
		logsResponse: azlogs.QueryResourceResponse{
			QueryResults: azlogs.QueryResults{
				Tables: []azlogs.Table{
					{
						Name: to.Ptr("PrimaryResult"),
						Columns: []azlogs.Column{
							{Name: to.Ptr("TimeGenerated"), Type: to.Ptr(azlogs.ColumnTypeDatetime)},
							{Name: to.Ptr("Message"), Type: to.Ptr(azlogs.ColumnTypeString)},
							{Name: to.Ptr("Computer"), Type: to.Ptr(azlogs.ColumnTypeString)},
						},
						Rows: []azlogs.Row{
							{"2026-04-10T10:01:00Z", "Error: disk pressure", "node-1"},
						},
					},
				},
			},
		},
	}

	provider := NewAzureProvider(&toolquery.AzureConnection{
		SubscriptionId: "sub-123",
		TenantId:       "tenant-123",
		ClientId:       "client-123",
		ClientSecret:   "secret-123",
		ResourceId:     resourceURI,
	})
	provider.client = fakeClient
	provider.clientErr = nil

	query := "ContainerLog | where LogLevel == 'Error' | take 10"
	resp, err := provider.Logs(context.Background(), &toolquery.LogsQueryInput{
		Query: query,
		Range: &toolquery.TimeRange{
			Start: mustTimestampPB(t, "2026-04-10T09:00:00Z"),
			End:   mustTimestampPB(t, "2026-04-10T11:00:00Z"),
		},
		Limit: proto.Int32(30),
	})
	if err != nil {
		t.Fatalf("logs returned error: %v", err)
	}

	if got := fakeClient.logsResourceID; got != resourceURI {
		t.Fatalf("unexpected logs resource id %q", got)
	}
	if got := protoString(fakeClient.logsBody.Query); got != query {
		t.Fatalf("unexpected logs query %q", got)
	}
	if got := fakeClient.logsOptions.Options.Wait; got == nil || *got != 30 {
		t.Fatalf("unexpected logs wait option %#v", fakeClient.logsOptions)
	}
	if got := len(resp.GetLogs()); got != 1 {
		t.Fatalf("expected 1 log row, got %d", got)
	}
	if got := resp.GetLogs()[0].GetMessage(); got != "Error: disk pressure" {
		t.Fatalf("unexpected log message %q", got)
	}
	if got := resp.GetLogs()[0].GetLabels()["Computer"]; got != "node-1" {
		t.Fatalf("unexpected labels %#v", resp.GetLogs()[0].GetLabels())
	}
}

func TestAzureProvider_LogsPropagatesClientErrors(t *testing.T) {
	fakeClient := &fakeAzureMonitorClient{logsErr: errors.New("query failed")}
	provider := NewAzureProvider(&toolquery.AzureConnection{
		SubscriptionId: "sub-123",
		TenantId:       "tenant-123",
		ClientId:       "client-123",
		ClientSecret:   "secret-123",
		ResourceId:     "/subscriptions/sub-123/resourceGroups/rg-test/providers/Microsoft.OperationalInsights/workspaces/la-1",
	})
	provider.client = fakeClient
	provider.clientErr = nil

	_, err := provider.Logs(context.Background(), &toolquery.LogsQueryInput{Query: "ContainerLog | take 1"})
	if err == nil || !strings.Contains(err.Error(), "query failed") {
		t.Fatalf("expected propagated logs error, got %v", err)
	}
}

func mustTimestampPB(t *testing.T, value string) *timestamppb.Timestamp {
	t.Helper()

	return timestamppb.New(mustTime(t, value))
}

func mustTime(t *testing.T, value string) time.Time {
	t.Helper()

	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		t.Fatalf("failed to parse timestamp %q: %v", value, err)
	}

	return parsed
}

func protoString(value *string) string {
	if value == nil {
		return ""
	}

	return *value
}
