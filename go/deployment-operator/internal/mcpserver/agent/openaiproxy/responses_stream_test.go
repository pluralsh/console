package openaiproxy

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/openai/openai-go/responses"
)

func TestStreamEventsFromResponseTextMessage(t *testing.T) {
	t.Parallel()

	var response responses.Response
	if err := json.Unmarshal([]byte(`{
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
	}`), &response); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}

	events, err := StreamEventsFromResponse(response)
	if err != nil {
		t.Fatalf("StreamEventsFromResponse() failed: %v", err)
	}
	if len(events) < 5 {
		t.Fatalf("expected at least 5 events, got %d", len(events))
	}

	firstRaw := events[0]
	if !strings.Contains(string(firstRaw), `"type":"response.created"`) {
		t.Fatalf("expected response.created first, got %s", firstRaw)
	}

	lastRaw := events[len(events)-1]
	if !strings.Contains(string(lastRaw), `"type":"response.completed"`) {
		t.Fatalf("expected response.completed last, got %s", lastRaw)
	}

	foundDelta := false
	for _, event := range events {
		if strings.Contains(string(event), `"type":"response.output_text.delta"`) {
			foundDelta = true
			if !strings.Contains(string(event), `"delta":"Hello there"`) {
				t.Fatalf("expected delta text in event, got %s", event)
			}
		}
	}
	if !foundDelta {
		t.Fatal("expected response.output_text.delta event")
	}
}

// Codex sends function calls back as input, and the API rejects them without the namespace the model
// gave them, so every event must carry the item as Console sent it.
func TestStreamEventsFromResponseKeepsFunctionCallAsSent(t *testing.T) {
	t.Parallel()

	var response responses.Response
	if err := json.Unmarshal([]byte(`{
		"id":"resp_abc",
		"object":"response",
		"created_at":123,
		"status":"completed",
		"model":"gpt-5.4",
		"output":[{
			"type":"function_call",
			"id":"fc_1",
			"call_id":"call_1",
			"name":"updateAgentRunAnalysis",
			"namespace":"plural",
			"arguments":"{}",
			"status":"completed"
		}]
	}`), &response); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}

	events, err := StreamEventsFromResponse(response)
	if err != nil {
		t.Fatalf("StreamEventsFromResponse() failed: %v", err)
	}

	wantStatus := map[string]string{
		"response.output_item.added": "in_progress",
		"response.output_item.done":  "completed",
		"response.completed":         "completed",
	}
	seen := map[string]bool{}
	for _, raw := range events {
		var event struct {
			Type     string         `json:"type"`
			Item     map[string]any `json:"item"`
			Response struct {
				Output []map[string]any `json:"output"`
			} `json:"response"`
		}
		if err := json.Unmarshal(raw, &event); err != nil {
			t.Fatalf("unmarshal event: %v", err)
		}
		want, ok := wantStatus[event.Type]
		if !ok {
			continue
		}
		item := event.Item
		if event.Type == "response.completed" {
			if len(event.Response.Output) != 1 {
				t.Fatalf("completed output = %v", event.Response.Output)
			}
			item = event.Response.Output[0]
		}
		seen[event.Type] = true

		if item["namespace"] != "plural" || item["name"] != "updateAgentRunAnalysis" || item["call_id"] != "call_1" {
			t.Errorf("%s item = %v, want the function call as sent", event.Type, item)
		}
		if item["status"] != want {
			t.Errorf("%s status = %v, want %s", event.Type, item["status"], want)
		}
		for _, field := range []string{"role", "content", "queries", "action"} {
			if _, ok := item[field]; ok {
				t.Errorf("%s item has %q, which Console did not send", event.Type, field)
			}
		}
	}
	for eventType := range wantStatus {
		if !seen[eventType] {
			t.Errorf("missing %s event", eventType)
		}
	}
}
