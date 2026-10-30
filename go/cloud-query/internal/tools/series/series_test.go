package series

import (
	"testing"
	"time"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
)

func TestBuilderGroupsByNameAndLabelsInFirstSeenOrder(t *testing.T) {
	start := time.Date(2026, 10, 19, 12, 0, 0, 0, time.UTC)
	builder := NewBuilder()
	builder.Add("cpu", map[string]string{"pod": "a", "ns": "x"}, start, 1)
	builder.Add("cpu", map[string]string{"pod": "b", "ns": "x"}, start, 2)
	builder.Add("cpu", map[string]string{"ns": "x", "pod": "a"}, start.Add(time.Minute), 3)
	builder.Add("mem", map[string]string{"pod": "a", "ns": "x"}, start, 4)

	output := builder.Output()
	if got := len(output.GetSeries()); got != 3 {
		t.Fatalf("expected 3 series, got %d", got)
	}

	first := output.GetSeries()[0]
	if first.GetName() != "cpu" || first.GetLabels()["pod"] != "a" {
		t.Fatalf("unexpected first series: %v", first)
	}
	if got := len(first.GetSamples()); got != 2 {
		t.Fatalf("expected 2 samples in first series, got %d", got)
	}
	if first.GetSamples()[1].GetValue() != 3 || !first.GetSamples()[1].GetTimestamp().AsTime().Equal(start.Add(time.Minute)) {
		t.Fatalf("unexpected second sample: %v", first.GetSamples()[1])
	}
	if output.GetSeries()[1].GetLabels()["pod"] != "b" || output.GetSeries()[2].GetName() != "mem" {
		t.Fatalf("unexpected series order: %v", output.GetSeries())
	}
}

func TestFlattenExpandsSamplesWithSeriesLabels(t *testing.T) {
	start := time.Date(2026, 10, 19, 12, 0, 0, 0, time.UTC)
	builder := NewBuilder()
	builder.Add("cpu", map[string]string{"pod": "a"}, start, 1)
	builder.Add("cpu", map[string]string{"pod": "b"}, start, 2)
	builder.Add("cpu", map[string]string{"pod": "a"}, start.Add(time.Minute), 3)

	points := Flatten(builder.Output()).GetMetrics()
	if got := len(points); got != 3 {
		t.Fatalf("expected 3 points, got %d", got)
	}

	want := []struct {
		pod   string
		value float64
		at    time.Time
	}{
		{"a", 1, start},
		{"a", 3, start.Add(time.Minute)},
		{"b", 2, start},
	}
	for i, w := range want {
		point := points[i]
		if point.GetName() != "cpu" || point.GetLabels()["pod"] != w.pod || point.GetValue() != w.value || !point.GetTimestamp().AsTime().Equal(w.at) {
			t.Fatalf("point %d = %v, want pod=%s value=%v at=%s", i, point, w.pod, w.value, w.at)
		}
	}
}

func TestMinStepKeepsSeriesWithinMaxSamples(t *testing.T) {
	start := time.Date(2026, 10, 19, 12, 0, 0, 0, time.UTC)

	if got := MinStep(start, start.Add(7*24*time.Hour)); got != 605*time.Second {
		t.Fatalf("7d min step = %s, want 10m5s", got)
	}
	if got := MinStep(start, start.Add(time.Hour)); got != 4*time.Second {
		t.Fatalf("1h min step = %s, want 4s", got)
	}
	if got := MinStep(start, start); got != 0 {
		t.Fatalf("empty range min step = %s, want 0", got)
	}
}

func TestBoundCapsSeriesAndThinsSamples(t *testing.T) {
	start := time.Date(2026, 10, 19, 12, 0, 0, 0, time.UTC)
	builder := NewBuilder()
	for i := range MaxSeries + 5 {
		builder.Add("cpu", map[string]string{"pod": string(rune('a' + i%26)), "i": time.Duration(i).String()}, start, 1)
	}
	for i := range 3 * MaxSamples {
		builder.Add("mem", nil, start.Add(time.Duration(i)*time.Second), float64(i))
	}

	output := Bound(builder.Output())
	if got := len(output.GetSeries()); got != MaxSeries {
		t.Fatalf("expected %d series, got %d", MaxSeries, got)
	}

	long := Bound(&toolquery.MetricsSeriesOutput{Series: builder.Output().GetSeries()[MaxSeries+5:]}).GetSeries()[0]
	samples := long.GetSamples()
	if got := len(samples); got != MaxSamples {
		t.Fatalf("expected %d samples, got %d", MaxSamples, got)
	}
	if samples[0].GetValue() != 0 || samples[len(samples)-1].GetValue() != float64(3*MaxSamples-1) {
		t.Fatalf("thinning should keep the first and last samples, got %v and %v", samples[0], samples[len(samples)-1])
	}
}

func TestFlattenEmptyOutput(t *testing.T) {
	if got := len(Flatten(nil).GetMetrics()); got != 0 {
		t.Fatalf("expected no points, got %d", got)
	}
}
