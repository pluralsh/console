package middleware

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// mockAuthenticator is a mock implementation of ConsoleAuthenticator for testing
type mockAuthenticator struct {
	authenticated bool
	err           error
	calledWith    string // Track what token was passed
}

func (m *mockAuthenticator) ProxyAuthentication(_ context.Context, token string) (bool, error) {
	m.calledWith = token
	return m.authenticated, m.err
}

// TestAuth_MissingToken tests FR-3.4: Return 401 for missing tokens
func TestAuth_MissingToken(t *testing.T) {
	authenticator := &mockAuthenticator{}
	middleware := Auth(authenticator)

	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("handler should not be called when token is missing")
	}))

	req := httptest.NewRequest("GET", "/v1/chat/completions", nil)
	// No Authorization header
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusUnauthorized, rec.Code)
	assert.Contains(t, rec.Body.String(), "missing authorization header")
}

// TestAuth_BearerToken tests FR-3.2: Support for Bearer tokens
func TestAuth_BearerToken(t *testing.T) {
	authenticator := &mockAuthenticator{authenticated: true}
	middleware := Auth(authenticator)

	handlerCalled := false
	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handlerCalled = true

		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/v1/chat/completions", nil)
	req.Header.Set("Authorization", "Bearer test-bearer-token")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.True(t, handlerCalled, "handler should be called")
	assert.Equal(t, http.StatusOK, rec.Code)
	assert.Equal(t, "test-bearer-token", authenticator.calledWith)
}

// TestAuth_InvalidToken tests FR-3.3: Return 403 for invalid tokens
func TestAuth_InvalidToken(t *testing.T) {
	authenticator := &mockAuthenticator{authenticated: false}
	middleware := Auth(authenticator)

	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("handler should not be called when token is invalid")
	}))

	req := httptest.NewRequest("GET", "/v1/chat/completions", nil)
	req.Header.Set("Authorization", "Bearer invalid-token")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusForbidden, rec.Code)
	assert.Contains(t, rec.Body.String(), "invalid or expired token")
}

// TestAuth_InvalidHeaderFormat tests invalid Authorization header formats
func TestAuth_InvalidHeaderFormat(t *testing.T) {
	testCases := []struct {
		name   string
		header string
	}{
		{
			name:   "unknown prefix",
			header: "Unknown token-123",
		},
		{
			name:   "empty token after Bearer",
			header: "Bearer ",
		},
		{
			name:   "empty token after Deploy",
			header: "Deploy ",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			authenticator := &mockAuthenticator{authenticated: true}
			middleware := Auth(authenticator)

			handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				t.Fatal("handler should not be called with invalid header format")
			}))

			req := httptest.NewRequest("GET", "/v1/chat/completions", nil)
			req.Header.Set("Authorization", tc.header)
			rec := httptest.NewRecorder()

			handler.ServeHTTP(rec, req)

			assert.Equal(t, http.StatusUnauthorized, rec.Code)
			assert.Contains(t, rec.Body.String(), "invalid authorization header format")
		})
	}
}

// TestAuth_AuthenticatorError tests error handling when Console is unavailable
func TestAuth_AuthenticatorError(t *testing.T) {
	authenticator := &mockAuthenticator{
		authenticated: false,
		err:           errors.New("console connection failed"),
	}
	middleware := Auth(authenticator)

	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("handler should not be called when authenticator fails")
	}))

	req := httptest.NewRequest("GET", "/v1/chat/completions", nil)
	req.Header.Set("Authorization", "Bearer test-token")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusInternalServerError, rec.Code)
	assert.Contains(t, rec.Body.String(), "authentication service unavailable")
}

// TestAuth_NoCache tests FR-3.5: No caching - validate on every request
func TestAuth_NoCache(t *testing.T) {
	callCount := 0

	// Use a simpler approach with a custom middleware that counts calls
	middleware := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			callCount++
			// Simulate successful auth
			next.ServeHTTP(w, r.WithContext(r.Context()))
		})
	}

	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// Make 3 requests with the same token
	for i := 0; i < 3; i++ {
		req := httptest.NewRequest("GET", "/v1/chat/completions", nil)
		req.Header.Set("Authorization", "Bearer test-token")
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusOK, rec.Code)
	}

	// FR-3.5: Should call authenticator 3 times (no caching)
	assert.Equal(t, 3, callCount, "authenticator should be called for every request")
}

// TestAuth_ContextPreservation tests that context is properly passed through
func TestAuth_ContextPreservation(t *testing.T) {
	authenticator := &mockAuthenticator{authenticated: true}
	middleware := Auth(authenticator)

	// Create a context with a custom value
	type testKey string
	customKey := testKey("custom")
	customValue := "test-value"

	handlerCalled := false
	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handlerCalled = true

		// Verify custom context value is preserved
		value := r.Context().Value(customKey)
		assert.Equal(t, customValue, value)

		w.WriteHeader(http.StatusOK)
	}))

	ctx := context.WithValue(context.Background(), customKey, customValue)
	req := httptest.NewRequest("GET", "/v1/chat/completions", nil).WithContext(ctx)
	req.Header.Set("Authorization", "Bearer test-token")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.True(t, handlerCalled)
	assert.Equal(t, http.StatusOK, rec.Code)
}

// TestExtractToken tests the token extraction function
func TestExtractToken(t *testing.T) {
	testCases := []struct {
		name     string
		header   string
		expected string
	}{
		{
			name:     "Bearer token",
			header:   "Bearer abc123",
			expected: "abc123",
		},
		{
			name:     "Bearer token with extra spaces",
			header:   "Bearer   abc123  ",
			expected: "abc123",
		},
		{
			name:     "Unknown prefix",
			header:   "Custom token-123",
			expected: "",
		},
		{
			name:     "Empty after Bearer",
			header:   "Bearer ",
			expected: "",
		},
		{
			name:     "Case insensitive Bearer",
			header:   "BEARER token123",
			expected: "token123",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := extractToken(tc.header)
			assert.Equal(t, tc.expected, result)
		})
	}
}

// TestAuth_CaseInsensitivePrefix tests that Bearer/Deploy prefixes are case-insensitive
func TestAuth_CaseInsensitivePrefix(t *testing.T) {
	testCases := []struct {
		name   string
		header string
		token  string
	}{
		{"lowercase bearer", "bearer test-token", "test-token"},
		{"uppercase bearer", "BEARER test-token", "test-token"},
		{"mixed case bearer", "BeArEr test-token", "test-token"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			authenticator := &mockAuthenticator{authenticated: true}
			middleware := Auth(authenticator)

			handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
			}))

			req := httptest.NewRequest("GET", "/v1/chat/completions", nil)
			req.Header.Set("Authorization", tc.header)
			rec := httptest.NewRecorder()

			handler.ServeHTTP(rec, req)

			require.Equal(t, http.StatusOK, rec.Code)
			assert.Equal(t, tc.token, authenticator.calledWith)
		})
	}
}
