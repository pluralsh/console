package service

import (
	"context"
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
