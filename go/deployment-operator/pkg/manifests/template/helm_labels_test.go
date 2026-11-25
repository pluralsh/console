package template

import (
	"testing"

	"k8s.io/apimachinery/pkg/util/validation"
)

func TestHelmChartLabelValue(t *testing.T) {
	cases := []struct {
		name, version, want string
	}{
		{"console", "0.3.12", "console-0.3.12"},
		{"console", "0.0.0+pr-4693", "console-0.0.0_pr-4693"},
		{
			"agent-substrate", "0.0.0+sha-1228e4fd0a77ad51a39f5e116ab8dba8dc7a887e",
			"agent-substrate-0.0.0_sha-1228e4fd0a77ad51a39f5e116ab8dba8dc7a8",
		},
		// truncating at a separator must not leave the value ending in one
		{"a-chart-name-that-is-long-enough-to-cut", "0.0.0+sha-abcdefghijkl-mnop", "a-chart-name-that-is-long-enough-to-cut-0.0.0_sha-abcdefghijkl"},
	}
	for _, c := range cases {
		got := helmChartLabelValue(c.name, c.version)
		if got != c.want {
			t.Errorf("helmChartLabelValue(%q, %q) = %q, want %q", c.name, c.version, got, c.want)
		}
		if errs := validation.IsValidLabelValue(got); len(errs) > 0 {
			t.Errorf("helmChartLabelValue(%q, %q) = %q is not a valid label value: %v", c.name, c.version, got, errs)
		}
	}
}
