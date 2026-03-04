package grpctool

import (
	"context"
	"strings"

	"github.com/prometheus/client_golang/prometheus"
	"google.golang.org/grpc/stats"
)

const (
	labelService = "grpc_service"
	labelMethod  = "grpc_method"
	namespace    = "grpc"
	unknown      = "unknown"
)

type metricsCtxKey struct{}

type rpcTagLabels struct {
	service string
	method  string
}

type baseStatsHandler struct {
	collector prometheus.Collector
}

func (h *baseStatsHandler) TagRPC(ctx context.Context, inf *stats.RPCTagInfo) context.Context {
	service, method := parseMethod(inf.FullMethodName)

	ctx = context.WithValue(ctx, metricsCtxKey{}, rpcTagLabels{
		service: service,
		method:  method,
	})

	return ctx
}

func (h *baseStatsHandler) TagConn(ctx context.Context, _ *stats.ConnTagInfo) context.Context {
	return ctx
}

func (h *baseStatsHandler) HandleConn(_ context.Context, _ stats.ConnStats) {
}

func (h *baseStatsHandler) HandleRPC(_ context.Context, _ stats.RPCStats) {
}

func (h *baseStatsHandler) Describe(in chan<- *prometheus.Desc) {
	h.collector.Describe(in)
}

func (h *baseStatsHandler) Collect(in chan<- prometheus.Metric) {
	h.collector.Collect(in)
}

func parseMethod(name string) (string, string) {
	if !strings.HasPrefix(name, "/") {
		return unknown, unknown
	}
	name = name[1:]

	pos := strings.LastIndex(name, "/")
	if pos < 0 {
		return unknown, unknown
	}
	return name[:pos], name[pos+1:]
}

func newRequestsInFlightGaugeVec(sub string) *prometheus.GaugeVec {
	prototype := prometheus.GaugeOpts{
		Namespace: namespace,
		Subsystem: sub,
		Name:      "requests_in_flight",
		Help:      "Number of requests in flight.",
	}

	labels := []string{
		labelMethod,
		labelService,
	}
	return prometheus.NewGaugeVec(prototype, labels)
}

func labels(ctx context.Context, _ stats.RPCStats) []string {
	tag := ctx.Value(metricsCtxKey{}).(rpcTagLabels)
	return []string{
		tag.method,
		tag.service,
	}
}
