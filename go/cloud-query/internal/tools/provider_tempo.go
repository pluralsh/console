package tools

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"

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

	start, end, err := parseTimeRange(input.Range)
	if err != nil {
		return nil, err
	}

	client := clients.NewTempoClient(in.conn.GetUrl(), in.conn.GetToken(), in.conn.GetTenantId())
	limit := ""
	if input.GetLimit() > 0 {
		limit = strconv.Itoa(int(input.GetLimit()))
	}
	searchResp, err := client.Search(
		ctx,
		input.Query,
		strconv.FormatInt(start.UnixNano(), 10),
		strconv.FormatInt(end.UnixNano(), 10),
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

		spans = append(spans, toTempoSpans(traceResp)...)
	}

	return &toolquery.TracesQueryOutput{Spans: spans}, nil
}

func toTempoSpans(resp *clients.TempoTraceResponse) []*toolquery.TraceSpan {
	spans := make([]*toolquery.TraceSpan, 0)
	for _, trace := range resp.Data {
		for _, span := range trace.Spans {
			service := ""
			if proc, ok := trace.Processes[span.ProcessID]; ok {
				service = proc.ServiceName
			}

			start := time.Unix(0, span.StartTime*int64(time.Microsecond))
			end := start.Add(time.Duration(span.Duration) * time.Microsecond)

			tags := make(map[string]string, len(span.Tags))
			for _, tag := range span.Tags {
				tags[tag.Key] = fmt.Sprint(tag.Value)
			}

			spans = append(spans, &toolquery.TraceSpan{
				TraceId:  trace.TraceID,
				SpanId:   span.SpanID,
				ParentId: span.ParentSpanID,
				Name:     span.OperationName,
				Service:  service,
				Start:    timestamppb.New(start),
				End:      timestamppb.New(end),
				Tags:     tags,
			})
		}
	}
	return spans
}
