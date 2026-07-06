package openaiproxy

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestResponsesHandlerStreamingConvertsToNonStreamingUpstream(t *testing.T) {
	t.Parallel()

	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, err := readRequestBody(r)
		if err != nil {
			t.Fatalf("read upstream body: %v", err)
		}
		if strings.Contains(string(body), `"stream"`) {
			t.Fatalf("expected stream to be removed, got %s", body)
		}

		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"id":"resp_abc",
			"object":"response",
			"created_at":123,
			"status":"completed",
			"model":"gpt-5.4",
			"output":[{
				"type":"message",
				"id":"msg_1",
				"role":"assistant",
				"status":"completed",
				"content":[{
					"type":"output_text",
					"text":"Hello there",
					"annotations":[]
				}]
			}]
		}`))
	}))
	defer upstream.Close()

	handler, err := NewResponsesHandler(ResponsesConfig{UpstreamURL: upstream.URL, Client: &http.Client{}})
	if err != nil {
		t.Fatalf("NewResponsesHandler() failed: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/v1/responses", strings.NewReader(`{"model":"gpt-5.4","input":"hi","stream":true}`))
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

	var first struct {
		Type string `json:"type"`
	}
	if err := json.Unmarshal([]byte(events[0]), &first); err != nil {
		t.Fatalf("decode first event: %v", err)
	}
	if first.Type != "response.created" {
		t.Fatalf("first event type = %q, want response.created", first.Type)
	}

	var combined strings.Builder
	for _, event := range events {
		if event == "[DONE]" {
			continue
		}

		var payload struct {
			Type  string `json:"type"`
			Delta string `json:"delta"`
		}
		if err := json.Unmarshal([]byte(event), &payload); err != nil {
			continue
		}
		if payload.Type == "response.output_text.delta" {
			combined.WriteString(payload.Delta)
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

func TestResponsesHandlerNonStreamingPassthrough(t *testing.T) {
	t.Parallel()

	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"id":"resp_1","object":"response","status":"completed"}`))
	}))
	defer upstream.Close()

	handler, err := NewResponsesHandler(ResponsesConfig{UpstreamURL: upstream.URL, Client: &http.Client{}})
	if err != nil {
		t.Fatalf("NewResponsesHandler() failed: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/v1/responses", strings.NewReader(`{"model":"gpt-5.4","input":"hi","stream":false}`))
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%q", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), `"object":"response"`) {
		t.Fatalf("expected upstream body passthrough, got %q", rec.Body.String())
	}
}

func TestForceNonStreamingResponses(t *testing.T) {
	t.Parallel()

	body, err := forceNonStreamingResponses([]byte(`{
		"model":"gpt-5.4",
		"stream":true,
		"input":[{
			"role":"user",
			"content":[{"type":"input_text","text":"hi"}]
		}]
	}`))
	if err != nil {
		t.Fatalf("forceNonStreamingResponses() failed: %v", err)
	}
	if strings.Contains(string(body), `"stream"`) {
		t.Fatalf("expected stream to be removed, got %s", body)
	}

	var payload struct {
		Input []struct {
			Content json.RawMessage `json:"content"`
		} `json:"input"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		t.Fatalf("unmarshal rewritten body: %v", err)
	}
	if len(payload.Input) != 1 {
		t.Fatalf("input item count = %d, want 1", len(payload.Input))
	}
	if string(payload.Input[0].Content) == "null" || len(payload.Input[0].Content) == 0 {
		t.Fatalf("expected input content to be preserved, got %s", payload.Input[0].Content)
	}
	if !strings.Contains(string(payload.Input[0].Content), `"input_text"`) {
		t.Fatalf("expected input content object to be preserved, got %s", payload.Input[0].Content)
	}
}

func readRequestBody(r *http.Request) ([]byte, error) {
	defer r.Body.Close()
	return io.ReadAll(r.Body)
}
