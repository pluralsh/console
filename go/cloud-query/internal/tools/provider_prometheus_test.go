package tools

import (
	"testing"
	"time"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
)

func TestPrometheusStepSupportsDays(t *testing.T) {
	provider := &PrometheusProvider{}
	stepText := "2d"
	step, err := provider.toStep(&toolquery.MetricsQueryInput{Step: &stepText})
	if err != nil {
		t.Fatal(err)
	}
	if step != 48*time.Hour {
		t.Fatalf("step = %s, want 48h", step)
	}
}

func TestNormalizeRangeFloorsStartAndCeilsEnd(t *testing.T) {
	start := time.Date(2026, 10, 9, 12, 0, 17, 123_000_000, time.UTC)
	end := time.Date(2026, 10, 9, 13, 0, 29, 999_000_000, time.UTC)

	gotStart, gotEnd := normalizeRange(start, end, 15*time.Second)

	wantStart := time.Date(2026, 10, 9, 12, 0, 15, 0, time.UTC)
	wantEnd := time.Date(2026, 10, 9, 13, 0, 30, 0, time.UTC)
	if !gotStart.Equal(wantStart) || !gotEnd.Equal(wantEnd) {
		t.Fatalf("range = (%s, %s), want (%s, %s)", gotStart, gotEnd, wantStart, wantEnd)
	}

	_, gotEnd = normalizeRange(start, wantEnd, 15*time.Second)
	if !gotEnd.Equal(wantEnd) {
		t.Fatalf("aligned end advanced to %s", gotEnd)
	}
}
