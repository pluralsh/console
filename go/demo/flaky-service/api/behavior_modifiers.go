package api

import (
	"fmt"
	"log/slog"
	"net/http"
	"runtime/debug"
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

		if time_now%timestampModulus == 0 {
			slog.Error("found mysterious error, returning status.InternalServerError", "time_now", time_now, "modulus", timestampModulus)
			slog.Error(fmt.Sprintf("printing stacktrace: %s", string(debug.Stack())))

			metrics.IncrementRequestCounter(http.StatusInternalServerError, r.Method)
			w.WriteHeader(http.StatusInternalServerError)
			w.Header().Set("Content-Type", "application/json")
			w.Write([]byte(`{"message": "req failed"}`))
		} else {
			slog.Info("Everything seems fine, returning status.OK", "time_now", time_now, "modulus", timestampModulus)

			metrics.IncrementRequestCounter(http.StatusOK, r.Method)
			w.WriteHeader(http.StatusOK)
			w.Header().Set("Content-Type", "application/json")
			w.Write([]byte(`{"message": "req processed successfully"}`))
		}
	}
}
