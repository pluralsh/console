package tools

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
	"github.com/pluralsh/console/go/cloud-query/internal/tools/client"
	"github.com/pluralsh/console/go/cloud-query/internal/tools/datasource"
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
		return nil, fmt.Errorf("%w: query must be set to service_name", ErrInvalidArgument)
	}

	jaegerClient := client.NewJaegerClient(
		in.conn.GetUrl(),
		in.conn.GetToken(),
		in.conn.GetUsername(),
		in.conn.GetPassword(),
	)
	defer jaegerClient.Close()

	resp, err := jaegerClient.Traces(ctx, in.toJaegerQuery(input))
	if err != nil {
		return nil, err
	}

	return resp.ToTracesQueryOutput(), nil
}

func (in *JaegerProvider) toJaegerQuery(input *toolquery.TracesQueryInput) datasource.JaegerTraceQuery {
	q := datasource.JaegerTraceQuery{
		ServiceName: strings.TrimSpace(input.GetQuery()),
		Attributes:  map[string]string{},
	}

	if input.GetRange() != nil {
		if input.GetRange().GetStart() != nil {
			q.StartTimeMin = input.GetRange().GetStart().AsTime().UTC().Format(time.RFC3339)
		}
		if input.GetRange().GetEnd() != nil {
			q.StartTimeMax = input.GetRange().GetEnd().AsTime().UTC().Format(time.RFC3339)
		}
	}

	if input.GetLimit() > 0 {
		q.Limit = input.GetLimit()
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

	return q
}
