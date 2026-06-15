package openaiproxy

import (
	"bufio"
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/openai/openai-go"
	"github.com/openai/openai-go/packages/param"
)

func TestHandlerNonStreamingPassthrough(t *testing.T) {
	t.Parallel()

	var gotBody []byte

	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		if err != nil {
			t.Fatalf("read upstream body: %v", err)
		}
		gotBody = body

		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-Upstream", "ok")
		_, _ = w.Write([]byte(`{"id":"chatcmpl-1","object":"chat.completion","choices":[]}`))
	}))
	defer upstream.Close()

	handler, err := NewHandler(Config{
		UpstreamURL: upstream.URL,
		Client:      &http.Client{},
	})
	if err != nil {
		t.Fatalf("NewHandler() failed: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/v1/chat/completions", strings.NewReader(`{"model":"gpt-4","messages":[{"role":"user","content":"hi"}],"stream":false}`))
	req.Header.Set("Authorization", "Bearer test-token")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%q", rec.Code, rec.Body.String())
	}
	if !bytes.Contains(gotBody, []byte(`"stream":false`)) {
		t.Fatalf("expected stream=false in upstream body, got %s", gotBody)
	}
	if rec.Header().Get("X-Upstream") != "ok" {
		t.Fatalf("expected upstream header passthrough, got %q", rec.Header().Get("X-Upstream"))
	}
	if !strings.Contains(rec.Body.String(), `"object":"chat.completion"`) {
		t.Fatalf("expected upstream body passthrough, got %q", rec.Body.String())
	}
}

func TestHandlerStreamingConvertsToNonStreamingUpstream(t *testing.T) {
	t.Parallel()

	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		if err != nil {
			t.Fatalf("read upstream body: %v", err)
		}

		var req openai.ChatCompletionNewParams
		if err := json.Unmarshal(body, &req); err != nil {
			t.Fatalf("unmarshal upstream body: %v", err)
		}
		if !param.IsOmitted(req.StreamOptions) {
			t.Fatal("expected stream_options to be removed")
		}
		if strings.Contains(string(body), `"stream"`) {
			t.Fatalf("expected stream to be removed, got %s", body)
		}

		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"id":"chatcmpl-abc",
			"object":"chat.completion",
			"created":123,
			"model":"gpt-4",
			"choices":[{
				"index":0,
				"message":{"role":"assistant","content":"Hello there"},
				"finish_reason":"stop"
			}]
		}`))
	}))
	defer upstream.Close()

	handler, err := NewHandler(Config{UpstreamURL: upstream.URL, Client: &http.Client{}})
	if err != nil {
		t.Fatalf("NewHandler() failed: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/v1/chat/completions", strings.NewReader(`{"model":"gpt-4","messages":[{"role":"user","content":"hi"}],"stream":true,"stream_options":{"include_usage":true}}`))
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%q", rec.Code, rec.Body.String())
	}
	if got := rec.Header().Get("Content-Type"); !strings.Contains(got, "text/event-stream") {
		t.Fatalf("content-type = %q, want text/event-stream", got)
	}

	events := parseSSE(rec.Body.String())
	if len(events) < 3 {
		t.Fatalf("expected at least 3 SSE events, got %d: %v", len(events), events)
	}

	var first openai.ChatCompletionChunk
	if err := json.Unmarshal([]byte(events[0]), &first); err != nil {
		t.Fatalf("decode first chunk: %v", err)
	}
	if first.Choices[0].Delta.Role != "assistant" {
		t.Fatalf("first chunk role = %q, want assistant", first.Choices[0].Delta.Role)
	}

	var combined strings.Builder
	for _, event := range events {
		if event == "[DONE]" {
			continue
		}

		var chunk openai.ChatCompletionChunk
		if err := json.Unmarshal([]byte(event), &chunk); err != nil {
			continue
		}
		if chunk.Choices[0].Delta.Content != "" {
			combined.WriteString(chunk.Choices[0].Delta.Content)
		}
	}
	if combined.String() != "Hello there" {
		t.Fatalf("streamed content = %q, want %q", combined.String(), "Hello there")
	}

	lastEvent := events[len(events)-1]
	if lastEvent != "[DONE]" {
		t.Fatalf("expected final [DONE] event, got %q", lastEvent)
	}
}

func TestHandlerStreamingPropagatesUpstreamError(t *testing.T) {
	t.Parallel()

	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":{"message":"bad model","type":"invalid_request_error"}}`))
	}))
	defer upstream.Close()

	handler, err := NewHandler(Config{UpstreamURL: upstream.URL, Client: &http.Client{}})
	if err != nil {
		t.Fatalf("NewHandler() failed: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/v1/chat/completions", strings.NewReader(`{"model":"bad","messages":[],"stream":true}`))
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "bad model") {
		t.Fatalf("expected upstream error body, got %q", rec.Body.String())
	}
}

