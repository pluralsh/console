package tools

import (
	"sort"
	"strings"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
)

const (
	defaultMetricsLabelSearchLimit = 200
)

func metricsLabelSearchLimit(limit int64) int {
	if limit <= 0 {
		return defaultMetricsLabelSearchLimit
	}

	return int(limit)
}

func newMetricsLabelSearchOutput(values []string, query string, limit int) *toolquery.MetricsLabelSearchOutput {
	filter := strings.ToLower(strings.TrimSpace(query))
	seen := make(map[string]struct{}, len(values))
	results := make([]string, 0, min(len(values), limit))

	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		if filter != "" && !strings.Contains(strings.ToLower(value), filter) {
			continue
		}
		if _, exists := seen[value]; exists {
			continue
		}

		seen[value] = struct{}{}
		results = append(results, value)
	}

	sort.Strings(results)
	if limit > 0 && len(results) > limit {
		results = results[:limit]
	}

	output := &toolquery.MetricsLabelSearchOutput{
		Results: make([]*toolquery.MetricsLabelSearchResult, 0, len(results)),
	}
	for _, result := range results {
		output.Results = append(output.Results, &toolquery.MetricsLabelSearchResult{Name: result})
	}

	return output
}
