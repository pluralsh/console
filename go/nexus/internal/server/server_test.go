package server_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/pluralsh/console/go/nexus/internal/server"
	"github.com/stretchr/testify/assert"
)

// mockConsoleHealthChecker is a mock implementation of ConsoleHealthChecker for testing
type mockConsoleHealthChecker struct {
	connected bool
}

func (m *mockConsoleHealthChecker) IsConnected() bool {
	return m.connected
}

func TestHealthHandler(t *testing.T) {
	handler := server.HealthHandler()

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "application/json", w.Header().Get("Content-Type"))
	assert.Contains(t, w.Body.String(), `"status":"ok"`)
}

func TestReadyHandler_Connected(t *testing.T) {
	// Create a mock console client that is connected
	mockClient := &mockConsoleHealthChecker{connected: true}
	handler := server.ReadyHandler(mockClient)

	req := httptest.NewRequest(http.MethodGet, "/ready", nil)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "application/json", w.Header().Get("Content-Type"))
	assert.Contains(t, w.Body.String(), `"status":"ready"`)
	assert.Contains(t, w.Body.String(), `"console":"connected"`)
}

func TestReadyHandler_Disconnected(t *testing.T) {
	// Create a mock console client that is disconnected
	mockClient := &mockConsoleHealthChecker{connected: false}
	handler := server.ReadyHandler(mockClient)

	req := httptest.NewRequest(http.MethodGet, "/ready", nil)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	assert.Equal(t, http.StatusServiceUnavailable, w.Code)
	assert.Equal(t, "application/json", w.Header().Get("Content-Type"))
	assert.Contains(t, w.Body.String(), `"status":"not_ready"`)
	assert.Contains(t, w.Body.String(), `"console":"disconnected"`)
}

func TestReadyHandler_NilClient(t *testing.T) {
	handler := server.ReadyHandler(nil)

	req := httptest.NewRequest(http.MethodGet, "/ready", nil)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	// Nil client should be treated as ready (for tests)
	assert.Equal(t, http.StatusOK, w.Code)
}
