package tools

import (
	"context"
	"strconv"
	"strings"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
	"github.com/pluralsh/console/go/cloud-query/internal/tools/client"
)

type TempoProvider struct {
	conn *toolquery.TempoConnection
}

func NewTempoProvider(conn *toolquery.TempoConnection) *TempoProvider {
	return &TempoProvider{conn: conn}
}

func (in *TempoProvider) newClient() *client.TempoClient {
	return client.NewTempoClient(in.conn.GetUrl(), in.conn.GetToken(), in.conn.GetUsername(), in.conn.GetPassword(), in.conn.GetTenantId())
}

func (in *TempoProvider) Traces(ctx context.Context, input *toolquery.TracesQueryInput) (*toolquery.TracesQueryOutput, error) {
	if in.conn == nil || input == nil {
		return nil, ErrInvalidArgument
	}

	client := in.newClient()
	defer client.Close()

	if traceID := strings.TrimSpace(input.GetFilters().GetTraceId()); traceID != "" {
		traceResp, err := client.Trace(ctx, traceID)
		if err != nil {
			return nil, err
		}
		return &toolquery.TracesQueryOutput{Spans: traceResp.ToTraceSpans()}, nil
	}

	if strings.TrimSpace(input.GetQuery()) == "" && !HasTraceFilters(input.GetFilters()) {
		return nil, ErrInvalidArgument
	}
	query, err := combineTraceQL(input.GetQuery(), input.GetFilters())
	if err != nil {
		return nil, err
	}

	limit := ""
	if input.GetLimit() > 0 {
		limit = strconv.Itoa(int(input.GetLimit()))
	}
	start, end := tempoRange(input.GetRange())
	searchResp, err := client.Search(ctx, query, start, end, limit)
	if err != nil {
		return nil, err
	}

	spans := make([]*toolquery.TraceSpan, 0)
	for _, trace := range searchResp.Traces {
		if trace.TraceID == "" {
			continue
		}
		traceResp, err := client.Trace(ctx, trace.TraceID)
		if err != nil {
			return nil, err
		}

		spans = append(spans, traceResp.ToTraceSpans()...)
	}

	return &toolquery.TracesQueryOutput{Spans: spans}, nil
}

func (in *TempoProvider) TraceFacets(ctx context.Context, input *toolquery.TraceFacetsInput) (*toolquery.TraceFacetsOutput, error) {
	if in.conn == nil || input == nil {
		return nil, ErrInvalidArgument
	}

	client := in.newClient()
	defer client.Close()

	query := ""
	if HasTraceFilters(input.GetFilters()) {
		compiled, err := toTraceQL(input.GetFilters())
		if err != nil {
			return nil, err
		}
		query = compiled
	}
	start, end := tempoRange(input.GetRange())

	attribute := strings.TrimSpace(input.GetAttribute())
	if attribute == "" {
		resp, err := client.Tags(ctx, query, start, end)
		if err != nil {
			return nil, err
		}

		names := []string{TraceFacetService, TraceFacetSpanName}
		for _, scope := range resp.Scopes {
			if scope.Name != "span" && scope.Name != "resource" {
				continue
			}
			for _, tag := range scope.Tags {
				names = append(names, scope.Name+"."+tag)
			}
		}
		return facetValues(input, facetNames(names)), nil
	}

	resp, err := client.TagValues(ctx, traceQLAttribute(attribute), query, start, end)
	if err != nil {
		return nil, err
	}

	names := make([]string, 0, len(resp.TagValues))
	for _, value := range resp.TagValues {
		names = append(names, value.Value)
	}
	return facetValues(input, facetNames(names)), nil
}

func tempoRange(timeRange *toolquery.TimeRange) (string, string) {
	if timeRange.GetStart() == nil || timeRange.GetEnd() == nil {
		return "", ""
	}

	return strconv.FormatInt(timeRange.GetStart().AsTime().Unix(), 10),
		strconv.FormatInt(timeRange.GetEnd().AsTime().Unix(), 10)
}
