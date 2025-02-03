package metrics

import (
	"net/http"
	"strconv"

	"github.com/pluralsh/console/go/demo/flaky-service/internal/log"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"

	"k8s.io/klog/v2"
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
	klog.V(log.LogLevelMinimal).Info("Handling metrics request")
	promhttp.HandlerFor(registry, promhttp.HandlerOpts{}).ServeHTTP(w, r)
}

func StartMetricsServer(address string, metricsPath string) {
	klog.V(log.LogLevelMinimal).InfoS("Starting metrics server", "address", address, "metricsPath", metricsPath)

	registry.MustRegister(requestCounter)
	http.HandleFunc(metricsPath, handleRequest)
	if err := http.ListenAndServe(address, nil); err != nil {
		klog.ErrorS(err, "Could not start metrics server")
	}
}
