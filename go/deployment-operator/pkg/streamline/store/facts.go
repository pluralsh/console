package store

import (
	"strconv"

	"github.com/pluralsh/console/go/deployment-operator/pkg/streamline/insights"
)

// nullableCriticality returns nil for components that were not classified, so the column stays NULL.
func nullableCriticality(facts insights.Facts) any {
	if facts.Criticality == 0 {
		return nil
	}
	return facts.Criticality
}

func nullableInt(v *int64) any {
	if v == nil {
		return nil
	}
	return *v
}

// sqlInt renders an optional integer as an SQL literal for statements built as strings.
func sqlInt(v *int64) string {
	if v == nil {
		return "NULL"
	}
	return strconv.FormatInt(*v, 10)
}

// sqlCriticality renders the criticality as an SQL literal, NULL for components that were not classified.
func sqlCriticality(facts insights.Facts) string {
	if facts.Criticality == 0 {
		return "NULL"
	}
	return strconv.Itoa(facts.Criticality)
}
