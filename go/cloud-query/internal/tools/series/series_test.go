package series

import (
	"testing"
	"time"
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

func TestFlattenEmptyOutput(t *testing.T) {
	if got := len(Flatten(nil).GetMetrics()); got != 0 {
		t.Fatalf("expected no points, got %d", got)
	}
}
