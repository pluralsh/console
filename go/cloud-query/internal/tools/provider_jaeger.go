package tools

import (
	"context"
	"fmt"
	"strings"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
	"github.com/pluralsh/console/go/cloud-query/internal/tools/client"
)

const (
	jaegerPrimaryQueryField = "service_name"
)

type JaegerProvider struct {
	conn *toolquery.JaegerConnection
}

func NewJaegerProvider(conn *toolquery.JaegerConnection) *JaegerProvider {
	return &JaegerProvider{conn: conn}
}

func (in *JaegerProvider) Traces(ctx context.Context, input *toolquery.TracesQueryInput) (*toolquery.TracesQueryOutput, error) {
	if in.conn == nil {
		return nil, ErrInvalidArgument
	}
	if input == nil || strings.TrimSpace(input.GetQuery()) == "" {
		return nil, fmt.Errorf("%w: query must be set to Jaeger %s", ErrInvalidArgument, jaegerPrimaryQueryField)
	}

	query, err := in.toJaegerQuery(input)
	if err != nil {
		return nil, err
	}

	client := client.NewJaegerClient(
		in.conn.GetUrl(),
		in.conn.GetToken(),
		in.conn.GetUsername(),
		in.conn.GetPassword(),
	)
	defer client.Close()

	resp, err := client.Traces(ctx, query)
	if err != nil {
		return nil, err
	}

	return &toolquery.TracesQueryOutput{Spans: resp.ToTraceSpans()}, nil
}

func (in *JaegerProvider) toJaegerQuery(input *toolquery.TracesQueryInput) (client.JaegerTraceQuery, error) {
	q := client.JaegerTraceQuery{
		ServiceName: strings.TrimSpace(input.GetQuery()),
		Attributes:  map[string]string{},
	}

	if input.GetRange() != nil {
		if input.GetRange().GetStart() != nil {
			q.StartTimeMin = input.GetRange().GetStart().AsTime().UTC().Format("2006-01-02T15:04:05.999999999Z07:00")
		}
		if input.GetRange().GetEnd() != nil {
			q.StartTimeMax = input.GetRange().GetEnd().AsTime().UTC().Format("2006-01-02T15:04:05.999999999Z07:00")
		}
	}

	if input.GetLimit() > 0 {
		q.SearchDepth = input.GetLimit()
	}

	if options := input.GetOptions(); options != nil {
		if jaeger := options.GetJaeger(); jaeger != nil {
			if v := strings.TrimSpace(jaeger.GetOperationName()); v != "" {
				q.OperationName = v
			}
			if v := strings.TrimSpace(jaeger.GetDurationMin()); v != "" {
				q.DurationMin = v
			}
			if v := strings.TrimSpace(jaeger.GetDurationMax()); v != "" {
				q.DurationMax = v
			}
			for _, attr := range jaeger.GetAttributes() {
				k := strings.ToLower(strings.TrimSpace(attr.GetName()))
				v := strings.TrimSpace(attr.GetValue())
				if k == "" || v == "" {
					continue
				}
				q.Attributes[k] = v
			}
		}
	}

	if len(q.Attributes) == 0 {
		q.Attributes = nil
	}

	return q, nil
}
