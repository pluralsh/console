package main

import (
	"net/http"

	"github.com/prometheus/client_golang/prometheus/promhttp"

	"github.com/pluralsh/console/go/test/failing-service/args"
)

func main() {
	args.Init()

	mux := http.NewServeMux()
	mux.Handle(defaultMetricsPath, promhttp.Handler())
	go func() {
		if err := http.ListenAndServe(defaultMetricsAddress, mux); err != nil {
			klog.Fatal(err)
		}
	}()
}
