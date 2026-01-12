package middleware

import (
	"context"
	"net/http"
	"strings"

	"go.uber.org/zap"

	"github.com/pluralsh/console/go/nexus/internal/log"
)

// contextKey is a custom type for context keys to avoid collisions
type contextKey string

const (
	// UserIDKey is the context key for storing the authenticated user ID
	UserIDKey contextKey = "user_id"
	// TokenKey is the context key for storing the original token
	TokenKey contextKey = "token"
)

// ConsoleAuthenticator is an interface for authenticating tokens with Console
type ConsoleAuthenticator interface {
	ProxyAuthentication(ctx context.Context, token string) (bool, error)
}

// Auth creates an authentication middleware that validates tokens with Console
// FR-3.1: Federated authentication to Console via gRPC
// FR-3.2: Support for Bearer tokens and Deploy tokens
// FR-3.3: Return 403 for invalid tokens
// FR-3.4: Return 401 for missing tokens
// FR-3.5: No caching - validate on every request
func Auth(authenticator ConsoleAuthenticator) func(http.Handler) http.Handler {
	logger := log.Logger().With(zap.String("middleware", "auth"))

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Extract Authorization header
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				// FR-3.4: Return 401 for missing token
				logger.Warn("missing authorization header",
					zap.String("path", r.URL.Path),
					zap.String("method", r.Method),
				)
				writeJSONError(w, http.StatusUnauthorized, "missing authorization header")
				return
			}

			// Extract token from header
			// FR-3.2: Support "Bearer <token>" and "Deploy <token>" formats
			token := extractToken(authHeader)
			if token == "" {
				logger.Warn("invalid authorization header format",
					zap.String("path", r.URL.Path),
					zap.String("method", r.Method),
				)
				writeJSONError(w, http.StatusUnauthorized, "invalid authorization header format")
				return
			}

			// FR-3.5: No caching - validate on every request
			// FR-3.1: Call Console ProxyAuthentication
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
				// FR-3.3: Return 403 for invalid tokens
				logger.Warn("authentication failed - invalid token",
					zap.String("path", r.URL.Path),
					zap.String("method", r.Method),
				)
				writeJSONError(w, http.StatusForbidden, "invalid or expired token")
				return
			}

			// Authentication successful - add token to context for downstream handlers
			ctx := context.WithValue(r.Context(), TokenKey, token)
			// TODO: Once Console returns user ID, add it to context:
			// ctx = context.WithValue(ctx, UserIDKey, userID)

			logger.Debug("authentication successful",
				zap.String("path", r.URL.Path),
				zap.String("method", r.Method),
			)

			// Continue to next handler with authenticated context
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// extractToken extracts the token from Authorization header
// Supports:
// - "Bearer <token>"
// - "Deploy <token>"
// - "<token>" (raw token)
func extractToken(authHeader string) string {
	// Split on first space
	parts := strings.SplitN(authHeader, " ", 2)

	if len(parts) == 2 {
		// Format: "Bearer <token>" or "Deploy <token>"
		prefix := strings.ToLower(parts[0])
		if prefix == "bearer" || prefix == "deploy" {
			return strings.TrimSpace(parts[1])
		}
		// Unknown prefix, return empty
		return ""
	}

	// Single part - treat as raw token (for backwards compatibility)
	return strings.TrimSpace(authHeader)
}

// GetTokenFromContext retrieves the token from the request context
func GetTokenFromContext(ctx context.Context) (string, bool) {
	token, ok := ctx.Value(TokenKey).(string)
	return token, ok
}

// GetUserIDFromContext retrieves the user ID from the request context
func GetUserIDFromContext(ctx context.Context) (string, bool) {
	userID, ok := ctx.Value(UserIDKey).(string)
	return userID, ok
}
