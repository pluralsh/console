package proxy

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
)

// Anthropic API error types.
const (
	errInvalidRequest  = "invalid_request_error"
	errAuthentication  = "authentication_error"
	errPermission      = "permission_error"
	errNotFound        = "not_found_error"
	errRequestTooLarge = "request_too_large"
	errRateLimit       = "rate_limit_error"
	errOverloaded      = "overloaded_error"
	errTimeout         = "timeout_error"
	errAPI             = "api_error"
)

// APIError is an error rendered in the Anthropic error format.
type APIError struct {
	Status  int
	Type    string
	Message string
}

func (e *APIError) Error() string { return fmt.Sprintf("%d %s: %s", e.Status, e.Type, e.Message) }

type anthropicErrorBody struct {
	Type  string            `json:"type"`
	Error anthropicErrorObj `json:"error"`
}

type anthropicErrorObj struct {
	Type    string `json:"type"`
	Message string `json:"message"`
}

func (e *APIError) body() anthropicErrorBody {
	return anthropicErrorBody{Type: "error", Error: anthropicErrorObj{Type: e.Type, Message: e.Message}}
}

func invalidRequest(msg string) *APIError {
	return &APIError{Status: http.StatusBadRequest, Type: errInvalidRequest, Message: msg}
}

func authenticationError(msg string) *APIError {
	return &APIError{Status: http.StatusUnauthorized, Type: errAuthentication, Message: msg}
}

func notFound(msg string) *APIError {
	return &APIError{Status: http.StatusNotFound, Type: errNotFound, Message: msg}
}

func upstreamFailure(msg string) *APIError {
	return &APIError{Status: http.StatusBadGateway, Type: errAPI, Message: msg}
}

// errorTypeForStatus maps an HTTP status to the Anthropic error type clients expect.
func errorTypeForStatus(status int) string {
	switch status {
	case http.StatusBadRequest:
		return errInvalidRequest
	case http.StatusUnauthorized:
		return errAuthentication
	case http.StatusForbidden:
		return errPermission
	case http.StatusNotFound:
		return errNotFound
	case http.StatusRequestEntityTooLarge:
		return errRequestTooLarge
	case http.StatusTooManyRequests:
		return errRateLimit
	case http.StatusServiceUnavailable, 529:
		return errOverloaded
	case http.StatusGatewayTimeout:
		return errTimeout
	}
	if status >= 500 {
		return errAPI
	}
	return errInvalidRequest
}

// GatewayError converts a non-2xx gateway response into an Anthropic error. The gateway uses
// {"error":{"code":..,"message":..,"request_id":..}}, but Bedrock-style {"message":..} and
// Anthropic-style bodies are understood too, falling back to the raw body text.
func GatewayError(status int, body []byte) *APIError {
	msg := gatewayErrorMessage(body)
	if msg == "" {
		msg = http.StatusText(status)
	}

	// A 401 that survived a token refresh means the proxy's own OAuth client is misconfigured;
	// surfacing it as a 401 would make clients believe their proxy API key is wrong.
	if status == http.StatusUnauthorized {
		return upstreamFailure("gateway rejected the proxy's OAuth credentials: " + msg)
	}
	return &APIError{Status: status, Type: errorTypeForStatus(status), Message: msg}
}

func gatewayErrorMessage(body []byte) string {
	var parsed struct {
		Message string `json:"message"`
		Error   *struct {
			Message   string `json:"message"`
			RequestID string `json:"request_id"`
		} `json:"error"`
	}
	if err := json.Unmarshal(body, &parsed); err == nil {
		if parsed.Error != nil && parsed.Error.Message != "" {
			if parsed.Error.RequestID != "" {
				return fmt.Sprintf("%s (gateway request_id: %s)", parsed.Error.Message, parsed.Error.RequestID)
			}
			return parsed.Error.Message
		}
		if parsed.Message != "" {
			return parsed.Message
		}
	}
	return strings.TrimSpace(string(bytes.ToValidUTF8(body, nil)))
}

// streamExceptionType maps Bedrock event-stream exception names to Anthropic error types.
func streamExceptionType(exception string) string {
	switch strings.ToLower(exception) {
	case "throttlingexception":
		return errRateLimit
	case "validationexception":
		return errInvalidRequest
	case "serviceunavailableexception":
		return errOverloaded
	case "modeltimeoutexception":
		return errTimeout
	case "accessdeniedexception":
		return errPermission
	}
	return errAPI
}
