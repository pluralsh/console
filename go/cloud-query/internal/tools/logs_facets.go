package tools

import (
	"fmt"
	"strings"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
)

// datadogLogsQueryWithFacets appends facet filters using Datadog logs query syntax (space = AND).
func datadogLogsQueryWithFacets(base string, facets []*toolquery.LogsQueryFacet) string {
	var b strings.Builder
	q := strings.TrimSpace(base)
	b.WriteString(q)
	for _, f := range facets {
		if f.GetName() == "" {
			continue
		}
		// Always add a space before the facet unless the builder is empty
		if b.Len() > 0 {
			b.WriteString(" ")
		}
		b.WriteString(f.GetName())
		b.WriteString(":")
		b.WriteString(datadogEscapeLogQueryValue(f.GetValue()))
	}
	return strings.TrimSpace(b.String())
}

func datadogEscapeLogQueryValue(v string) string {
	if v == "" {
		return `""`
	}
	if strings.ContainsAny(v, " \t\n\"\\") {
		return `"` + strings.ReplaceAll(strings.ReplaceAll(v, `\`, `\\`), `"`, `\"`) + `"`
	}
	return v
}

// splunkSearchWithFacets appends field predicates to the first search stage of an SPL pipeline.
func splunkSearchWithFacets(query string, limit int32, facets []*toolquery.LogsQueryFacet) string {
	clause := splunkFacetClause(facets)
	trimmed := strings.TrimSpace(query)

	var pipeline string
	if strings.HasPrefix(trimmed, "search ") {
		pipeline = splunkAppendFacetsToFirstStage(trimmed, clause)
	} else {
		pipeline = splunkAppendFacetsToFirstStage("search "+trimmed, clause)
	}

	if limit > 0 {
		return fmt.Sprintf("%s | head %d", pipeline, limit)
	}
	return pipeline
}

func splunkFacetClause(facets []*toolquery.LogsQueryFacet) string {
	if len(facets) == 0 {
		return ""
	}
	var b strings.Builder
	for _, f := range facets {
		if f.GetName() == "" {
			continue
		}
		b.WriteString(" ")
		b.WriteString(f.GetName())
		b.WriteString(`="`)
		b.WriteString(splunkEscapeSearchString(f.GetValue()))
		b.WriteString(`"`)
	}
	return b.String()
}

func splunkAppendFacetsToFirstStage(pipeline, facetClause string) string {
	if facetClause == "" {
		return pipeline
	}
	parts := strings.SplitN(pipeline, " | ", 2)
	parts[0] += facetClause
	if len(parts) == 1 {
		return parts[0]
	}
	return parts[0] + " | " + parts[1]
}

func splunkEscapeSearchString(s string) string {
	return strings.ReplaceAll(s, `"`, `\"`)
}
