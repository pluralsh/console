package tools

import (
	"testing"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
)

func TestCloudwatchLogAggregateRequestAndBuckets(t *testing.T) {
	start := time.Date(2026, time.September, 8, 12, 0, 0, 0, time.UTC)
	end := start.Add(time.Hour)
	input := &toolquery.LogAggregateInput{
		Query:      "fields @timestamp, @message",
		Range:      aggregateTestTimeRange(start, end),
		BucketSize: "5m",
		Facets: []*toolquery.LogsQueryFacet{
			{Name: "service", Value: "api"},
			{Name: "@logStream", Value: `worker"one`},
		},
	}

	request := cloudwatchLogAggregateStartQueryInput(input)
	const expectedQuery = "fields @timestamp, @message | filter `service` = \"api\" and @logStream = \"worker\\\"one\" | stats count(*) as count by bin(5m) as timestamp"
	if got := aws.ToString(request.QueryString); got != expectedQuery {
		t.Fatalf("query = %q, want %q", got, expectedQuery)
	}
	if got := aws.ToInt64(request.StartTime); got != start.Unix() {
		t.Fatalf("start time = %d, want %d", got, start.Unix())
	}
	if got := aws.ToInt64(request.EndTime); got != end.Unix() {
		t.Fatalf("end time = %d, want %d", got, end.Unix())
	}

	buckets := cloudwatchAggregateBuckets([]map[string]string{
		{"timestamp": "2026-09-08 12:05:00.000", "count": "8"},
		{"timestamp": "2026-09-08 12:00:00.000", "count": "2"},
		{"timestamp": "2026-09-08 12:10:00.000", "count": "not-a-count"},
	})
	assertProviderAggregateBuckets(t, &toolquery.LogAggregateOutput{Buckets: buckets}, []aggregateTestBucket{
		{timestamp: start, count: 2},
		{timestamp: start.Add(5 * time.Minute), count: 8},
	})
}
