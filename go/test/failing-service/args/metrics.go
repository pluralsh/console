package args

import (
	"net/http"

	"github.com/prometheus/client_golang/prometheus/promhttp"
	"k8s.io/klog/v2"
)

func initMetrics() {
	klog.Info("initializing prometheus metrics")

	mux := http.NewServeMux()
	mux.Handle(defaultMetricsPath, promhttp.Handler())
	go func() {
		if err := http.ListenAndServe(MetricsAddress(), mux); err != nil {
			klog.Fatal(err)
		}
	}()
}
