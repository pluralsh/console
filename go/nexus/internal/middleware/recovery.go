package middleware

import (
	"fmt"
	"net/http"
	"runtime/debug"

	"github.com/pluralsh/console/go/nexus/internal/log"
	"go.uber.org/zap"
)

// Recovery is a middleware that recovers from panics and returns a 500 error
func Recovery() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if err := recover(); err != nil {
					// Log the panic with stack trace
					stack := debug.Stack()
					log.Logger().Error("panic recovered",
						zap.Any("panic", err),
						zap.ByteString("stack", stack),
						zap.String("method", r.Method),
						zap.String("path", r.URL.Path),
					)

					// Return 500 Internal Server Error
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusInternalServerError)
					_, _ = fmt.Fprintf(w, `{"error":"internal server error","message":"an unexpected error occurred"}`)
				}
			}()

			next.ServeHTTP(w, r)
		})
	}
}
