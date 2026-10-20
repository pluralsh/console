package tools

import (
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
)

const (
	// TraceFacetService and TraceFacetSpanName are the provider-agnostic names
	// TraceFacets accepts for services and span names.
	TraceFacetService  = "service.name"
	TraceFacetSpanName = "name"

	defaultTraceFacetLimit = 100
)

// traceQLScopes are the TraceQL attribute scopes, which are passed through as
// is; unscoped attributes match either span or resource attributes.
var traceQLScopes = []string{"span.", "resource.", "event.", "link.", "instrumentation."}

func HasTraceFilters(filters *toolquery.TraceFilters) bool {
	if filters == nil {
		return false
	}

	return strings.TrimSpace(filters.GetService()) != "" ||
		strings.TrimSpace(filters.GetOperation()) != "" ||
		len(filters.GetAttributes()) > 0 ||
		strings.TrimSpace(filters.GetDurationMin()) != "" ||
		strings.TrimSpace(filters.GetDurationMax()) != "" ||
		filters.GetErrorsOnly() ||
		strings.TrimSpace(filters.GetTraceId()) != ""
}

func traceFilterAttributes(filters *toolquery.TraceFilters) [][2]string {
	attrs := make([][2]string, 0, len(filters.GetAttributes()))
	for _, attr := range filters.GetAttributes() {
		name, value := strings.TrimSpace(attr.GetName()), strings.TrimSpace(attr.GetValue())
		if name == "" || value == "" {
			continue
		}
		attrs = append(attrs, [2]string{name, value})
	}

	return attrs
}

func parseTraceDuration(value string) (time.Duration, bool, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return 0, false, nil
	}

	d, err := time.ParseDuration(value)
	if err != nil || d < 0 {
		return 0, false, fmt.Errorf("%w: invalid duration %q, use e.g. `10ms` or `1.5s`", ErrInvalidArgument, value)
	}

	return d, true, nil
}

// formatQueryDuration renders a duration both TraceQL and DQL accept.
func formatQueryDuration(d time.Duration) string {
	if d%time.Millisecond == 0 {
		return fmt.Sprintf("%dms", d/time.Millisecond)
	}

	return fmt.Sprintf("%dns", d.Nanoseconds())
}

func traceQLAttribute(name string) string {
	switch name {
	case TraceFacetService:
		return "resource.service.name"
	case TraceFacetSpanName:
		return "name"
	}

	for _, scope := range traceQLScopes {
		if strings.HasPrefix(name, scope) {
			return name
		}
	}

	return "." + name
}

// toTraceQL compiles filters into a TraceQL spanset selector.
func toTraceQL(filters *toolquery.TraceFilters) (string, error) {
	conditions := make([]string, 0)
	if v := strings.TrimSpace(filters.GetService()); v != "" {
		conditions = append(conditions, fmt.Sprintf("resource.service.name = %s", strconv.Quote(v)))
	}
	if v := strings.TrimSpace(filters.GetOperation()); v != "" {
		conditions = append(conditions, fmt.Sprintf("name = %s", strconv.Quote(v)))
	}
	for _, attr := range traceFilterAttributes(filters) {
		conditions = append(conditions, fmt.Sprintf("%s = %s", traceQLAttribute(attr[0]), strconv.Quote(attr[1])))
	}
	if d, ok, err := parseTraceDuration(filters.GetDurationMin()); err != nil {
		return "", err
	} else if ok {
		conditions = append(conditions, "duration >= "+formatQueryDuration(d))
	}
	if d, ok, err := parseTraceDuration(filters.GetDurationMax()); err != nil {
		return "", err
	} else if ok {
		conditions = append(conditions, "duration <= "+formatQueryDuration(d))
	}
	if filters.GetErrorsOnly() {
		conditions = append(conditions, "status = error")
	}

	if len(conditions) == 0 {
		return "{}", nil
	}

	return "{ " + strings.Join(conditions, " && ") + " }", nil
}

