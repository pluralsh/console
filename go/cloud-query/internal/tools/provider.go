package tools

import (
	"context"
	"errors"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
)

var (
	ErrUnsupportedOperation = errors.New("unsupported operation for provider")
	ErrInvalidArgument      = errors.New("invalid argument")
)

type MetricsProvider interface {
	Metrics(ctx context.Context, input *toolquery.MetricsQueryInput) (*toolquery.MetricsQueryOutput, error)
}

func newMetricsProvider(conn *toolquery.ToolConnection) MetricsProvider {
	switch provider := conn.GetConnection().(type) {
	case *toolquery.ToolConnection_Prometheus:
		return NewPrometheusProvider(provider.Prometheus)
	case *toolquery.ToolConnection_Datadog:
		return NewDatadogProvider(provider.Datadog)
	default:
		return nil
	}
}

type LogsProvider interface {
	Logs(ctx context.Context, input *toolquery.LogsQueryInput) (*toolquery.LogsQueryOutput, error)
}

func newLogsProvider(conn *toolquery.ToolConnection) (LogsProvider, error) {
	switch provider := conn.GetConnection().(type) {
	case *toolquery.ToolConnection_Elastic:
		return NewElasticProvider(provider.Elastic)
	case *toolquery.ToolConnection_Loki:
		return NewLokiProvider(provider.Loki), nil
	case *toolquery.ToolConnection_Datadog:
		return NewDatadogProvider(provider.Datadog), nil
	default:
		return nil, nil
	}
}

type TracesProvider interface {
	Traces(ctx context.Context, input *toolquery.TracesQueryInput) (*toolquery.TracesQueryOutput, error)
}

func newTracesProvider(conn *toolquery.ToolConnection) TracesProvider {
	switch provider := conn.GetConnection().(type) {
	case *toolquery.ToolConnection_Tempo:
		return NewTempoProvider(provider.Tempo)
	case *toolquery.ToolConnection_Datadog:
		return NewDatadogProvider(provider.Datadog)
	default:
		return nil
	}
}

type Provider interface {
	MetricsProvider
	LogsProvider
	TracesProvider
}

type toolProvider struct {
	metrics MetricsProvider
	logs    LogsProvider
	traces  TracesProvider
}

func (p *toolProvider) Metrics(ctx context.Context, input *toolquery.MetricsQueryInput) (*toolquery.MetricsQueryOutput, error) {
	if p.metrics == nil {
		return nil, ErrUnsupportedOperation
	}

	return p.metrics.Metrics(ctx, input)
}

func (p *toolProvider) Logs(ctx context.Context, input *toolquery.LogsQueryInput) (*toolquery.LogsQueryOutput, error) {
	if p.logs == nil {
		return nil, ErrUnsupportedOperation
	}

	return p.logs.Logs(ctx, input)
}

func (p *toolProvider) Traces(ctx context.Context, input *toolquery.TracesQueryInput) (*toolquery.TracesQueryOutput, error) {
	if p.traces == nil {
		return nil, ErrUnsupportedOperation
	}

	return p.traces.Traces(ctx, input)
}

func NewProvider(conn *toolquery.ToolConnection) (Provider, error) {
	logs, err := newLogsProvider(conn)
	if err != nil {
		return nil, err
	}

	return &toolProvider{metrics: newMetricsProvider(conn), logs: logs, traces: newTracesProvider(conn)}, nil
}
