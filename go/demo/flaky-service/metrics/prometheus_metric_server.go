package metrics

import (
	"log/slog"
	"net/http"
	"strconv"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var requestCounter = prometheus.NewCounterVec(
	prometheus.CounterOpts{
		Name: "http_requests_total",
		Help: "Number of http requests",
	},
	[]string{"code", "method"},
)

var registry = prometheus.NewRegistry()

func IncrementRequestCounter(code int, method string) {
	requestCounter.WithLabelValues(strconv.Itoa(code), method).Inc()
}

func handleRequest(w http.ResponseWriter, r *http.Request) {
	slog.Info("Handling metrics request")
	promhttp.HandlerFor(registry, promhttp.HandlerOpts{}).ServeHTTP(w, r)
}

func StartMetricsServer(address string, metricsPath string) {
	slog.Info("Starting metrics server", "address", address, "metricsPath", metricsPath)

	registry.MustRegister(requestCounter)
	http.HandleFunc(metricsPath, handleRequest)
	if err := http.ListenAndServe(address, nil); err != nil {
		slog.Error("Could not start metrics server", "error", err)
	}
}
