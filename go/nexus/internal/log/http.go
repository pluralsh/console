package log

import (
	"bytes"
	"net/http"
	"strings"
	"time"

	"go.uber.org/zap"
)

// sensitiveHeaders is a list of HTTP headers that should be redacted in logs
var sensitiveHeaders = []string{
	"Authorization",
	"X-Api-Key",
	"X-Auth-Token",
	"Cookie",
	"Set-Cookie",
}

// LogRequest logs an incoming HTTP request with structured fields
func LogRequest(r *http.Request) {
	fields := []zap.Field{
		zap.String("method", r.Method),
		zap.String("path", r.URL.Path),
		zap.String("remote_addr", r.RemoteAddr),
		zap.String("user_agent", r.UserAgent()),
		zap.String("proto", r.Proto),
	}

	// Add query parameters if present (but redact sensitive ones)
	if r.URL.RawQuery != "" {
		fields = append(fields, zap.String("query", redactQuery(r.URL.RawQuery)))
	}

	// Add request ID if present
	if requestID := r.Header.Get("X-Request-ID"); requestID != "" {
		fields = append(fields, zap.String("request_id", requestID))
	}

	// Add correlation ID if present
	if correlationID := r.Header.Get("X-Correlation-ID"); correlationID != "" {
		fields = append(fields, zap.String("correlation_id", correlationID))
	}

	// Log headers only in debug mode
	if logger.Core().Enabled(zap.DebugLevel) {
		headers := make(map[string]string)
		for name, values := range r.Header {
			if isSensitiveHeader(name) {
				headers[name] = "[REDACTED]"
			} else {
				headers[name] = strings.Join(values, ", ")
			}
		}
		fields = append(fields, zap.Any("headers", headers))
	}

	Logger().Info("incoming request", fields...)
}

// LogResponse logs an HTTP response with structured fields
func LogResponse(r *http.Request, status int, duration time.Duration, bytesWritten int64, body *bytes.Buffer) {
	fields := []zap.Field{
		zap.String("method", r.Method),
		zap.String("path", r.URL.Path),
		zap.Int("status", status),
		zap.Duration("duration", duration),
		zap.Int64("bytes", bytesWritten),
		zap.String("body", body.String()),
	}

	// Add request ID if present
	if requestID := r.Header.Get("X-Request-ID"); requestID != "" {
		fields = append(fields, zap.String("request_id", requestID))
	}

	// Log level based on status code
	switch {
	case status >= 500:
		Logger().Error("request completed", fields...)
	case status >= 400:
		Logger().Warn("request completed", fields...)
	default:
		Logger().Info("request completed", fields...)
	}
}

// isSensitiveHeader checks if a header name is sensitive and should be redacted
func isSensitiveHeader(name string) bool {
	nameLower := strings.ToLower(name)
	for _, sensitive := range sensitiveHeaders {
		if strings.ToLower(sensitive) == nameLower {
			return true
		}
	}
	return false
}

// redactQuery redacts sensitive query parameters
func redactQuery(query string) string {
	// Simple redaction for common sensitive parameters
	// For production, consider more sophisticated parsing
	sensitive := []string{"token", "key", "secret", "password", "api_key"}

	for _, param := range sensitive {
		if strings.Contains(strings.ToLower(query), param+"=") {
			// Replace the value after the parameter with [REDACTED]
			// This is a simple approach; for production use proper URL parsing
			parts := strings.Split(query, "&")
			for i, part := range parts {
				if strings.HasPrefix(strings.ToLower(part), param+"=") {
					parts[i] = param + "=[REDACTED]"
				}
			}
			query = strings.Join(parts, "&")
		}
	}

	return query
}
