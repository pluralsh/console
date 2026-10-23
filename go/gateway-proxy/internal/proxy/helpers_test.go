package proxy

import (
	"bufio"
	"encoding/json"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

type sseEvent struct {
	Name string
	Data map[string]any
}

func parseSSE(t *testing.T, body string) []sseEvent {
	t.Helper()
	var events []sseEvent
	var cur sseEvent
	scanner := bufio.NewScanner(strings.NewReader(body))
	scanner.Buffer(make([]byte, 1<<20), 1<<24)
	for scanner.Scan() {
		line := scanner.Text()
		switch {
		case strings.HasPrefix(line, "event: "):
			cur.Name = strings.TrimPrefix(line, "event: ")
		case strings.HasPrefix(line, "data: "):
			require.NoError(t, json.Unmarshal([]byte(strings.TrimPrefix(line, "data: ")), &cur.Data), line)
		case line == "" && cur.Name != "":
			require.Equal(t, cur.Name, cur.Data["type"], "event name must match data.type")
			events = append(events, cur)
			cur = sseEvent{}
		}
	}
	require.NoError(t, scanner.Err())
	return events
}

func eventNames(events []sseEvent) []string {
	names := make([]string, len(events))
	for i, e := range events {
		names[i] = e.Name
	}
	return names
}

// accumulate rebuilds the final message from stream events the way Anthropic SDKs do.
func accumulate(t *testing.T, events []sseEvent) map[string]any {
	t.Helper()
	var msg map[string]any
	var content []map[string]any
	partialJSON := map[int]string{}

	for _, ev := range events {
		switch ev.Name {
		case "message_start":
			msg = ev.Data["message"].(map[string]any)
		case "content_block_start":
			idx := int(ev.Data["index"].(float64))
			require.Equal(t, len(content), idx, "blocks start in order")
			content = append(content, ev.Data["content_block"].(map[string]any))
		case "content_block_delta":
			idx := int(ev.Data["index"].(float64))
			block := content[idx]
			delta := ev.Data["delta"].(map[string]any)
			switch delta["type"] {
			case "text_delta":
				block["text"] = block["text"].(string) + delta["text"].(string)
			case "input_json_delta":
				partialJSON[idx] += delta["partial_json"].(string)
			case "thinking_delta":
				block["thinking"] = block["thinking"].(string) + delta["thinking"].(string)
			case "signature_delta":
				block["signature"] = delta["signature"]
			case "citations_delta":
				citations, _ := block["citations"].([]any)
				block["citations"] = append(citations, delta["citation"])
			default:
				t.Fatalf("unexpected delta type %v", delta["type"])
			}
		case "content_block_stop":
			idx := int(ev.Data["index"].(float64))
			if raw, ok := partialJSON[idx]; ok {
				var input any
				require.NoError(t, json.Unmarshal([]byte(raw), &input))
				content[idx]["input"] = input
			}
		case "message_delta":
			delta := ev.Data["delta"].(map[string]any)
			msg["stop_reason"] = delta["stop_reason"]
			msg["stop_sequence"] = delta["stop_sequence"]
			msg["usage"] = ev.Data["usage"]
		case "message_stop", "ping":
		case "error":
			t.Fatalf("unexpected error event: %v", ev.Data)
		}
	}

	require.NotNil(t, msg, "stream had no message_start")
	blocks := make([]any, len(content))
	for i, b := range content {
		blocks[i] = b
	}
	msg["content"] = blocks
	return msg
}

func decodeJSON(t *testing.T, raw []byte) map[string]any {
	t.Helper()
	var out map[string]any
	require.NoError(t, json.Unmarshal(raw, &out))
	return out
}
