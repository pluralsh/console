package log

import (
	"context"

	"go.uber.org/zap"
)

// contextKey is the type used for context keys
type contextKey string

const (
	// correlationIDKey is the context key for correlation ID
	correlationIDKey contextKey = "correlation_id"
	// requestIDKey is the context key for request ID
	requestIDKey contextKey = "request_id"
	// userIDKey is the context key for user ID
	userIDKey contextKey = "user_id"
)

// WithContext returns a logger with fields extracted from context
func WithContext(ctx context.Context) *zap.Logger {
	logger := Logger()

	// Extract correlation ID
	if correlationID, ok := ctx.Value(correlationIDKey).(string); ok && correlationID != "" {
		logger = logger.With(zap.String("correlation_id", correlationID))
	}

	// Extract request ID
	if requestID, ok := ctx.Value(requestIDKey).(string); ok && requestID != "" {
		logger = logger.With(zap.String("request_id", requestID))
	}

	// Extract user ID
	if userID, ok := ctx.Value(userIDKey).(string); ok && userID != "" {
		logger = logger.With(zap.String("user_id", userID))
	}

	return logger
}

// WithError returns a logger with structured error field
func WithError(err error) *zap.Logger {
	if err == nil {
		return Logger()
	}
	return Logger().With(zap.Error(err))
}

// WithFields returns a logger with custom structured fields
func WithFields(fields ...zap.Field) *zap.Logger {
	return Logger().With(fields...)
}

// ContextWithCorrelationID adds a correlation ID to the context
func ContextWithCorrelationID(ctx context.Context, correlationID string) context.Context {
	return context.WithValue(ctx, correlationIDKey, correlationID)
}

// ContextWithRequestID adds a request ID to the context
func ContextWithRequestID(ctx context.Context, requestID string) context.Context {
	return context.WithValue(ctx, requestIDKey, requestID)
}

// ContextWithUserID adds a user ID to the context
func ContextWithUserID(ctx context.Context, userID string) context.Context {
	return context.WithValue(ctx, userIDKey, userID)
}

// GetCorrelationID extracts correlation ID from context
func GetCorrelationID(ctx context.Context) string {
	if correlationID, ok := ctx.Value(correlationIDKey).(string); ok {
		return correlationID
	}
	return ""
}

// GetRequestID extracts request ID from context
func GetRequestID(ctx context.Context) string {
	if requestID, ok := ctx.Value(requestIDKey).(string); ok {
		return requestID
	}
	return ""
}

// GetUserID extracts user ID from context
func GetUserID(ctx context.Context) string {
	if userID, ok := ctx.Value(userIDKey).(string); ok {
		return userID
	}
	return ""
}
