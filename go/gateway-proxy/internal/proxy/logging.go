package proxy

import (
	"bytes"
	"net/http"
	"slices"
	"strings"
)

const maxLoggedBodyBytes = 8 << 10

var sensitiveHeaders = []string{
	"Authorization",
	"Proxy-Authorization",
	"X-Api-Key",
	"Cookie",
	"Set-Cookie",
}

// redactHeaders flattens headers for logging, masking credentials.
func redactHeaders(h http.Header) map[string]string {
	out := make(map[string]string, len(h))
	for key, values := range h {
		canonical := http.CanonicalHeaderKey(key)
		if slices.Contains(sensitiveHeaders, canonical) {
			out[canonical] = "[redacted]"
			continue
		}
		out[canonical] = strings.Join(values, ", ")
	}
	return out
}

func truncateForLog(body []byte) string {
	if len(body) <= maxLoggedBodyBytes {
		return string(bytes.ToValidUTF8(body, nil))
	}
	return string(bytes.ToValidUTF8(body[:maxLoggedBodyBytes], nil)) + "...[truncated]"
}
