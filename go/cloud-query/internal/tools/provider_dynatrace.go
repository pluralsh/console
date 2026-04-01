package tools

import (
	"context"
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"

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
	metricsResp, err := in.client.Metrics(
		ctx,
		input.Query,
		input.GetRange().GetStart().AsTime().UnixMilli(),
		input.GetRange().GetEnd().AsTime().UnixMilli(),
	)
	if err != nil {
		return nil, err
	}

	output := &toolquery.MetricsQueryOutput{}
	for _, res := range metricsResp.Result {
		for _, data := range res.Data {
			for i, ts := range data.Timestamps {
				output.Metrics = append(output.Metrics, &toolquery.MetricPoint{
					Timestamp: timestamppb.New(time.UnixMilli(ts)),
					Name:      res.MetricId,
					Value:     data.Values[i],
					Labels:    data.Dimensions,
				})
			}
		}
	}

	return output, nil
}

func (in *DynatraceProvider) MetricsSearch(ctx context.Context, input *toolquery.MetricsSearchInput) (*toolquery.MetricsSearchOutput, error) {
	if in.client == nil {
		return nil, ErrInvalidArgument
	}

	result, err := in.client.MetricsSearch(ctx, input.Query)
	if err != nil {
		return nil, err
	}

	output := &toolquery.MetricsSearchOutput{}
	for _, m := range result.Metrics {
		output.Metrics = append(output.Metrics, &toolquery.MetricsSearchResult{Name: m.MetricId})
	}
	return output, nil
}

func (in *DynatraceProvider) Logs(ctx context.Context, input *toolquery.LogsQueryInput) (*toolquery.LogsQueryOutput, error) {
	if in.client == nil {
		return nil, ErrInvalidArgument
	}

	return in.client.Logs(
		ctx,
		input.Query,
		input.GetRange().GetStart().AsTime().Format(time.RFC3339),
		input.GetRange().GetEnd().AsTime().Format(time.RFC3339),
	)
}

func (in *DynatraceProvider) Traces(ctx context.Context, input *toolquery.TracesQueryInput) (*toolquery.TracesQueryOutput, error) {
	if in.client == nil {
		return nil, ErrInvalidArgument
	}

	return in.client.Traces(
		ctx,
		input.Query,
		input.GetRange().GetStart().AsTime().Format(time.RFC3339),
		input.GetRange().GetEnd().AsTime().Format(time.RFC3339),
	)
}
