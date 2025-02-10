package api

import (
	"net/http"
	"time"

	"github.com/pluralsh/console/go/demo/flaky-service/internal/log"
	"github.com/pluralsh/console/go/demo/flaky-service/metrics"
	"k8s.io/klog/v2"
)

func HandleRequestDefault() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		klog.V(log.LogLevelMinimal).InfoS("Handling API request normally")

		metrics.IncrementRequestCounter(http.StatusOK, r.Method)
		w.WriteHeader(http.StatusOK)
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"message": "req processed successfully"}`))
	}
}

func HandleRequestTimestampModulus(timestampModulus int64) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		klog.V(log.LogLevelMinimal).InfoS("Handling API request using timestamp")
		time_now := time.Now().UnixNano() / int64(time.Millisecond)

		if time_now%timestampModulus == 0 {
			klog.V(log.LogLevelMinimal).InfoS("Timestamp is multiple of modulus, returning status.InternalServerError", "time_now", time_now, "modulus", timestampModulus)

			metrics.IncrementRequestCounter(http.StatusInternalServerError, r.Method)
			w.WriteHeader(http.StatusInternalServerError)
			w.Header().Set("Content-Type", "application/json")
			w.Write([]byte(`{"message": "req failed"}`))
		} else {
			klog.V(log.LogLevelMinimal).InfoS("Timestamp is not multiple of modulus, returning status.OK", "time_now", time_now, "modulus", timestampModulus)

			metrics.IncrementRequestCounter(http.StatusOK, r.Method)
			w.WriteHeader(http.StatusOK)
			w.Header().Set("Content-Type", "application/json")
			w.Write([]byte(`{"message": "req processed successfully"}`))
		}
	}
}
