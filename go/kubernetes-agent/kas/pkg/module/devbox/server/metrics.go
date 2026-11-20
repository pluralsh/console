package server

import (
	"github.com/prometheus/client_golang/prometheus"
)

type metrics struct {
	tunnels          prometheus.Gauge
	streams          prometheus.Gauge
	streamRejections *prometheus.CounterVec
}

func newMetrics() *metrics {
	return &metrics{
		tunnels: prometheus.NewGauge(prometheus.GaugeOpts{
			Name: "devbox_gateway_tunnels",
			Help: "Number of devbox-gateway reverse tunnels connected to this KAS replica",
		}),
		streams: prometheus.NewGauge(prometheus.GaugeOpts{
			Name: "devbox_streams",
			Help: "Number of browser devbox streams being proxied by this KAS replica",
		}),
		streamRejections: prometheus.NewCounterVec(prometheus.CounterOpts{
			Name: "devbox_stream_rejections_total",
			Help: "Number of browser devbox stream requests rejected before reaching a gateway, by reason",
		}, []string{"reason"}),
	}
}

func (m *metrics) collectors() []prometheus.Collector {
	return []prometheus.Collector{m.tunnels, m.streams, m.streamRejections}
}
