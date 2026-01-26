package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/pluralsh/console/go/nexus/internal/log"
	"github.com/pluralsh/console/go/nexus/internal/middleware"
	"github.com/stretchr/testify/assert"
)

func init() {
	// Initialize logger for tests
	_ = log.Init("info")
}

func TestRecovery_NoPanic(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("success"))
	})

	recoveryHandler := middleware.Recovery()(handler)

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	recoveryHandler.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "success", w.Body.String())
}

func TestRecovery_WithPanic(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		panic("something went wrong")
	})

	recoveryHandler := middleware.Recovery()(handler)

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	// Should not panic
	assert.NotPanics(t, func() {
		recoveryHandler.ServeHTTP(w, req)
	})

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Equal(t, "application/json", w.Header().Get("Content-Type"))
	assert.Contains(t, w.Body.String(), "internal server error")
	assert.Contains(t, w.Body.String(), "unexpected error occurred")
}

func TestRecovery_WithNilPanic(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		panic(nil)
	})

	recoveryHandler := middleware.Recovery()(handler)

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	assert.NotPanics(t, func() {
		recoveryHandler.ServeHTTP(w, req)
	})

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestRecovery_WithErrorPanic(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var arr []int
		_ = arr[10] // This will panic with index out of range
	})

	recoveryHandler := middleware.Recovery()(handler)

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	assert.NotPanics(t, func() {
		recoveryHandler.ServeHTTP(w, req)
	})

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "internal server error")
}

func TestRecovery_PartialResponseWritten(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("partial"))
		panic("error after partial write")
	})

	recoveryHandler := middleware.Recovery()(handler)

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	assert.NotPanics(t, func() {
		recoveryHandler.ServeHTTP(w, req)
	})

	// Note: Once status is written, we can't change it
	// But the panic should still be caught
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestRecovery_PreservesContext(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify context is available
		assert.NotNil(t, r.Context())
		panic("test panic")
	})

	recoveryHandler := middleware.Recovery()(handler)

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	assert.NotPanics(t, func() {
		recoveryHandler.ServeHTTP(w, req)
	})

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}
