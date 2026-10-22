package proxy

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestGatewayError(t *testing.T) {
	cases := map[string]struct {
		status   int
		body     string
		wantCode int
		wantType string
		wantMsg  string
	}{
		"gateway format": {
			status: 400, body: `{"error":{"code":400,"message":"json: unknown field \"modelId\"","request_id":"bcd/1"}}`,
			wantCode: 400, wantType: "invalid_request_error", wantMsg: `json: unknown field "modelId" (gateway request_id: bcd/1)`,
		},
		"bedrock format": {
			status: 429, body: `{"message":"Too many requests"}`,
			wantCode: 429, wantType: "rate_limit_error", wantMsg: "Too many requests",
		},
		"plain text": {
			status: 503, body: "upstream connect error\n",
			wantCode: 503, wantType: "overloaded_error", wantMsg: "upstream connect error",
		},
		"empty body": {
			status: 404, body: "",
			wantCode: 404, wantType: "not_found_error", wantMsg: "Not Found",
		},
		"forbidden": {
			status: 403, body: `{"error":{"code":403,"message":"model not enabled"}}`,
			wantCode: 403, wantType: "permission_error", wantMsg: "model not enabled",
		},
		"unauthorized becomes bad gateway": {
			status: 401, body: `{"error":{"code":401,"message":"expired"}}`,
			wantCode: 502, wantType: "api_error", wantMsg: "gateway rejected the proxy's OAuth credentials: expired",
		},
		"server error": {
			status: 500, body: `{"error":{"code":500,"message":"Internal Server Error"}}`,
			wantCode: 500, wantType: "api_error", wantMsg: "Internal Server Error",
		},
		"timeout": {
			status: 504, body: ``,
			wantCode: 504, wantType: "timeout_error", wantMsg: "Gateway Timeout",
		},
	}
	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			err := GatewayError(tc.status, []byte(tc.body))
			assert.Equal(t, tc.wantCode, err.Status)
			assert.Equal(t, tc.wantType, err.Type)
			assert.Equal(t, tc.wantMsg, err.Message)
		})
	}
}

func TestErrorTypeForStatus(t *testing.T) {
	assert.Equal(t, "request_too_large", errorTypeForStatus(http.StatusRequestEntityTooLarge))
	assert.Equal(t, "overloaded_error", errorTypeForStatus(529))
	assert.Equal(t, "api_error", errorTypeForStatus(502))
	assert.Equal(t, "invalid_request_error", errorTypeForStatus(422))
}

func TestStreamExceptionType(t *testing.T) {
	assert.Equal(t, "rate_limit_error", streamExceptionType("throttlingException"))
	assert.Equal(t, "invalid_request_error", streamExceptionType("validationException"))
	assert.Equal(t, "overloaded_error", streamExceptionType("serviceUnavailableException"))
	assert.Equal(t, "api_error", streamExceptionType("modelStreamErrorException"))
}
