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

	if t.newBackoff == nil {
		t.newBackoff = defaultBackoff
	}

	var resp *http.Response

	operation := func() error {
		// Reset the body for each attempt.
		if bodyBytes != nil {
			req.Body = io.NopCloser(bytes.NewReader(bodyBytes))
		}

		// Set auth header.
		req.Header.Set("Authorization", "Token "+t.token)

		// Set Accept-Encoding to support gzip response.
		req.Header.Set("Accept-Encoding", "gzip")

		var err error
		resp, err = t.wrapped.RoundTrip(req)
		if err != nil {
			// Retry on transport-level errors.
			return err
		}

		// Retry on 5xx server errors.
		if resp.StatusCode >= 500 {
			statusCode := resp.StatusCode
			_ = resp.Body.Close()
			resp = nil
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

	if err := backoff.Retry(operation, t.newBackoff()); err != nil {
		return nil, err
	}

	return resp, nil
}

func NewHttpClient(token string) *http.Client {
	return &http.Client{Transport: &authedTransport{token: token, wrapped: http.DefaultTransport}}
}
