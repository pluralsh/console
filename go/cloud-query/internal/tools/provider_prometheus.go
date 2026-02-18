package tools

import (
	"context"
	"fmt"
	"time"

	"github.com/prometheus/client_golang/api"
	v1 "github.com/prometheus/client_golang/api/prometheus/v1"
	"github.com/prometheus/common/model"
	"google.golang.org/protobuf/types/known/timestamppb"
	"resty.dev/v3"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
)

type PrometheusProvider struct {
	conn *toolquery.PrometheusConnection
}

func NewPrometheusProvider(conn *toolquery.PrometheusConnection) MetricsProvider {
	return &PrometheusProvider{conn: conn}
}

func (in *PrometheusProvider) newClient(httpClient *resty.Client) (v1.API, error) {
	if len(in.conn.GetUrl()) == 0 {
		return nil, fmt.Errorf("%w: missing url", ErrInvalidArgument)
	}

	if len(in.conn.GetUsername()) > 0 && len(in.conn.GetPassword()) > 0 {
		httpClient.SetBasicAuth(in.conn.GetUsername(), in.conn.GetPassword())
	}

	if len(in.conn.GetToken()) > 0 {
		httpClient.SetAuthScheme("Bearer")
		httpClient.SetAuthToken(in.conn.GetToken())
	}

	apiClient, err := api.NewClient(api.Config{
		Address: in.conn.GetUrl(),
		Client:  httpClient.Client(),
	})
	if err != nil {
		return nil, err
	}

	return v1.NewAPI(apiClient), nil
}

func (in *PrometheusProvider) Metrics(ctx context.Context, input *toolquery.MetricsQueryInput) (*toolquery.MetricsQueryOutput, error) {
	if in.conn == nil {
		return nil, fmt.Errorf("%w: prometheus connection is required", ErrInvalidArgument)
	}
	if input == nil || input.Query == "" {
		return nil, fmt.Errorf("%w: query is required", ErrInvalidArgument)
	}

	httpClient := resty.New()
	defer httpClient.Close()

	client, err := in.newClient(httpClient)
	if err != nil {
		return nil, err
	}

	step := 30 * time.Second
	if len(input.GetStep()) > 0 {
		step, err = time.ParseDuration(input.GetStep())
		if err != nil {
			return nil, fmt.Errorf("%w: invalid step duration: %s", ErrInvalidArgument, input.GetStep())
		}
	}

	value, _, err := client.QueryRange(ctx, input.Query, v1.Range{
		Start: input.GetRange().GetStart().AsTime(),
		End:   input.GetRange().GetEnd().AsTime(),
		Step:  step,
	})
	if err != nil {
		return nil, err
	}

	return in.toMetricsQueryOutput(value)
}

func (in *PrometheusProvider) toStep(input *toolquery.MetricsQueryInput) (time.Duration, error) {
	step := 30 * time.Second
	if len(input.GetStep()) == 0 {
		return step, nil
	}

	parsed, err := time.ParseDuration(input.GetStep())
	if err != nil {
		return time.Duration(0), fmt.Errorf("%w: invalid step duration: %s", ErrInvalidArgument, input.GetStep())
	}

	return parsed, nil
}

func (in *PrometheusProvider) toMetricsQueryOutput(value model.Value) (*toolquery.MetricsQueryOutput, error) {
	matrix, ok := value.(model.Matrix)
	if !ok {
		return nil, fmt.Errorf("unexpected prometheus result type %T", value)
	}

	metrics := make([]*toolquery.MetricPoint, 0)
	for _, stream := range matrix {
		name := string(stream.Metric[model.MetricNameLabel])
		labels := make(map[string]string, len(stream.Metric))
		for k, v := range stream.Metric {
			if k == model.MetricNameLabel {
				continue
			}
			labels[string(k)] = string(v)
		}

		for _, sample := range stream.Values {
			ts := time.Unix(0, int64(sample.Timestamp)*int64(time.Millisecond))
			metrics = append(metrics, &toolquery.MetricPoint{
				Timestamp: timestamppb.New(ts),
				Name:      name,
				Value:     float64(sample.Value),
				Labels:    labels,
			})
		}
	}

	return &toolquery.MetricsQueryOutput{Metrics: metrics}, nil
}
