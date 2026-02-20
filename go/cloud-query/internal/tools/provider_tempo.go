package tools

import (
	"context"
	"strconv"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
	"github.com/pluralsh/console/go/cloud-query/internal/tools/clients"
)

type TempoProvider struct {
	conn *toolquery.TempoConnection
}

func NewTempoProvider(conn *toolquery.TempoConnection) *TempoProvider {
	return &TempoProvider{conn: conn}
}

func (in *TempoProvider) Traces(ctx context.Context, input *toolquery.TracesQueryInput) (*toolquery.TracesQueryOutput, error) {
	if in.conn == nil {
		return nil, ErrInvalidArgument
	}
	if input == nil || input.Query == "" {
		return nil, ErrInvalidArgument
	}

	client := clients.NewTempoClient(in.conn.GetUrl(), in.conn.GetToken(), in.conn.GetTenantId())
	defer client.Close()

	limit := ""
	if input.GetLimit() > 0 {
		limit = strconv.Itoa(int(input.GetLimit()))
	}
	searchResp, err := client.Search(
		ctx,
		input.Query,
		strconv.FormatInt(input.Range.GetStart().AsTime().Unix(), 10),
		strconv.FormatInt(input.Range.GetEnd().AsTime().Unix(), 10),
		limit,
	)
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
