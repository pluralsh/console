package grpctool

import (
	"context"

	"github.com/prometheus/client_golang/prometheus"
	"google.golang.org/grpc/stats"
)

func NewClientRequestsInFlightStatsHandler() *ClientRequestsInFlightStatsHandler {
	vec := newRequestsInFlightGaugeVec("client")

	return &ClientRequestsInFlightStatsHandler{
		vec: vec,
		baseStatsHandler: baseStatsHandler{
			collector: vec,
		},
	}
}

type ClientRequestsInFlightStatsHandler struct {
	baseStatsHandler
	vec *prometheus.GaugeVec
}

func (h *ClientRequestsInFlightStatsHandler) HandleRPC(ctx context.Context, stat stats.RPCStats) {
	switch stat.(type) {
	case *stats.OutHeader:
		if stat.IsClient() {
			h.vec.WithLabelValues(labels(ctx, stat)...).Inc()
		}
	case *stats.End:
		if stat.IsClient() {
			h.vec.WithLabelValues(labels(ctx, stat)...).Dec()
		}
	}
}
