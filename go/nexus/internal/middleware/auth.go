package middleware

import (
	"context"
	"net/http"
	"strings"

	"go.uber.org/zap"

	"github.com/pluralsh/console/go/nexus/internal/log"
)

// ConsoleAuthenticator is an interface for authenticating tokens with Console
type ConsoleAuthenticator interface {
	ProxyAuthentication(ctx context.Context, token string) (bool, error)
}

// Auth creates an authentication middleware that validates tokens with Console
// FR-3.1: Federated authentication to Console via gRPC
// FR-3.2: Support for Bearer tokens
// FR-3.3: Return 403 for invalid tokens
// FR-3.4: Return 401 for missing tokens
// FR-3.5: No caching - validate on every request
func Auth(authenticator ConsoleAuthenticator) func(http.Handler) http.Handler {
	logger := log.Logger().With(zap.String("middleware", "auth"))

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				logger.Error("missing authorization header",
					zap.String("path", r.URL.Path),
					zap.String("method", r.Method),
				)
				writeJSONError(w, http.StatusUnauthorized, "missing authorization header")
				return
			}

			token := extractToken(authHeader)
			if token == "" {
				logger.Error("invalid authorization header format",
					zap.String("path", r.URL.Path),
					zap.String("method", r.Method),
				)
				writeJSONError(w, http.StatusUnauthorized, "invalid authorization header format")
				return
			}

			authenticated, err := authenticator.ProxyAuthentication(r.Context(), token)
			if err != nil {
				logger.Error("authentication check failed",
					zap.Error(err),
					zap.String("path", r.URL.Path),
					zap.String("method", r.Method),
				)
				// Return 500 for internal errors (gRPC failures, etc.)
				writeJSONError(w, http.StatusInternalServerError, "authentication service unavailable")
				return
			}

			if !authenticated {
				logger.Error("authentication failed - invalid token",
					zap.String("path", r.URL.Path),
					zap.String("method", r.Method),
				)
				writeJSONError(w, http.StatusForbidden, "invalid or expired token")
				return
			}

			logger.Debug("authentication successful",
				zap.String("path", r.URL.Path),
				zap.String("method", r.Method),
			)

			// Continue to next handler with authenticated context
			next.ServeHTTP(w, r.WithContext(r.Context()))
		})
	}
}

// extractToken extracts the token from Authorization header
// Supports:
// - "Bearer <token>"
func extractToken(authHeader string) string {
	// Split on first space
	parts := strings.SplitN(authHeader, " ", 2)

	if len(parts) == 2 {
		prefix := strings.ToLower(parts[0])
		if prefix == "bearer" {
			return strings.TrimSpace(parts[1])
		}
	}

	return ""
}
