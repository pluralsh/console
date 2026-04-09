package tools

import (
	"strings"
	"testing"

	"github.com/aws/aws-sdk-go-v2/aws"
	cloudwatchtypes "github.com/aws/aws-sdk-go-v2/service/cloudwatch/types"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
)

func TestCloudwatchLogsQueryWithFacets(t *testing.T) {
	got := cloudwatchLogsQueryWithFacets(
		"fields @timestamp, @message",
		[]*toolquery.LogsQueryFacet{
			{Name: "@logStream", Value: "stream-a"},
			{Name: "service", Value: "api"},
		},
	)

	if !strings.Contains(got, `@logStream = "stream-a"`) {
		t.Fatalf("expected @logStream facet in query, got: %s", got)
	}
	if !strings.Contains(got, "`service` = \"api\"") {
		t.Fatalf("expected service facet in query, got: %s", got)
	}
}

func TestContainsCloudwatchSource(t *testing.T) {
	if !containsCloudwatchSource("source '/aws/lambda/test' | fields @message") {
		t.Fatalf("expected SOURCE detection to be case-insensitive")
	}
	if containsCloudwatchSource("fields @timestamp, @message") {
		t.Fatalf("did not expect SOURCE detection for query without SOURCE clause")
	}
}

func TestCloudwatchLogGroupNamesDeduplicates(t *testing.T) {
	provider := NewCloudwatchProvider(&toolquery.CloudwatchConnection{
		LogGroupNames: []string{
			"/aws/eks/prod/app",
			" /aws/eks/prod/app ",
			"",
			"/aws/eks/prod/api",
		},
	})

	groups := provider.logGroupNames()
	if len(groups) != 2 {
		t.Fatalf("expected 2 unique groups, got %d (%v)", len(groups), groups)
	}
}

func TestCloudwatchMetricMatchesQuery(t *testing.T) {
	metric := cloudwatchtypes.Metric{
		Namespace:  aws.String("AWS/EC2"),
		MetricName: aws.String("CPUUtilization"),
		Dimensions: []cloudwatchtypes.Dimension{{Name: aws.String("InstanceId")}},
	}

	if !cloudwatchMetricMatchesQuery(metric, "cpu") {
		t.Fatalf("expected metric name match")
	}
	if !cloudwatchMetricMatchesQuery(metric, "aws/ec2") {
		t.Fatalf("expected namespace match")
	}
	if !cloudwatchMetricMatchesQuery(metric, "instanceid") {
		t.Fatalf("expected dimension name match")
	}
	if cloudwatchMetricMatchesQuery(metric, "networkin") {
		t.Fatalf("did not expect unrelated query match")
	}
}

func TestCloudwatchMetricResultName(t *testing.T) {
	metric := cloudwatchtypes.Metric{
		Namespace:  aws.String("AWS/Lambda"),
		MetricName: aws.String("Errors"),
	}
	if got := cloudwatchMetricResultName(metric); got != "AWS/Lambda/Errors" {
		t.Fatalf("unexpected result name: %s", got)
	}
}
