package openaiproxy

import (
	"encoding/json"
	"io"
	"net/http"

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
	upstreamURL, err := validateUpstreamURL(cfg.UpstreamURL)
	if err != nil {
		return nil, err
	}

	return &Handler{
		upstreamURL: upstreamURL,
		client:      newProxyClient(cfg.Client),
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

	resp, err := forwardRequest(h.client, h.upstreamURL, r, upstreamBody)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}

	respBody, err := readUpstreamResponse(resp)
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
