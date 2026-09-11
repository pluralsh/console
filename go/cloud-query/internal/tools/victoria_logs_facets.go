package tools

import (
	"fmt"
	"strings"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
)

func mergeVictoriaLogsQueryWithFacets(query string, facets []*toolquery.LogsQueryFacet, operator toolquery.LogQueryOperator) string {
	filters := make([]string, 0, len(facets))
	for _, facet := range facets {
		name := strings.TrimSpace(facet.GetName())
		if name == "" {
			continue
		}
		filters = append(filters, fmt.Sprintf(`%s:="%s"`, victoriaLogsQuoteIdent(name), escapeDoubleQuoted(facet.GetValue())))
	}
	if len(filters) == 0 {
		return query
	}

	q := strings.TrimSpace(query)
	facetExpr := strings.Join(filters, " ")
	if operator == toolquery.LogQueryOperator_LOG_QUERY_OPERATOR_OR && len(filters) > 1 {
		facetExpr = "(" + strings.Join(filters, " OR ") + ")"
	}
	if q == "" {
		return facetExpr
	}
	return q + " " + facetExpr
}

func victoriaLogsQuoteIdent(name string) string {
	for _, r := range name {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_' {
			continue
		}
		return `"` + strings.ReplaceAll(name, `"`, `\"`) + `"`
	}
	return name
}
