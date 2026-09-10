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
	require.Contains(t, err.Error(), "bucket_size")
}