func TestHandlerMethodNotAllowed(t *testing.T) {
	t.Parallel()

	handler, err := NewHandler(Config{UpstreamURL: "http://example.com/v1/chat/completions"})
	if err != nil {
		t.Fatalf("NewHandler() failed: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/v1/chat/completions", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("status = %d, want 405", rec.Code)
	}
}

func TestHandlerForwardsAuthorizationHeader(t *testing.T) {
	t.Parallel()

	var gotAuth string
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("Authorization")
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"id":"x","object":"chat.completion","choices":[]}`))
	}))
	defer upstream.Close()

	handler, err := NewHandler(Config{UpstreamURL: upstream.URL, Client: &http.Client{}})
	if err != nil {
		t.Fatalf("NewHandler() failed: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/v1/chat/completions", strings.NewReader(`{"model":"gpt-4","messages":[]}`))
	req.Header.Set("Authorization", "Bearer upstream-token")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if gotAuth != "Bearer upstream-token" {
		t.Fatalf("authorization = %q, want Bearer upstream-token", gotAuth)
	}
}

func TestStreamChunksFromCompletionToolCalls(t *testing.T) {
	t.Parallel()

	chunks, err := StreamChunksFromCompletion(openai.ChatCompletion{
		ID:      "chatcmpl-tool",
		Created: 1,
		Model:   "gpt-4",
		Choices: []openai.ChatCompletionChoice{{
			Index: 0,
			Message: openai.ChatCompletionMessage{
				Role: "assistant",
				ToolCalls: []openai.ChatCompletionMessageToolCall{{
					ID:   "call_1",
					Type: "function",
					Function: openai.ChatCompletionMessageToolCallFunction{
						Name:      "lookup",
						Arguments: `{"q":"weather"}`,
					},
				}},
			},
			FinishReason: "tool_calls",
		}},
	})
	if err != nil {
		t.Fatalf("StreamChunksFromCompletion() failed: %v", err)
	}

	foundToolName := false
	foundArguments := false
	for _, chunk := range chunks {
		if len(chunk.Choices) == 0 || len(chunk.Choices[0].Delta.ToolCalls) == 0 {
			continue
		}
		call := chunk.Choices[0].Delta.ToolCalls[0]
		if call.Function.Name == "lookup" {
			foundToolName = true
		}
		if call.Function.Arguments == `{"q":"weather"}` {
			foundArguments = true
		}
	}

	if !foundToolName {
		t.Fatal("expected tool call name chunk")
	}
	if !foundArguments {
		t.Fatal("expected tool call arguments chunk")
	}
}

func TestForceNonStreaming(t *testing.T) {
	t.Parallel()

	body, err := forceNonStreaming([]byte(`{"model":"gpt-4","stream":true,"stream_options":{"include_usage":true},"max_tokens":100}`))
	if err != nil {
		t.Fatalf("forceNonStreaming() failed: %v", err)
	}

	var params openai.ChatCompletionNewParams
	if err := json.Unmarshal(body, &params); err != nil {
		t.Fatalf("unmarshal payload: %v", err)
	}
	if !param.IsOmitted(params.StreamOptions) {
		t.Fatal("expected stream_options to be removed")
	}
	if params.MaxTokens.Value != 100 {
		t.Fatalf("max_tokens = %d, want 100", params.MaxTokens.Value)
	}
	if strings.Contains(string(body), `"stream"`) {
		t.Fatalf("expected stream to be removed, got %s", body)
	}
}

func parseSSE(body string) []string {
	scanner := bufio.NewScanner(strings.NewReader(body))
	var events []string

	for scanner.Scan() {
		line := scanner.Text()
		if !strings.HasPrefix(line, "data: ") {
			continue
		}
		events = append(events, strings.TrimPrefix(line, "data: "))
	}

	return events
}
