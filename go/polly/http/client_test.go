package http

import (
	"bytes"
	"compress/gzip"
	"fmt"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// roundTripFunc is an adapter that allows using a plain function as an http.RoundTripper.
type roundTripFunc func(req *http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	resp, err := f(req)
	// Mirror what net/http's real transport does: attach the originating request
	// to the response so that retry logic can inspect resp.Request.Method.
	if resp != nil && resp.Request == nil {
		resp.Request = req
	}
	return resp, err
}

// makeResponse builds a minimal *http.Response with the given status code and body.
func makeResponse(statusCode int, body string) *http.Response {
	return &http.Response{
		StatusCode: statusCode,
		Header:     make(http.Header),
		Body:       io.NopCloser(strings.NewReader(body)),
	}
}

// newTestClient creates a retryable client with fast retries for testing.
func newTestClient(transport http.RoundTripper) *http.Client {
	return newRetryableClient(transport, 10, 1*time.Millisecond, 5*time.Millisecond)
}

// TestTokenTransport_SetsAuthHeader verifies that the Authorization header is set correctly.
func TestTokenTransport_SetsAuthHeader(t *testing.T) {
	var capturedHeader string
	transport := &tokenTransport{
		token: "my-token",
		wrapped: roundTripFunc(func(req *http.Request) (*http.Response, error) {
			capturedHeader = req.Header.Get("Authorization")
			return makeResponse(http.StatusOK, `{"data":{}}`), nil
		}),
	}

	req, err := http.NewRequest(http.MethodPost, "http://example.com/graphql", nil)
	require.NoError(t, err)

	resp, err := transport.RoundTrip(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, "Token my-token", capturedHeader)
}

// TestTokenTransport_SetsAcceptEncodingHeader verifies that the Accept-Encoding header is set.
func TestTokenTransport_SetsAcceptEncodingHeader(t *testing.T) {
	var capturedHeader string
	transport := &tokenTransport{
		token: "test-token",
		wrapped: roundTripFunc(func(req *http.Request) (*http.Response, error) {
			capturedHeader = req.Header.Get("Accept-Encoding")
			return makeResponse(http.StatusOK, `{}`), nil
		}),
	}

	req, err := http.NewRequest(http.MethodPost, "http://example.com/graphql", nil)
	require.NoError(t, err)

	resp, err := transport.RoundTrip(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, "gzip", capturedHeader)
}

// TestTokenTransport_SuccessOnFirstAttempt verifies that a 200 response is returned immediately.
func TestTokenTransport_SuccessOnFirstAttempt(t *testing.T) {
	transport := &tokenTransport{
		token: "tok",
		wrapped: roundTripFunc(func(req *http.Request) (*http.Response, error) {
			return makeResponse(http.StatusOK, `{"data":"ok"}`), nil
		}),
	}

	req, err := http.NewRequest(http.MethodPost, "http://example.com/graphql",
		io.NopCloser(strings.NewReader(`{"query":"{ hello }"}`)))
	require.NoError(t, err)

	resp, err := transport.RoundTrip(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	body, _ := io.ReadAll(resp.Body)
	assert.Equal(t, `{"data":"ok"}`, string(body))
}

// TestClient_RetriesOn500 verifies that the client retries on a 500 response
// and eventually succeeds once the server recovers.
func TestClient_RetriesOn500(t *testing.T) {
	callCount := 0
	transport := roundTripFunc(func(req *http.Request) (*http.Response, error) {
		callCount++
		if callCount < 3 {
			return makeResponse(http.StatusInternalServerError, "error"), nil
		}
		return makeResponse(http.StatusOK, `{"data":"recovered"}`), nil
	})

	client := newTestClient(transport)
	req, err := http.NewRequest(http.MethodGet, "http://example.com/graphql", nil)
	require.NoError(t, err)

	resp, err := client.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Equal(t, 3, callCount)
}

// TestClient_RetriesReplayBody verifies that the request body is correctly replayed
// on each retry attempt.
func TestClient_RetriesReplayBody(t *testing.T) {
	var receivedBodies []string
	callCount := 0
	transport := roundTripFunc(func(req *http.Request) (*http.Response, error) {
		callCount++
		b, _ := io.ReadAll(req.Body)
		receivedBodies = append(receivedBodies, string(b))
		if callCount < 2 {
			return makeResponse(http.StatusInternalServerError, "error"), nil
		}
		return makeResponse(http.StatusOK, `{}`), nil
	})

	payload := `{"query":"{ ping }"}`
	client := newTestClient(transport)
	req, err := http.NewRequest(http.MethodGet, "http://example.com/graphql",
		io.NopCloser(strings.NewReader(payload)))
	require.NoError(t, err)

	resp, err := client.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, 2, callCount)
	for i, body := range receivedBodies {
		assert.Equal(t, payload, body, "body mismatch on attempt %d", i+1)
	}
}

// TestClient_ExhaustsRetriesOn500 verifies that an error is returned after all retries
// are exhausted when the server keeps returning 500.
func TestClient_ExhaustsRetriesOn500(t *testing.T) {
	callCount := 0
	transport := roundTripFunc(func(req *http.Request) (*http.Response, error) {
		callCount++
		return makeResponse(http.StatusInternalServerError, "always failing"), nil
	})

	client := newTestClient(transport)
	req, err := http.NewRequest(http.MethodGet, "http://example.com/graphql", nil)
	require.NoError(t, err)

	resp, err := client.Do(req)
	assert.Error(t, err)
	assert.Nil(t, resp)
	assert.ErrorContains(t, err, "500")
	assert.Greater(t, callCount, 1, "expected more than one attempt")
}

// TestClient_RetriesOnTransportError verifies that network level errors are retried.
func TestClient_RetriesOnTransportError(t *testing.T) {
	callCount := 0
	transport := roundTripFunc(func(req *http.Request) (*http.Response, error) {
		callCount++
		if callCount < 3 {
			return nil, fmt.Errorf("connection refused")
		}
		return makeResponse(http.StatusOK, `{}`), nil
	})

	client := newTestClient(transport)
	req, err := http.NewRequest(http.MethodGet, "http://example.com/graphql", nil)
	require.NoError(t, err)

	resp, err := client.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Equal(t, 3, callCount)
}

// TestTokenTransport_DecodesGzipResponse verifies that a gzip encoded response body
// is transparently decoded and the Content-Encoding header is removed.
func TestTokenTransport_DecodesGzipResponse(t *testing.T) {
	plaintext := `{"data":"hello"}`

	var gzipped bytes.Buffer
	gz := gzip.NewWriter(&gzipped)
	_, err := gz.Write([]byte(plaintext))
	require.NoError(t, err)
	require.NoError(t, gz.Close())

	transport := &tokenTransport{
		token: "tok",
		wrapped: roundTripFunc(func(req *http.Request) (*http.Response, error) {
			resp := &http.Response{
				StatusCode: http.StatusOK,
				Header:     make(http.Header),
				Body:       io.NopCloser(bytes.NewReader(gzipped.Bytes())),
			}
			resp.Header.Set("Content-Encoding", "gzip")
			return resp, nil
		}),
	}

	req, err := http.NewRequest(http.MethodGet, "http://example.com/graphql", nil)
	require.NoError(t, err)

	resp, err := transport.RoundTrip(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Empty(t, resp.Header.Get("Content-Encoding"), "Content-Encoding header should be removed")

	body, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	assert.Equal(t, plaintext, string(body))
}

// TestClient_NonRetryable4xx verifies that 4xx responses are returned immediately
// without any retry.
func TestClient_NonRetryable4xx(t *testing.T) {
	callCount := 0
	transport := roundTripFunc(func(req *http.Request) (*http.Response, error) {
		callCount++
		return makeResponse(http.StatusUnauthorized, "unauthorized"), nil
	})

	client := newTestClient(transport)
	req, err := http.NewRequest(http.MethodPost, "http://example.com/graphql", nil)
	require.NoError(t, err)

	resp, err := client.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	assert.Equal(t, 1, callCount, "4xx should not be retried")
}

// TestClient_DoesNotMutateCallerHeaders verifies that the caller's original request
// headers are not modified after Do returns, even across multiple retry attempts.
func TestClient_DoesNotMutateCallerHeaders(t *testing.T) {
	callCount := 0
	transport := roundTripFunc(func(req *http.Request) (*http.Response, error) {
		callCount++
		if callCount < 2 {
			return makeResponse(http.StatusInternalServerError, "error"), nil
		}
		return makeResponse(http.StatusOK, `{}`), nil
	})

	client := newTestClient(transport)
	req, err := http.NewRequest(http.MethodGet, "http://example.com/graphql", nil)
	require.NoError(t, err)
	req.Header.Set("X-Custom", "original")

	resp, err := client.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	// Authorization and Accept-Encoding must not leak onto the original request.
	assert.Empty(t, req.Header.Get("Authorization"), "caller's request must not gain Authorization header")
	assert.Empty(t, req.Header.Get("Accept-Encoding"), "caller's request must not gain Accept-Encoding header")
	// Pre-existing headers must be preserved.
	assert.Equal(t, "original", req.Header.Get("X-Custom"))
	// Must not contain duplicate values after multiple attempts.
	assert.Len(t, req.Header["X-Custom"], 1)
}

// TestClient_Post500NotRetried verifies that a 500 from a non-idempotent method
// (POST) is returned immediately as a permanent error without any retry.
func TestClient_Post500NotRetried(t *testing.T) {
	callCount := 0
	transport := roundTripFunc(func(req *http.Request) (*http.Response, error) {
		callCount++
		return makeResponse(http.StatusInternalServerError, "error"), nil
	})

	client := newTestClient(transport)
	req, err := http.NewRequest(http.MethodPost, "http://example.com/graphql",
		io.NopCloser(strings.NewReader(`{"query":"{ ping }"}`)))
	require.NoError(t, err)

	resp, err := client.Do(req)
	assert.Error(t, err)
	assert.Nil(t, resp)
	assert.ErrorContains(t, err, "500")
	assert.Equal(t, 1, callCount, "POST 500 must not be retried")
}

// TestNewHttpClient verifies that NewHttpClient returns a properly configured client.
func TestNewHttpClient(t *testing.T) {
	client := NewHttpClient("my-token")
	require.NotNil(t, client)
	require.NotNil(t, client.Transport)
}
