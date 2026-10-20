package service

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
)

func TestLogAggregateValidation(t *testing.T) {
	service := &ToolQueryService{}

	_, err := service.LogAggregate(context.Background(), nil)
	require.Equal(t, codes.InvalidArgument, status.Code(err))

	now := time.Now().UTC()
	input := &toolquery.LogAggregateInput{
		Connection: &toolquery.ToolConnection{
			Connection: &toolquery.ToolConnection_Loki{
				Loki: &toolquery.LokiConnection{Url: "https://loki.example.com"},
			},
		},
		Query:      `{app="console"}`,
		BucketSize: "invalid",
		Range: &toolquery.TimeRange{
			Start: timestamppb.New(now.Add(-time.Hour)),
			End:   timestamppb.New(now),
		},
	}

	_, err = service.LogAggregate(context.Background(), input)
	require.Equal(t, codes.InvalidArgument, status.Code(err))
	require.Contains(t, status.Convert(err).Message(), "bucket_size must use Go duration syntax")
}

func TestValidateBucketSize(t *testing.T) {
	for _, test := range []struct {
		name    string
		value   string
		message string
	}{
		{name: "missing", message: "bucket_size is required"},
		{name: "blank", value: " \t", message: "bucket_size is required"},
		{name: "malformed", value: "invalid", message: "bucket_size must use Go duration syntax"},
		{name: "missing unit", value: "5", message: "bucket_size must use Go duration syntax"},
		{name: "unsupported unit", value: "1d", message: "supported units are ns, us, µs/μs, ms, s, m, and h"},
		{name: "zero", value: "0s", message: "bucket_size must be greater than zero"},
		{name: "negative", value: "-1m", message: "bucket_size must be greater than zero"},
		{name: "overflow", value: "2562048h", message: "bucket_size exceeds this endpoint's maximum duration of 2562047h47m16.854775807s"},
	} {
		t.Run(test.name, func(t *testing.T) {
			err := validateBucketSize(test.value)
			require.Equal(t, codes.InvalidArgument, status.Code(err))
			require.Contains(t, status.Convert(err).Message(), test.message)
		})
	}

	for _, value := range []string{
		"1ns",
		"500ms",
		"1.5h",
		"1h30m",
		"2562047h47m16.854775807s",
	} {
		t.Run("valid "+value, func(t *testing.T) {
			require.NoError(t, validateBucketSize(value))
		})
	}
}

func TestEmptyLogQueryValidation(t *testing.T) {
	service := &ToolQueryService{}
	now := time.Now().UTC()
	timeRange := &toolquery.TimeRange{
		Start: timestamppb.New(now.Add(-time.Hour)),
		End:   timestamppb.New(now),
	}
	elastic := &toolquery.ToolConnection{
		Connection: &toolquery.ToolConnection_Elastic{
			Elastic: &toolquery.ElasticConnection{},
		},
	}
	loki := &toolquery.ToolConnection{
		Connection: &toolquery.ToolConnection_Loki{
			Loki: &toolquery.LokiConnection{},
		},
	}

	require.NoError(t, service.validateLogsInput(elastic, "", timeRange))
	require.NoError(t, service.validateLogsInput(loki, "", timeRange))
	require.Error(t, service.validateInput(loki, "", timeRange))
}

func TestMetricsSeriesMatchesFlatMetrics(t *testing.T) {
	prometheus := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, "/api/v1/query_range", r.URL.Path)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"status": "success",
			"data": {
				"resultType": "matrix",
				"result": [
					{"metric": {"__name__": "up", "job": "a"}, "values": [[1760875200, "1"], [1760875230, "0.5"]]},
					{"metric": {"job": "b"}, "values": [[1760875200, "2"]]}
				]
			}
		}`))
	}))
	defer prometheus.Close()

	service := &ToolQueryService{}
	now := time.Unix(1760875260, 0).UTC()
	input := &toolquery.MetricsQueryInput{
		Connection: &toolquery.ToolConnection{
			Connection: &toolquery.ToolConnection_Prometheus{
				Prometheus: &toolquery.PrometheusConnection{Url: prometheus.URL},
			},
		},
		Query: "up",
		Range: &toolquery.TimeRange{
			Start: timestamppb.New(now.Add(-time.Minute)),
			End:   timestamppb.New(now),
		},
	}

	series, err := service.MetricsSeries(context.Background(), input)
	require.NoError(t, err)
	require.Len(t, series.GetSeries(), 2)
	require.Equal(t, "up", series.GetSeries()[0].GetName())
	require.Equal(t, map[string]string{"job": "a"}, series.GetSeries()[0].GetLabels())
	require.Len(t, series.GetSeries()[0].GetSamples(), 2)
	require.Equal(t, 0.5, series.GetSeries()[0].GetSamples()[1].GetValue())
	require.Equal(t, time.Unix(1760875230, 0).UTC(), series.GetSeries()[0].GetSamples()[1].GetTimestamp().AsTime())
	require.Equal(t, "", series.GetSeries()[1].GetName())
	require.Equal(t, map[string]string{"job": "b"}, series.GetSeries()[1].GetLabels())

	flat, err := service.Metrics(context.Background(), input)
	require.NoError(t, err)
	require.Len(t, flat.GetMetrics(), 3)

	i := 0
	for _, s := range series.GetSeries() {
		for _, sample := range s.GetSamples() {
			point := flat.GetMetrics()[i]
			require.Equal(t, s.GetName(), point.GetName())
			require.Equal(t, s.GetLabels(), point.GetLabels())
			require.Equal(t, sample.GetValue(), point.GetValue())
			require.Equal(t, sample.GetTimestamp().AsTime(), point.GetTimestamp().AsTime())
			i++
		}
	}
}

func TestMetricsSeriesValidation(t *testing.T) {
	service := &ToolQueryService{}

	_, err := service.MetricsSeries(context.Background(), nil)
	require.Equal(t, codes.InvalidArgument, status.Code(err))

	_, err = service.MetricsSeries(context.Background(), &toolquery.MetricsQueryInput{
		Connection: &toolquery.ToolConnection{
			Connection: &toolquery.ToolConnection_Prometheus{
				Prometheus: &toolquery.PrometheusConnection{Url: "https://prom.example.com"},
			},
		},
	})
	require.Equal(t, codes.InvalidArgument, status.Code(err))
}
