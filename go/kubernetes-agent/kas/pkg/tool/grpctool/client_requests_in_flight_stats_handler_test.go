package grpctool

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/prometheus/client_golang/prometheus/testutil"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc/stats"
)

func TestClientRequestsInFlightStatsHandler_HandleRPC(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	handler := NewClientRequestsInFlightStatsHandler()
	ctx = handler.TagRPC(ctx, &stats.RPCTagInfo{
		FullMethodName: "/service/Method",
	})

	handler.HandleRPC(ctx, &stats.OutHeader{Client: true})
	handler.HandleRPC(ctx, &stats.OutHeader{Client: true})
	handler.HandleRPC(ctx, &stats.End{Client: true})
	handler.HandleRPC(ctx, &stats.End{})

	expected := `
		# HELP grpc_client_requests_in_flight Number of requests in flight.
		# TYPE grpc_client_requests_in_flight gauge
		grpc_client_requests_in_flight{grpc_method="Method",grpc_service="service"} 1
	`

	err := testutil.CollectAndCompare(handler, strings.NewReader(expected), "grpc_client_requests_in_flight")
	require.NoError(t, err)
}
