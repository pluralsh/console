package tools

import (
	"fmt"
	"strings"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
)

func mergeLokiQueryWithFacets(query string, facets []*toolquery.LogsQueryFacet) string {
	if len(facets) == 0 {
		return query
	}
	additions := make([]string, 0, len(facets))
	for _, f := range facets {
		if f.GetName() == "" {
			continue
		}
		additions = append(additions, fmt.Sprintf(`%s="%s"`, lokiFormatLabelName(f.GetName()), lokiEscapeLabelValue(f.GetValue())))
	}
	if len(additions) == 0 {
		return query
	}
	extra := strings.Join(additions, ",")

	q := strings.TrimSpace(query)
	start := strings.Index(q, "{")
	if start >= 0 {
		depth := 0
		for i := start; i < len(q); i++ {
			switch q[i] {
			case '{':
				depth++
			case '}':
				depth--
				if depth == 0 {
					inner := strings.TrimSpace(q[start+1 : i])
					newInner := extra
					if inner != "" {
						newInner = inner + "," + extra
					}
					return q[:start] + "{" + newInner + "}" + q[i+1:]
				}
			}
		}
	}

	return "{" + extra + "} " + q
}

func lokiFormatLabelName(name string) string {
	for _, r := range name {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_' {
			continue
		}
		return "`" + strings.ReplaceAll(name, "`", "") + "`"
	}
	return name
}

func lokiEscapeLabelValue(value string) string {
	v := strings.ReplaceAll(value, `\`, `\\`)
	v = strings.ReplaceAll(v, `"`, `\"`)
	return v
}
