package api

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/pluralsh/console/go/demo/flaky-service/metrics"
)

func HandleRequestDefault() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		slog.Info("Handling API request normally")

		metrics.IncrementRequestCounter(http.StatusOK, r.Method)
		w.WriteHeader(http.StatusOK)
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"message": "req processed successfully"}`))
	}
}

func HandleRequestTimestampModulus(timestampModulus int64) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		slog.Info("Handling API request using timestamp")
		time_now := time.Now().UnixNano() / int64(time.Millisecond)
	
		// Removing modulus check, always succeed
		slog.Info("Returning status.OK", "time_now", time_now)

		metrics.IncrementRequestCounter(http.StatusOK, r.Method)
		w.WriteHeader(http.StatusOK)
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"message": "req processed successfully"}`))
	}
}