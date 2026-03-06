package grpctool

import (
	"context"

	"github.com/prometheus/client_golang/prometheus"
	"google.golang.org/grpc/stats"
)

func NewServerRequestsInFlightStatsHandler() *ServerRequestsInFlightStatsHandler {
	vec := newRequestsInFlightGaugeVec("server")
	return &ServerRequestsInFlightStatsHandler{
		baseStatsHandler: baseStatsHandler{
			collector: vec,
		},
		vec: vec,
	}
}

type ServerRequestsInFlightStatsHandler struct {
	baseStatsHandler
	vec *prometheus.GaugeVec
}

func (h *ServerRequestsInFlightStatsHandler) HandleRPC(ctx context.Context, stat stats.RPCStats) {
	switch stat.(type) {
	case *stats.Begin:
		if !stat.IsClient() {
			h.vec.WithLabelValues(labels(ctx, stat)...).Inc()
		}
	case *stats.End:
		if !stat.IsClient() {
			h.vec.WithLabelValues(labels(ctx, stat)...).Dec()
		}
	}
}
