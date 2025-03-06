package api

import (
	"log/slog"
	"net/http"

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

func HandleRequestTimestampModulus() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		slog.Info("Handling API request using timestamp")
		// No timestamp modulus check, simply return status OK
		slog.Info("Everything seems fine, returning status.OK") 
		metrics.IncrementRequestCounter(http.StatusOK, r.Method)
		w.WriteHeader(http.StatusOK)
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"message": "req processed successfully"}`))
	}
}