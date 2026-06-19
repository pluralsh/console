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
