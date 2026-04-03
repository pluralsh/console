package tools

import (
	"context"
	"fmt"
	"strings"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
	"github.com/pluralsh/console/go/cloud-query/internal/tools/client"
)

type DynatraceProvider struct {
	client *client.DynatraceClient
}

func NewDynatraceProvider(conn *toolquery.DynatraceConnection) *DynatraceProvider {
	return &DynatraceProvider{client: client.NewDynatraceClient(conn.Url, conn.ApiToken)}
}

func (in *DynatraceProvider) Metrics(ctx context.Context, input *toolquery.MetricsQueryInput) (*toolquery.MetricsQueryOutput, error) {
	if err := in.validateMetricsInput(input); err != nil {
		return nil, err
	}

	metricsResp, err := in.client.Metrics(ctx, input.GetQuery())
	if err != nil {
		return nil, err
	}

	return metricsResp.ToMetricsQueryOutput(), nil
}

func (in *DynatraceProvider) validateMetricsInput(input *toolquery.MetricsQueryInput) error {
	if !strings.HasPrefix(input.GetQuery(), "timeseries") {
		return fmt.Errorf("invalid query: must start with 'timeseries'")
	}

	if len(input.GetStep()) > 0 {
		return fmt.Errorf("unsupported use of 'step', use 'from', 'to' or 'timeframe' directly in the query. Example: 'timeseries avg(dt.host.cpu.usage), interval:1h'")
	}

	if input.GetRange() != nil {
		return fmt.Errorf("unsupported use of 'range', use 'interval' directly in the query. Example: 'timeseries avg(dt.host.cpu.usage), from:-1h'")
	}

	return nil
}

func (in *DynatraceProvider) MetricsSearch(ctx context.Context, input *toolquery.MetricsSearchInput) (*toolquery.MetricsSearchOutput, error) {
	if in.client == nil || len(input.GetQuery()) == 0 {
		return nil, ErrInvalidArgument
	}

	result, err := in.client.MetricsSearch(ctx, input.GetQuery(), input.GetLimit())
	if err != nil {
		return nil, err
	}

	return result.ToMetricsSearchOutput(), nil
}

func (in *DynatraceProvider) Logs(ctx context.Context, input *toolquery.LogsQueryInput) (*toolquery.LogsQueryOutput, error) {
	if in.client == nil {
		return nil, ErrInvalidArgument
	}

	if err := in.validateLogsInput(input); err != nil {
		return nil, err
	}

	resp, err := in.client.Logs(
		ctx,
		input.GetQuery(),
	)
	if err != nil {
		return nil, err
	}

	return resp.ToLogsQueryOutput(), nil
}

func (in *DynatraceProvider) validateLogsInput(input *toolquery.LogsQueryInput) error {
	if !strings.HasPrefix(input.GetQuery(), "fetch logs") {
		return fmt.Errorf("invalid query: must start with 'fetch logs'")
	}

	if input.GetRange() != nil {
		return fmt.Errorf("unsupported use of 'range', use 'interval' directly in the query. Example: 'fetch logs, from:-1h'")
	}

	if input.GetLimit() > 0 {
		return fmt.Errorf("unsupported use of 'limit', use 'limit' pipe directly in the query. Example: 'fetch logs | limit 100'")
	}

	return nil
}

func (in *DynatraceProvider) Traces(ctx context.Context, input *toolquery.TracesQueryInput) (*toolquery.TracesQueryOutput, error) {
	if in.client == nil {
		return nil, ErrInvalidArgument
	}

	if err := in.validateTracesInput(input); err != nil {
		return nil, err
	}

	resp, err := in.client.Traces(
		ctx,
		input.GetQuery(),
	)
	if err != nil {
		return nil, err
	}

	return resp.ToTracesQueryOutput(), nil
}

func (in *DynatraceProvider) validateTracesInput(input *toolquery.TracesQueryInput) error {
	if !strings.HasPrefix(input.GetQuery(), "fetch spans") {
		return fmt.Errorf("invalid query: must start with 'fetch spans'")
	}

	if input.GetRange() != nil {
		return fmt.Errorf("unsupported use of 'range', use 'interval' directly in the query. Example: 'fetch spans, from:-1h'")
	}

	if input.GetLimit() > 0 {
		return fmt.Errorf("unsupported use of 'limit', use 'limit' pipe directly in the query. Example: 'fetch spans | limit 100'")
	}

	return nil
}
