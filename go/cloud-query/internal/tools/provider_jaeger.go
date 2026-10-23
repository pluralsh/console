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

func (in *JaegerProvider) newClient() *client.JaegerClient {
	return client.NewJaegerClient(
		in.conn.GetUrl(),
		in.conn.GetToken(),
		in.conn.GetUsername(),
		in.conn.GetPassword(),
	)
}

func (in *JaegerProvider) Traces(ctx context.Context, input *toolquery.TracesQueryInput) (*toolquery.TracesQueryOutput, error) {
	if in.conn == nil || input == nil {
		return nil, ErrInvalidArgument
	}

	jaegerClient := in.newClient()
	defer jaegerClient.Close()

	if traceID := strings.TrimSpace(input.GetFilters().GetTraceId()); traceID != "" {
		resp, err := jaegerClient.Trace(ctx, traceID)
		if err != nil {
			return nil, err
		}
		return resp.ToTracesQueryOutput(), nil
	}

	q, err := in.toJaegerQuery(input)
	if err != nil {
		return nil, err
	}
	if q.ServiceName == "" {
		return nil, fmt.Errorf("%w: set the query or filters.service to a service name, which trace facets on `service.name` lists", ErrInvalidArgument)
	}

	resp, err := jaegerClient.Traces(ctx, q)
	if err != nil {
		return nil, err
	}

	return resp.ToTracesQueryOutput(), nil
}

// TraceFacets lists services and span names, the only facets Jaeger indexes.
func (in *JaegerProvider) TraceFacets(ctx context.Context, input *toolquery.TraceFacetsInput) (*toolquery.TraceFacetsOutput, error) {
	if in.conn == nil || input == nil {
		return nil, ErrInvalidArgument
	}

	jaegerClient := in.newClient()
	defer jaegerClient.Close()

	switch strings.TrimSpace(input.GetAttribute()) {
	case "":
		return facetValues(input, facetNames([]string{TraceFacetService, TraceFacetSpanName})), nil
	case TraceFacetService:
		services, err := jaegerClient.Services(ctx)
		if err != nil {
			return nil, err
		}
		return facetValues(input, facetNames(services)), nil
	case TraceFacetSpanName:
		service := strings.TrimSpace(input.GetFilters().GetService())
		if service == "" {
			return nil, fmt.Errorf("%w: jaeger lists span names per service, set filters.service", ErrInvalidArgument)
		}
		operations, err := jaegerClient.Operations(ctx, service)
		if err != nil {
			return nil, err
		}
		return facetValues(input, facetNames(operations)), nil
	default:
		return nil, fmt.Errorf("%w: jaeger only lists `%s` and `%s` values", ErrInvalidArgument, TraceFacetService, TraceFacetSpanName)
	}
}

func (in *JaegerProvider) toJaegerQuery(input *toolquery.TracesQueryInput) (datasource.JaegerTraceQuery, error) {
	filters := input.GetFilters()
	q := datasource.JaegerTraceQuery{
		ServiceName:   strings.TrimSpace(input.GetQuery()),
		OperationName: strings.TrimSpace(filters.GetOperation()),
		DurationMin:   strings.TrimSpace(filters.GetDurationMin()),
		DurationMax:   strings.TrimSpace(filters.GetDurationMax()),
		Attributes:    map[string]string{},
	}
	if v := strings.TrimSpace(filters.GetService()); v != "" {
		q.ServiceName = v
	}
	for _, attr := range traceFilterAttributes(filters) {
		q.Attributes[attr[0]] = attr[1]
	}
	if filters.GetErrorsOnly() {
		q.Attributes["error"] = "true"
	}
	for _, d := range []string{q.DurationMin, q.DurationMax} {
		if _, _, err := parseTraceDuration(d); err != nil {
			return q, err
		}
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

	return q, nil
}
