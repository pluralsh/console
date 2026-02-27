package http

import (
	"compress/gzip"
	"net/http"
)

type authedTransport struct {
	token   string
	wrapped http.RoundTripper
}

func (t *authedTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	// Set auth header
	req.Header.Set("Authorization", "Token "+t.token)

	// Set Accept-Encoding to support gzip response
	req.Header.Set("Accept-Encoding", "gzip")

	// Do the request
	resp, err := t.wrapped.RoundTrip(req)
	if err != nil {
		return nil, err
	}

	// If the response is gzipped, wrap it with a gzip reader
	if resp.Header.Get("Content-Encoding") == "gzip" {
		resp.Body, err = gzip.NewReader(resp.Body)
		if err != nil {
			return nil, err
		}
		// You may also want to delete the gzip header so downstream code doesn't try to decompress again
		resp.Header.Del("Content-Encoding")
	}

	return resp, nil
}

func NewHttpClient(token string) *http.Client {
	return &http.Client{Transport: &authedTransport{token: token, wrapped: http.DefaultTransport}}
}
