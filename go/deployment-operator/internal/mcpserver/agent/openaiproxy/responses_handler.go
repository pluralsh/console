package openaiproxy

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/openai/openai-go/responses"
)

// ResponsesConfig configures the OpenAI responses proxy.
type ResponsesConfig struct {
	UpstreamURL string
	Client      HTTPDoer
}

// ResponsesHandler proxies OpenAI responses requests, converting streaming client
// requests into non-streaming upstream calls and re-emitting the response as SSE.
type ResponsesHandler struct {
	upstreamURL string
	client      HTTPDoer
}

// NewResponsesHandler creates a responses proxy handler.
func NewResponsesHandler(cfg ResponsesConfig) (*ResponsesHandler, error) {
	upstreamURL, err := validateUpstreamURL(cfg.UpstreamURL)
	if err != nil {
		return nil, err
	}

	return &ResponsesHandler{
		upstreamURL: upstreamURL,
		client:      newProxyClient(cfg.Client),
	}, nil
}

func (h *ResponsesHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
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
		upstreamBody, err = forceNonStreamingResponses(body)
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

	var response responses.Response
	if err := json.Unmarshal(respBody, &response); err != nil {
		http.Error(w, "upstream returned non-JSON response for streaming request", http.StatusBadGateway)
		return
	}

	events, err := StreamEventsFromResponse(response)
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

	if err := WriteResponseSSE(w, events); err != nil {
		return
	}
	flusher.Flush()
}

// WriteResponseSSE writes OpenAI-compatible SSE events for the given response stream events.
func WriteResponseSSE(w io.Writer, events []json.RawMessage) error {
	for _, payload := range events {
		if _, err := fmt.Fprintf(w, "data: %s\n\n", payload); err != nil {
			return err
		}
	}

	if _, err := io.WriteString(w, "data: [DONE]\n\n"); err != nil {
		return err
	}

	return nil
}
