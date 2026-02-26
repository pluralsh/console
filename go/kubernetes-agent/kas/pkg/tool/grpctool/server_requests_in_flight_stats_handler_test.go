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

func TestServerRequestsInFlightStatsHandler_HandleRPC(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	handler := NewServerRequestsInFlightStatsHandler()
	ctx = handler.TagRPC(ctx, &stats.RPCTagInfo{
		FullMethodName: "/service/Method",
	})

	handler.HandleRPC(ctx, &stats.Begin{})
	handler.HandleRPC(ctx, &stats.Begin{})
	handler.HandleRPC(ctx, &stats.End{})
	handler.HandleRPC(ctx, &stats.End{Client: true})

	expected := `
		# HELP grpc_server_requests_in_flight Number of requests in flight.
		# TYPE grpc_server_requests_in_flight gauge
		grpc_server_requests_in_flight{grpc_method="Method",grpc_service="service"} 1
	`

	err := testutil.CollectAndCompare(handler, strings.NewReader(expected), "grpc_server_requests_in_flight")
	require.NoError(t, err)
}
