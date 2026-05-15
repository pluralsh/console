package args

import (
	"net/http"
	"net/http/pprof"

	"k8s.io/klog/v2"
)

func initProfiler() {
	klog.Info("initializing profiler")

	mux := http.NewServeMux()
	mux.HandleFunc(defaultProfilerPath, pprof.Index)
	go func() {
		if err := http.ListenAndServe(defaultProfilerAddress, mux); err != nil {
			klog.Fatal(err)
		}
	}()
}
