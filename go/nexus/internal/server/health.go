package server

import (
	"encoding/json"
	"net/http"

	"github.com/pluralsh/console/go/nexus/internal/log"
	"go.uber.org/zap"
)

// ConsoleHealthChecker defines the interface for checking console connection health
type ConsoleHealthChecker interface {
	IsConnected() bool
}

// HealthResponse represents the health check response
type HealthResponse struct {
	Status string            `json:"status"`
	Checks map[string]string `json:"checks,omitempty"`
}

// HealthHandler returns a handler for health checks
func HealthHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		response := HealthResponse{
			Status: "ok",
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)

		if err := json.NewEncoder(w).Encode(response); err != nil {
			log.Logger().Error("failed to encode health response", zap.Error(err))
		}
	}
}

// ReadyHandler returns a handler for readiness checks
func ReadyHandler(consoleClient ConsoleHealthChecker) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		checks := make(map[string]string)
		status := "ready"
		statusCode := http.StatusOK

		// Check Console gRPC connection
		if consoleClient != nil && !consoleClient.IsConnected() {
			checks["console"] = "disconnected"
			status = "not_ready"
			statusCode = http.StatusServiceUnavailable
		} else {
			checks["console"] = "connected"
		}

		response := HealthResponse{
			Status: status,
			Checks: checks,
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(statusCode)

		if err := json.NewEncoder(w).Encode(response); err != nil {
			log.Logger().Error("failed to encode readiness response", zap.Error(err))
		}
	}
}
