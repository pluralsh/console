package middleware

import (
	"bytes"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5/middleware"
	"go.uber.org/zap"

	"github.com/pluralsh/console/go/nexus/internal/log"
)

// RequestLogger returns a middleware that logs HTTP requests
func RequestLogger() func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Only log if debug level is enabled
			if !log.Logger().Core().Enabled(zap.DebugLevel) {
				next.ServeHTTP(w, r)
				return
			}

			start := time.Now()
			ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)

			// Capture the response body using Tee
			// This writes to both the client (w) and our buffer (respBody)
			respBody := new(bytes.Buffer)
			ww.Tee(respBody)

			log.LogRequest(r)

			defer func() {
				log.LogResponse(r, ww.Status(), time.Since(start), int64(ww.BytesWritten()), respBody)
			}()

			next.ServeHTTP(ww, r)
		})
	}
}
