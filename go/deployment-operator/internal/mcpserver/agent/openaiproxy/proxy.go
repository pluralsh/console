package openaiproxy

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

func forwardRequest(client HTTPDoer, upstreamURL string, r *http.Request, body []byte) (*http.Response, error) {
	req, err := http.NewRequestWithContext(r.Context(), http.MethodPost, upstreamURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create upstream request: %w", err)
	}

	for _, header := range forwardRequestHeaders {
		if value := r.Header.Get(header); value != "" {
			req.Header.Set(header, value)
		}
	}

	if req.Header.Get("Content-Type") == "" {
		req.Header.Set("Content-Type", "application/json")
	}

	return client.Do(req)
}

func copyResponse(w http.ResponseWriter, resp *http.Response, body []byte) {
	for key, values := range resp.Header {
		for _, value := range values {
			w.Header().Add(key, value)
		}
	}

	w.WriteHeader(resp.StatusCode)
	_, _ = w.Write(body)
}

func readUpstreamResponse(resp *http.Response) ([]byte, error) {
	defer resp.Body.Close()
	return io.ReadAll(resp.Body)
}

func newProxyClient(client HTTPDoer) HTTPDoer {
	if client == nil {
		return http.DefaultClient
	}
	return client
}

func validateUpstreamURL(upstreamURL string) (string, error) {
	upstreamURL = strings.TrimSpace(upstreamURL)
	if upstreamURL == "" {
		return "", fmt.Errorf("upstream URL is required")
	}
	return upstreamURL, nil
}

func removeTopLevelJSONFields(body []byte, fields ...string) ([]byte, error) {
	var payload map[string]json.RawMessage
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, err
	}

	for _, field := range fields {
		delete(payload, field)
	}

	return json.Marshal(payload)
}