// combineTraceQL joins a raw TraceQL query with compiled filters, requiring
// traces to match both.
func combineTraceQL(query string, filters *toolquery.TraceFilters) (string, error) {
	query = strings.TrimSpace(query)
	if !HasTraceFilters(filters) {
		if query == "" {
			return "{}", nil
		}
		return query, nil
	}

	compiled, err := toTraceQL(filters)
	if err != nil {
		return "", err
	}
	if query == "" {
		return compiled, nil
	}

	return fmt.Sprintf("(%s) && %s", query, compiled), nil
}

func datadogFacet(name string) string {
	switch name {
	case TraceFacetService:
		return "service"
	case TraceFacetSpanName:
		return "resource_name"
	case "env", "host", "status", "service", "resource_name", "operation_name", "trace_id", "span_id":
		return name
	}
	if strings.HasPrefix(name, "@") {
		return name
	}

	return "@" + name
}

func datadogValue(value string) string {
	return `"` + escapeDoubleQuoted(value) + `"`
}

// toDatadogQuery compiles filters into Datadog span search syntax, ANDed with
// any raw query.
func toDatadogQuery(query string, filters *toolquery.TraceFilters) (string, error) {
	terms := make([]string, 0)
	if q := strings.TrimSpace(query); q != "" {
		terms = append(terms, "("+q+")")
	}
	if v := strings.TrimSpace(filters.GetTraceId()); v != "" {
		return "trace_id:" + v, nil
	}
	if v := strings.TrimSpace(filters.GetService()); v != "" {
		terms = append(terms, "service:"+datadogValue(v))
	}
	if v := strings.TrimSpace(filters.GetOperation()); v != "" {
		terms = append(terms, "resource_name:"+datadogValue(v))
	}
	for _, attr := range traceFilterAttributes(filters) {
		terms = append(terms, datadogFacet(attr[0])+":"+datadogValue(attr[1]))
	}
	// @duration is in nanoseconds
	if d, ok, err := parseTraceDuration(filters.GetDurationMin()); err != nil {
		return "", err
	} else if ok {
		terms = append(terms, fmt.Sprintf("@duration:>=%d", d.Nanoseconds()))
	}
	if d, ok, err := parseTraceDuration(filters.GetDurationMax()); err != nil {
		return "", err
	} else if ok {
		terms = append(terms, fmt.Sprintf("@duration:<=%d", d.Nanoseconds()))
	}
	if filters.GetErrorsOnly() {
		terms = append(terms, "status:error")
	}

	if len(terms) == 0 {
		return "*", nil
	}

	return strings.Join(terms, " "), nil
}

func dqlField(name string) string {
	switch name {
	case TraceFacetService:
		return "service.name"
	case TraceFacetSpanName:
		return "span.name"
	}

	return "`" + strings.ReplaceAll(name, "`", "") + "`"
}

func dqlTimeframe(timeRange *toolquery.TimeRange) string {
	if timeRange.GetStart() == nil || timeRange.GetEnd() == nil {
		return ""
	}

	return fmt.Sprintf(
		", from:%s, to:%s",
		strconv.Quote(timeRange.GetStart().AsTime().UTC().Format(time.RFC3339Nano)),
		strconv.Quote(timeRange.GetEnd().AsTime().UTC().Format(time.RFC3339Nano)),
	)
}

