package datasource

import (
	"testing"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/monitor/query/azmetrics"
	"github.com/samber/lo"
)

func TestAzureIntervalIsRaisedToASupportedGrain(t *testing.T) {
	cases := []struct {
		interval string
		minStep  time.Duration
		want     string
	}{
		{"PT1M", 30 * time.Second, "PT1M"},
		{"PT1M", 605 * time.Second, "PT15M"},
		{"PT1H", 605 * time.Second, "PT1H"},
		{"PT1M", 48 * time.Hour, "P1D"},
		{"PT2M", time.Hour, "PT2M"},
	}

	for _, c := range cases {
		if got := azureInterval(c.interval, c.minStep); got != c.want {
			t.Fatalf("azureInterval(%s, %s) = %s, want %s", c.interval, c.minStep, got, c.want)
		}
	}
}

func TestAzureMetricsSeriesGroupsByAggregation(t *testing.T) {
	start := time.Date(2026, 10, 19, 12, 0, 0, 0, time.UTC)
	response := NewAzureMetricsResponse(azmetrics.QueryResourcesResponse{
		MetricResults: azmetrics.MetricResults{
			Values: []azmetrics.MetricData{{
				ResourceID: lo.ToPtr("/subscriptions/s/vm"),
				Namespace:  lo.ToPtr("Microsoft.Compute/virtualMachines"),
				Values: []azmetrics.Metric{{
					Name: &azmetrics.LocalizableString{Value: lo.ToPtr("cpu")},
					TimeSeries: []azmetrics.TimeSeriesElement{{
						MetadataValues: []azmetrics.MetadataValue{{
							Name:  &azmetrics.LocalizableString{Value: lo.ToPtr("host")},
							Value: lo.ToPtr("vm-1"),
						}},
						Data: []azmetrics.MetricValue{
							{TimeStamp: lo.ToPtr(start), Average: lo.ToPtr(1.0), Maximum: lo.ToPtr(2.0)},
							{TimeStamp: lo.ToPtr(start.Add(time.Minute)), Average: lo.ToPtr(3.0), Maximum: lo.ToPtr(4.0)},
							{Average: lo.ToPtr(9.0)},
						},
					}},
				}},
			}},
		},
	})

	output := response.ToMetricsSeriesOutput()
	if got := len(output.GetSeries()); got != 2 {
		t.Fatalf("expected 2 series, got %d", got)
	}

	for i, want := range []struct {
		aggregation string
		values      []float64
	}{
		{"average", []float64{1, 3}},
		{"maximum", []float64{2, 4}},
	} {
		s := output.GetSeries()[i]
		labels := s.GetLabels()
		if s.GetName() != "cpu" || labels["aggregation"] != want.aggregation || labels["host"] != "vm-1" ||
			labels["resource_uri"] != "/subscriptions/s/vm" || labels["metric_namespace"] != "Microsoft.Compute/virtualMachines" {
			t.Fatalf("series %d = %v, want cpu %s", i, s, want.aggregation)
		}
		if got := len(s.GetSamples()); got != len(want.values) {
			t.Fatalf("series %d has %d samples, want %d", i, got, len(want.values))
		}
		for j, value := range want.values {
			sample := s.GetSamples()[j]
			if sample.GetValue() != value || !sample.GetTimestamp().AsTime().Equal(start.Add(time.Duration(j)*time.Minute)) {
				t.Fatalf("series %d sample %d = %v, want %v", i, j, sample, value)
			}
		}
	}
}
