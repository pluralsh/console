package main

import (
	"fmt"
	"net/http"
	"os"

	"github.com/pluralsh/console/go/observability-proxy/internal/logging"
	"k8s.io/klog/v2"
)

func main() {
	klog.InitFlags(nil)
	defer klog.Flush()

	addr := envOrDefault("MOCK_UPSTREAM_ADDR", ":19090")
	name := envOrDefault("MOCK_UPSTREAM_NAME", "upstream")

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		klog.V(logging.LevelVerbose).Infof("[%s] %s %s", name, r.Method, r.URL.String())
		for k, v := range r.Header {
			klog.V(logging.LevelTrace).Infof("[%s] header %s=%v", name, k, v)
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(fmt.Sprintf(`{"name":"%s","method":"%s","path":"%s"}`,
			name, r.Method, r.URL.Path)))
	})

	klog.V(logging.LevelMinimal).Infof("mock upstream %s listening on %s", name, addr)
	if err := http.ListenAndServe(addr, handler); err != nil {
		klog.Errorf("serve: %v", err)
		os.Exit(1)
	}
}

func envOrDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}

	return fallback
}
