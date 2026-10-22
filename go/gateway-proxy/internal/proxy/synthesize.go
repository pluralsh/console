package proxy

import (
	"bytes"
	"encoding/json"
)

type streamEvent struct {
	name string
	data any
}

// SynthesizeEvents replays a complete message as the sequence of SSE events the Anthropic
// streaming API would have produced for it.
func SynthesizeEvents(msg *Message) []streamEvent {
	start := *msg
	start.Content = []json.RawMessage{}
	start.StopReason = nil
	start.StopSequence = nil

	// message_start, up to five events per block, message_delta and message_stop.
	events := make([]streamEvent, 0, 3+5*len(msg.Content))
	events = append(events, streamEvent{"message_start", map[string]any{"type": "message_start", "message": start}})

	for i, raw := range msg.Content {
		events = append(events, blockEvents(i, raw)...)
	}

	events = append(events,
		streamEvent{"message_delta", map[string]any{
			"type":  "message_delta",
			"delta": map[string]any{"stop_reason": msg.StopReason, "stop_sequence": msg.StopSequence},
			"usage": msg.Usage,
		}},
		streamEvent{"message_stop", map[string]any{"type": "message_stop"}},
	)
	return events
}

func blockEvents(index int, raw json.RawMessage) []streamEvent {
	var block map[string]json.RawMessage
	if err := json.Unmarshal(raw, &block); err != nil {
		return nil
	}
	var blockType string
	_ = json.Unmarshal(block["type"], &blockType)

	var start any = raw
	var deltas []any

	switch blockType {
	case "text":
		start = map[string]any{"type": "text", "text": ""}
		if text := stringField(block, "text"); text != "" {
			deltas = append(deltas, map[string]any{"type": "text_delta", "text": text})
		}
		var citations []json.RawMessage
		if json.Unmarshal(block["citations"], &citations) == nil {
			for _, c := range citations {
				deltas = append(deltas, map[string]any{"type": "citations_delta", "citation": c})
			}
		}
	case "tool_use", "server_tool_use":
		start = map[string]any{
			"type":  blockType,
			"id":    stringField(block, "id"),
			"name":  stringField(block, "name"),
			"input": map[string]any{},
		}
		if input := compactJSON(block["input"]); input != "" && input != "{}" && input != "null" {
			deltas = append(deltas, map[string]any{"type": "input_json_delta", "partial_json": input})
		}
	case "thinking":
		start = map[string]any{"type": "thinking", "thinking": ""}
		if thinking := stringField(block, "thinking"); thinking != "" {
			deltas = append(deltas, map[string]any{"type": "thinking_delta", "thinking": thinking})
		}
		if sig := stringField(block, "signature"); sig != "" {
			deltas = append(deltas, map[string]any{"type": "signature_delta", "signature": sig})
		}
	}

	events := []streamEvent{{"content_block_start", map[string]any{
		"type": "content_block_start", "index": index, "content_block": start,
	}}}
	for _, d := range deltas {
		events = append(events, streamEvent{"content_block_delta", map[string]any{
			"type": "content_block_delta", "index": index, "delta": d,
		}})
	}
	return append(events, streamEvent{"content_block_stop", map[string]any{
		"type": "content_block_stop", "index": index,
	}})
}

func stringField(block map[string]json.RawMessage, key string) string {
	var s string
	_ = json.Unmarshal(block[key], &s)
	return s
}

func compactJSON(raw json.RawMessage) string {
	if len(raw) == 0 {
		return ""
	}
	var buf bytes.Buffer
	if err := json.Compact(&buf, raw); err != nil {
		return ""
	}
	return buf.String()
}
