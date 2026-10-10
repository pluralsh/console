package tools

import (
	"testing"
	"time"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
	"google.golang.org/protobuf/types/known/timestamppb"
)

func TestMetricsLabelSearchRangeUsesRequestedRange(t *testing.T) {
	wantStart := time.Date(2026, 10, 9, 12, 0, 0, 0, time.UTC)
	wantEnd := wantStart.Add(15 * time.Minute)
	start, end := metricsLabelSearchRange(&toolquery.MetricsLabelSearchInput{
		Range: &toolquery.TimeRange{
			Start: timestamppb.New(wantStart),
			End:   timestamppb.New(wantEnd),
		},
	})

	if !start.Equal(wantStart) || !end.Equal(wantEnd) {
		t.Fatalf("range = (%s, %s), want (%s, %s)", start, end, wantStart, wantEnd)
	}
}

func TestNewMetricsLabelSearchOutputFiltersDedupesSortsAndLimits(t *testing.T) {
	output := newMetricsLabelSearchOutput([]string{
		"pod",
		"namespace",
		"node",
		"pod",
		"",
		"service",
	}, "o", 2)

	if got := len(output.GetResults()); got != 2 {
		t.Fatalf("expected 2 results, got %d", got)
	}
	if output.GetResults()[0].GetName() != "node" {
		t.Fatalf("unexpected first result: %s", output.GetResults()[0].GetName())
	}
	if output.GetResults()[1].GetName() != "pod" {
		t.Fatalf("unexpected second result: %s", output.GetResults()[1].GetName())
	}
}

func TestCloudwatchMetricIdentifier(t *testing.T) {
	namespace, name, err := cloudwatchMetricIdentifier("AWS/EC2/CPUUtilization")
	if err != nil {
		t.Fatalf("failed to parse cloudwatch metric identifier: %v", err)
	}
	if namespace != "AWS/EC2" {
		t.Fatalf("unexpected namespace: %s", namespace)
	}
	if name != "CPUUtilization" {
		t.Fatalf("unexpected metric name: %s", name)
	}

	namespace, name, err = cloudwatchMetricIdentifier("CPUUtilization")
	if err != nil {
		t.Fatalf("failed to parse metric name without namespace: %v", err)
	}
	if namespace != "" || name != "CPUUtilization" {
		t.Fatalf("unexpected metric identifier: namespace=%q name=%q", namespace, name)
	}
}

func TestCloudwatchMetricIdentifierRejectsInvalidInput(t *testing.T) {
	if _, _, err := cloudwatchMetricIdentifier("AWS/EC2/"); err == nil {
		t.Fatal("expected error for missing metric name")
	}
	if _, _, err := cloudwatchMetricIdentifier("/CPUUtilization"); err == nil {
		t.Fatal("expected error for missing namespace")
	}
}

func TestDatadogMetricLabelsFromTags(t *testing.T) {
	provider := &DatadogProvider{}
	tags := []string{
		"env:prod",
		"env:staging",
		"host:node-1",
		"custom",
	}

	names := newMetricsLabelSearchOutput(provider.datadogMetricLabelNames(tags), "", 10)
	if got := len(names.GetResults()); got != 3 {
		t.Fatalf("expected 3 label names, got %d", got)
	}
	if names.GetResults()[0].GetName() != "custom" {
		t.Fatalf("unexpected first label name: %s", names.GetResults()[0].GetName())
	}
	if names.GetResults()[1].GetName() != "env" {
		t.Fatalf("unexpected second label name: %s", names.GetResults()[1].GetName())
	}
	if names.GetResults()[2].GetName() != "host" {
		t.Fatalf("unexpected third label name: %s", names.GetResults()[2].GetName())
	}

	values := newMetricsLabelSearchOutput(provider.datadogMetricLabelValues(tags, "env"), "", 10)
	if got := len(values.GetResults()); got != 2 {
		t.Fatalf("expected 2 label values, got %d", got)
	}
	if values.GetResults()[0].GetName() != "prod" {
		t.Fatalf("unexpected first label value: %s", values.GetResults()[0].GetName())
	}
	if values.GetResults()[1].GetName() != "staging" {
		t.Fatalf("unexpected second label value: %s", values.GetResults()[1].GetName())
	}
}
