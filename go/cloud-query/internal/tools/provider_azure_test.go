package tools

import (
	"testing"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/monitor/query/azlogs"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
)

func TestAzureLogAggregateQueryAndBuckets(t *testing.T) {
	start := time.Date(2026, time.September, 8, 12, 0, 0, 0, time.UTC)
	end := start.Add(time.Hour)
	input := &toolquery.LogAggregateInput{
		Query:      "ContainerLogV2 | where LogLevel == 'ERROR'",
		Range:      aggregateTestTimeRange(start, end),
		BucketSize: "5m",
		Operator:   toolquery.LogQueryOperator_LOG_QUERY_OPERATOR_OR,
		Facets: []*toolquery.LogsQueryFacet{
			{Name: "PodName", Value: "api"},
			{Name: "Namespace", Value: "prod"},
		},
		Options: &toolquery.LogsOptions{
			Azure: &toolquery.AzureLogsOptions{ResourceId: " /subscriptions/test/resourceGroups/rg "},
		},
	}

	body := azureLogAggregateQueryBody(input)
	const expectedQuery = `ContainerLogV2 | where LogLevel == 'ERROR' | where tostring(column_ifexists("PodName", "")) == "api" or tostring(column_ifexists("Namespace", "")) == "prod" | summarize count = count() by timestamp = bin(TimeGenerated, 5m) | order by timestamp asc`
	if got := *body.Query; got != expectedQuery {
		t.Fatalf("query = %q, want %q", got, expectedQuery)
	}
	gotStart, gotEnd, err := body.Timespan.Values()
	if err != nil {
		t.Fatalf("Timespan.Values() error = %v", err)
	}
	if !gotStart.Equal(start) || !gotEnd.Equal(end) {
		t.Fatalf("timespan = %s/%s, want %s/%s", gotStart, gotEnd, start, end)
	}
	if got := azureLogsResourceID(input.GetOptions()); got != "/subscriptions/test/resourceGroups/rg" {
		t.Fatalf("resource ID = %q", got)
	}

	timestampColumn := "timestamp"
	countColumn := "count"
	tableName := "PrimaryResult"
	response := azlogs.QueryResourceResponse{QueryResults: azlogs.QueryResults{
		Tables: []azlogs.Table{{
			Name: &tableName,
			Columns: []azlogs.Column{
				{Name: &countColumn},
				{Name: &timestampColumn},
			},
			Rows: []azlogs.Row{
				{float64(11), start.Add(5 * time.Minute)},
				{float64(6), start.Format(time.RFC3339Nano)},
			},
		}},
	}}
	buckets := azureAggregateBuckets(response)
	assertProviderAggregateBuckets(t, &toolquery.LogAggregateOutput{Buckets: buckets}, []aggregateTestBucket{
		{timestamp: start, count: 6},
		{timestamp: start.Add(5 * time.Minute), count: 11},
	})
}
