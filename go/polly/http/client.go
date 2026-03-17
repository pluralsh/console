package http

import (
	"bytes"
	"compress/gzip"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/cenkalti/backoff"
)

type authedTransport struct {
	token      string
	wrapped    http.RoundTripper
	newBackoff func() backoff.BackOff
}

func defaultBackoff() backoff.BackOff {
	b := backoff.NewExponentialBackOff()
	b.InitialInterval = 500 * time.Millisecond
	b.MaxInterval = 10 * time.Second
	b.MaxElapsedTime = 60 * time.Second
	return b
}

func (t *authedTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	// Buffer the body for the retry.
	var bodyBytes []byte
	if req.Body != nil {
		var err error
		bodyBytes, err = io.ReadAll(req.Body)
		if err != nil {
			return nil, err
		}
		_ = req.Body.Close()
	}

	newBackoff := t.newBackoff
	if newBackoff == nil {
		newBackoff = defaultBackoff
	}

	var resp *http.Response

	operation := func() error {
		// Clone the request so we never mutate the caller's original.
		attempt := req.Clone(req.Context())

		// Reset the body for each attempt.
		if bodyBytes != nil {
			attempt.Body = io.NopCloser(bytes.NewReader(bodyBytes))
		}

		// Set headers on the clone only.
		attempt.Header.Set("Authorization", "Token "+t.token)
		attempt.Header.Set("Accept-Encoding", "gzip")

		var err error
		resp, err = t.wrapped.RoundTrip(attempt)
		if err != nil {
			// Retry on transport-level errors.
			return err
		}

		// Retry on 5xx server errors only for idempotent methods.
		if resp.StatusCode >= 500 {
			statusCode := resp.StatusCode
			_ = resp.Body.Close()
			resp = nil
			if req.Method != http.MethodGet && req.Method != http.MethodHead {
				return backoff.Permanent(fmt.Errorf("server returned status %d", statusCode))
			}
			return fmt.Errorf("server returned status %d", statusCode)
		}

		// If the response is gzipped, wrap it with a gzip reader.
		if resp.Header.Get("Content-Encoding") == "gzip" {
			resp.Body, err = gzip.NewReader(resp.Body)
			if err != nil {
				return backoff.Permanent(err)
			}
			// Remove the header so downstream code doesn't try to decompress again.
			resp.Header.Del("Content-Encoding")
		}

		return nil
	}

	if err := backoff.Retry(operation, newBackoff()); err != nil {
		return nil, err
	}

	return resp, nil
}

func NewHttpClient(token string) *http.Client {
	return &http.Client{Transport: &authedTransport{token: token, wrapped: http.DefaultTransport}}
}
