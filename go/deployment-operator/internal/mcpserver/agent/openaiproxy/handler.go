package openaiproxy

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/openai/openai-go"
)

var forwardRequestHeaders = []string{
	"Authorization",
	"Content-Type",
	"OpenAI-Organization",
	"OpenAI-Project",
	"X-Request-Id",
}

// HTTPDoer performs outbound HTTP requests. It matches *http.Client.
type HTTPDoer interface {
	Do(req *http.Request) (*http.Response, error)
}

// Config configures the OpenAI chat completion proxy.
type Config struct {
	UpstreamURL string
	Client      HTTPDoer
}

// Handler proxies OpenAI chat completion requests, converting streaming client
// requests into non-streaming upstream calls and re-emitting the response as SSE.
type Handler struct {
	upstreamURL string
	client      HTTPDoer
}

// NewHandler creates a proxy handler.
func NewHandler(cfg Config) (*Handler, error) {
	upstreamURL := strings.TrimSpace(cfg.UpstreamURL)
	if upstreamURL == "" {
		return nil, fmt.Errorf("upstream URL is required")
	}

	client := cfg.Client
	if client == nil {
		client = http.DefaultClient
	}

	return &Handler{
		upstreamURL: upstreamURL,
		client:      client,
	}, nil
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "failed to read request body", http.StatusBadRequest)
		return
	}

	streaming, err := streamingRequested(body)
	if err != nil {
		http.Error(w, "invalid JSON request body", http.StatusBadRequest)
		return
	}

	upstreamBody := body
	if streaming {
		upstreamBody, err = forceNonStreaming(body)
		if err != nil {
			http.Error(w, "invalid JSON request body", http.StatusBadRequest)
			return
		}
	}

	resp, err := h.forward(r, upstreamBody)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, "failed to read upstream response", http.StatusBadGateway)
		return
	}

	if !streaming {
		copyResponse(w, resp, respBody)
		return
	}

	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		copyResponse(w, resp, respBody)
		return
	}

	var completion openai.ChatCompletion
	if err := json.Unmarshal(respBody, &completion); err != nil {
		http.Error(w, "upstream returned non-JSON response for streaming request", http.StatusBadGateway)
		return
	}

	chunks, err := StreamChunksFromCompletion(completion)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming not supported", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	if err := WriteSSE(w, chunks); err != nil {
		return
	}
	flusher.Flush()
}

func (h *Handler) forward(r *http.Request, body []byte) (*http.Response, error) {
	req, err := http.NewRequestWithContext(r.Context(), http.MethodPost, h.upstreamURL, bytes.NewReader(body))
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

	return h.client.Do(req)
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
