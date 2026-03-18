package http

import (
	"compress/gzip"
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/hashicorp/go-retryablehttp"
)

type tokenTransport struct {
	token   string
	wrapped http.RoundTripper
}

func (t *tokenTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	// Clone so we never mutate the caller's request.
	attempt := req.Clone(req.Context())
	attempt.Header.Set("Authorization", "Token "+t.token)
	attempt.Header.Set("Accept-Encoding", "gzip")

	resp, err := t.wrapped.RoundTrip(attempt)
	if err != nil {
		return nil, err
	}

	// Transparently decompress gzip responses.
	if resp.Header.Get("Content-Encoding") == "gzip" {
		gr, err := gzip.NewReader(resp.Body)
		if err != nil {
			_ = resp.Body.Close()
			return nil, err
		}
		resp.Body = gr
		resp.Header.Del("Content-Encoding")
	}

	return resp, nil
}

// checkRetry mirrors the original retry policy:
//   - transport errors → retry
//   - 5xx + GET/HEAD   → retry (returns error on exhaustion)
//   - 5xx + other      → immediate permanent error
//   - everything else  → no retry
func checkRetry(ctx context.Context, resp *http.Response, err error) (bool, error) {
	if ctx.Err() != nil {
		return false, ctx.Err()
	}

	if err != nil {
		return true, err
	}

	if resp.StatusCode >= 500 {
		statusErr := fmt.Errorf("server returned status %d", resp.StatusCode)
		if resp.Request == nil || (resp.Request.Method != http.MethodGet && resp.Request.Method != http.MethodHead) {
			return false, statusErr // non-idempotent: fail immediately
		}
		return true, statusErr // idempotent: keep retrying
	}

	return false, nil
}

// errorHandler ensures a nil response is returned alongside any error so
// callers never have to deal with a (non-nil resp, non-nil err) pair.
func errorHandler(resp *http.Response, err error, _ int) (*http.Response, error) {
	if resp != nil {
		_ = resp.Body.Close()
	}
	return nil, err
}

// newRetryableClient is the testable constructor; tests pass small wait values.
func newRetryableClient(transport http.RoundTripper, retryMax int, retryWaitMin, retryWaitMax time.Duration) *http.Client {
	rc := retryablehttp.NewClient()
	rc.RetryMax = retryMax
	rc.RetryWaitMin = retryWaitMin
	rc.RetryWaitMax = retryWaitMax
	rc.CheckRetry = checkRetry
	rc.ErrorHandler = errorHandler
	rc.HTTPClient = &http.Client{Transport: transport}
	return rc.StandardClient()
}

func NewHttpClient(token string) *http.Client {
	transport := &tokenTransport{token: token, wrapped: http.DefaultTransport}
	return newRetryableClient(transport, 10, 500*time.Millisecond, 10*time.Second)
}
