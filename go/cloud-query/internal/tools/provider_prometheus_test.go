package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"regexp"
	"strconv"
	"strings"
	"testing"
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
)

// Mimics a backend that applies the limit before returning values, so a
// client-side filter alone only ever sees the first page of names.
func TestPrometheusMetricsSearchFiltersServerSide(t *testing.T) {
	names := make([]string, 0, 6000)
	for i := range 6000 {
		names = append(names, fmt.Sprintf("aaa_metric_%04d", i))
	}
	names = append(names, "absinthe_execute_operation_duration_bucket", "Absinthe_Resolve_Total")

	var gotMatch string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/v1/label/__name__/values" {
			http.NotFound(w, r)
			return
		}
		gotMatch = r.URL.Query().Get("match[]")
		values := names
		if gotMatch != "" {
			pattern := strings.TrimSuffix(strings.TrimPrefix(gotMatch, `{__name__=~`), `}`)
			unquoted, err := strconv.Unquote(pattern)
			if err != nil {
				t.Errorf("unquote %q: %v", pattern, err)
			}
			re := regexp.MustCompile("^(?:" + unquoted + ")$")
			values = nil
			for _, name := range names {
				if re.MatchString(name) {
					values = append(values, name)
				}
			}
		}
		if limit, _ := strconv.Atoi(r.URL.Query().Get("limit")); limit > 0 && len(values) > limit {
			values = values[:limit]
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"status": "success", "data": values})
	}))
	defer server.Close()

	provider := &PrometheusProvider{conn: &toolquery.PrometheusConnection{Url: server.URL}}
	query := "absinthe"
	limit := int64(100)
	out, err := provider.MetricsSearch(context.Background(), &toolquery.MetricsSearchInput{Query: query, Limit: &limit})
	if err != nil {
		t.Fatal(err)
	}

	if gotMatch != `{__name__=~"(?i).*absinthe.*"}` {
		t.Fatalf("match[] = %q", gotMatch)
	}
	if len(out.GetMetrics()) != 2 {
		t.Fatalf("metrics = %v, want both absinthe metrics", out.GetMetrics())
	}
}

func TestMetricNameSearchSelectorEscapesRegex(t *testing.T) {
	got := metricNameSearchSelector(`http.requests`)
	want := `{__name__=~"(?i).*http\\.requests.*"}`
	if got != want {
		t.Fatalf("selector = %s, want %s", got, want)
	}
}

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

func TestPrometheusStepIsRaisedForLongRanges(t *testing.T) {
	provider := &PrometheusProvider{}
	start := time.Date(2026, 10, 9, 12, 0, 0, 0, time.UTC)
	stepText := "15s"
	input := &toolquery.MetricsQueryInput{
		Step:  &stepText,
		Range: &toolquery.TimeRange{Start: timestamppb.New(start), End: timestamppb.New(start.Add(7 * 24 * time.Hour))},
	}

	step, err := provider.toStep(input)
	if err != nil {
		t.Fatal(err)
	}
	if step != 605*time.Second {
		t.Fatalf("step = %s, want 10m5s", step)
	}

	input.Range.End = timestamppb.New(start.Add(time.Hour))
	if step, _ := provider.toStep(input); step != 15*time.Second {
		t.Fatalf("step = %s, want the requested 15s", step)
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