// dqlTraceFilter compiles filters into a DQL filter expression.
func dqlTraceFilter(filters *toolquery.TraceFilters) (string, error) {
	conditions := make([]string, 0)
	if v := strings.TrimSpace(filters.GetTraceId()); v != "" {
		return fmt.Sprintf("trace.id == toUid(%s)", strconv.Quote(v)), nil
	}
	if v := strings.TrimSpace(filters.GetService()); v != "" {
		conditions = append(conditions, "service.name == "+strconv.Quote(v))
	}
	if v := strings.TrimSpace(filters.GetOperation()); v != "" {
		conditions = append(conditions, "span.name == "+strconv.Quote(v))
	}
	for _, attr := range traceFilterAttributes(filters) {
		conditions = append(conditions, fmt.Sprintf("%s == %s", dqlField(attr[0]), strconv.Quote(attr[1])))
	}
	if d, ok, err := parseTraceDuration(filters.GetDurationMin()); err != nil {
		return "", err
	} else if ok {
		conditions = append(conditions, "duration >= "+formatQueryDuration(d))
	}
	if d, ok, err := parseTraceDuration(filters.GetDurationMax()); err != nil {
		return "", err
	} else if ok {
		conditions = append(conditions, "duration <= "+formatQueryDuration(d))
	}
	if filters.GetErrorsOnly() {
		conditions = append(conditions, `span.status_code == "error"`)
	}

	return strings.Join(conditions, " and "), nil
}

// toDQLSpans compiles filters into a `fetch spans` query.
func toDQLSpans(filters *toolquery.TraceFilters, timeRange *toolquery.TimeRange, limit int64) (string, error) {
	query := "fetch spans" + dqlTimeframe(timeRange)
	filter, err := dqlTraceFilter(filters)
	if err != nil {
		return "", err
	}
	if filter != "" {
		query += " | filter " + filter
	}
	if limit > 0 {
		query += fmt.Sprintf(" | limit %d", limit)
	}

	return query, nil
}

func traceFacetLimit(input *toolquery.TraceFacetsInput) int {
	if input.GetLimit() > 0 {
		return int(input.GetLimit())
	}

	return defaultTraceFacetLimit
}

// facetValues dedupes, filters by the input's substring query, sorts by count
// then name, and applies the input's limit.
func facetValues(input *toolquery.TraceFacetsInput, values []*toolquery.TraceFacetValue) *toolquery.TraceFacetsOutput {
	query := strings.ToLower(strings.TrimSpace(input.GetQuery()))
	seen := make(map[string]*toolquery.TraceFacetValue, len(values))
	for _, value := range values {
		name := strings.TrimSpace(value.GetName())
		if name == "" || (query != "" && !strings.Contains(strings.ToLower(name), query)) {
			continue
		}
		if existing, ok := seen[name]; ok {
			if value.Count != nil {
				total := existing.GetCount() + value.GetCount()
				existing.Count = &total
			}
			continue
		}
		seen[name] = &toolquery.TraceFacetValue{Name: name, Count: value.Count}
	}

	result := make([]*toolquery.TraceFacetValue, 0, len(seen))
	for _, value := range seen {
		result = append(result, value)
	}
	sort.Slice(result, func(i, j int) bool {
		if result[i].GetCount() != result[j].GetCount() {
			return result[i].GetCount() > result[j].GetCount()
		}
		return result[i].GetName() < result[j].GetName()
	})
	if limit := traceFacetLimit(input); len(result) > limit {
		result = result[:limit]
	}

	return &toolquery.TraceFacetsOutput{Values: result}
}

func facetNames(names []string) []*toolquery.TraceFacetValue {
	values := make([]*toolquery.TraceFacetValue, 0, len(names))
	for _, name := range names {
		values = append(values, &toolquery.TraceFacetValue{Name: name})
	}

	return values
}

// spanAttributeNames lists the attribute names seen on sampled spans, for
// providers without an API listing them.
func spanAttributeNames(spans []*toolquery.TraceSpan) []*toolquery.TraceFacetValue {
	counts := map[string]int64{}
	for _, span := range spans {
		for key := range span.GetTags() {
			counts[key]++
		}
	}

	values := make([]*toolquery.TraceFacetValue, 0, 2+len(counts))
	values = append(values,
		&toolquery.TraceFacetValue{Name: TraceFacetService},
		&toolquery.TraceFacetValue{Name: TraceFacetSpanName},
	)
	for key, count := range counts {
		values = append(values, &toolquery.TraceFacetValue{Name: key, Count: &count})
	}

	return values
}
