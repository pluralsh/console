package middleware

import (
	"encoding/json"
	"net/http"
)

// ErrorResponse represents a JSON error response
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}

// writeJSONError writes a JSON error response
func writeJSONError(w http.ResponseWriter, statusCode int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	resp := ErrorResponse{
		Error:   http.StatusText(statusCode),
		Message: message,
	}

	// Best effort encoding - if it fails, the status code is already sent
	_ = json.NewEncoder(w).Encode(resp)
}
