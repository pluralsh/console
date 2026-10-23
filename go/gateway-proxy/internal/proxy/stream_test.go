package proxy

import (
	"bytes"
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/aws/aws-sdk-go-v2/aws/protocol/eventstream"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const fullGatewayResponse = `{
	"id": "bedrock_01AFUD7rQ12345EXAMPLE",
	"type": "message",
	"role": "assistant",
	"model": "claude-4.7-opus",
	"content": [
		{"type": "thinking", "thinking": "The user wants weather.", "signature": "sig-abc"},
		{"type": "redacted_thinking", "data": "opaque=="},
		{"type": "text", "text": "Checking the weather.", "citations": [{"type": "char_location", "cited_text": "x", "document_index": 0, "start_char_index": 0, "end_char_index": 1}]},
		{"type": "tool_use", "id": "toolu_01", "name": "weather", "input": {"city": "Paris", "units": {"temp": "C"}}},
		{"type": "tool_use", "id": "toolu_02", "name": "noop", "input": {}},
		{"type": "web_search_tool_result", "tool_use_id": "srvtoolu_01", "content": []}
	],
	"stop_reason": "tool_use",
	"stop_sequence": null,
	"usage": {"input_tokens": 42, "output_tokens": 17, "cache_read_input_tokens": 5}
}`

func TestParseGatewayResponseNormalizes(t *testing.T) {
	msg, err := ParseGatewayResponse([]byte(`{"id":"bedrock_1","model":"claude-4.7-opus","content":null,"stop_reason":"end_turn"}`), "claude-opus-4-7")
	require.NoError(t, err)

	out := decodeJSON(t, mustMarshal(msg))
	assert.Equal(t, "message", out["type"])
	assert.Equal(t, "assistant", out["role"])
	assert.Equal(t, "claude-opus-4-7", out["model"], "client's model name is echoed")
	assert.Equal(t, []any{}, out["content"])
	assert.Contains(t, out, "stop_sequence", "stop_sequence is always present")
	assert.Nil(t, out["stop_sequence"])
	assert.Equal(t, map[string]any{"input_tokens": 0.0, "output_tokens": 0.0}, out["usage"])

	msg, err = ParseGatewayResponse([]byte(`{"id":"bedrock_1","model":"claude-4.7-opus","content":[]}`), "")
	require.NoError(t, err)
	assert.Equal(t, "claude-4.7-opus", msg.Model, "gateway model kept when client sent none")

	_, err = ParseGatewayResponse([]byte(`{"content":[]}`), "m")
	assert.ErrorContains(t, err, "missing id")
	_, err = ParseGatewayResponse([]byte(`<html>`), "m")
	assert.ErrorContains(t, err, "invalid gateway response")
}

func TestSynthesizedStreamRoundTrips(t *testing.T) {
	msg, err := ParseGatewayResponse([]byte(fullGatewayResponse), "claude-opus-4-7")
	require.NoError(t, err)

	rec := httptest.NewRecorder()
	sse := newSSEWriter(rec)
	for _, ev := range SynthesizeEvents(msg) {
		require.NoError(t, sse.send(ev.name, ev.data))
	}

	events := parseSSE(t, rec.Body.String())
	assert.Equal(t, []string{
		"message_start",
		"content_block_start", "content_block_delta", "content_block_delta", "content_block_stop", // thinking + signature
		"content_block_start", "content_block_stop", // redacted_thinking
		"content_block_start", "content_block_delta", "content_block_delta", "content_block_stop", // text + citation
		"content_block_start", "content_block_delta", "content_block_stop", // tool_use
		"content_block_start", "content_block_stop", // tool_use with empty input
		"content_block_start", "content_block_stop", // server tool result
		"message_delta",
		"message_stop",
	}, eventNames(events))

	start := events[0].Data["message"].(map[string]any)
	assert.Equal(t, []any{}, start["content"])
	assert.Nil(t, start["stop_reason"])

	want := decodeJSON(t, mustMarshal(msg))
	assert.Equal(t, want, accumulate(t, events), "accumulated stream equals the non-streaming response")
}

func encodeEventStream(t *testing.T, msgs ...eventstream.Message) []byte {
	t.Helper()
	var buf bytes.Buffer
	enc := eventstream.NewEncoder()
	for _, m := range msgs {
		require.NoError(t, enc.Encode(&buf, m))
	}
	return buf.Bytes()
}

func chunk(t *testing.T, event string) eventstream.Message {
	t.Helper()
	payload, err := json.Marshal(map[string][]byte{"bytes": []byte(event)})
	require.NoError(t, err)
	m := eventstream.Message{Payload: payload}
	m.Headers.Set(":message-type", eventstream.StringValue("event"))
	m.Headers.Set(":event-type", eventstream.StringValue("chunk"))
	return m
}

func exception(name, message string) eventstream.Message {
	m := eventstream.Message{Payload: []byte(`{"message":"` + message + `"}`)}
	m.Headers.Set(":message-type", eventstream.StringValue("exception"))
	m.Headers.Set(":exception-type", eventstream.StringValue(name))
	return m
}

var upstreamEvents = []string{
	`{"type":"message_start","message":{"id":"msg_bdrk_1","type":"message","role":"assistant","model":"claude-4.7-opus","content":[],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":10,"output_tokens":1}}}`,
	`{"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}`,
	`{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello "}}`,
	`{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"world"}}`,
	`{"type":"content_block_stop","index":0}`,
	`{"type":"content_block_start","index":1,"content_block":{"type":"tool_use","id":"toolu_1","name":"weather","input":{}}}`,
	`{"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":"{\"city\":"}}`,
	`{"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":"\"Paris\"}"}}`,
	`{"type":"content_block_stop","index":1}`,
	`{"type":"message_delta","delta":{"stop_reason":"tool_use","stop_sequence":null},"usage":{"output_tokens":9}}`,
	`{"type":"message_stop","amazon-bedrock-invocationMetrics":{"inputTokenCount":10,"outputTokenCount":9,"invocationLatency":100,"firstByteLatency":20}}`,
}

func TestForwardEventStream(t *testing.T) {
	var msgs []eventstream.Message
	for _, e := range upstreamEvents {
		msgs = append(msgs, chunk(t, e))
	}
	// A trailing frame after message_stop must not be forwarded.
	msgs = append(msgs, chunk(t, `{"type":"ping"}`))

	rec := httptest.NewRecorder()
	require.NoError(t, forwardStream(bytes.NewReader(encodeEventStream(t, msgs...)), eventStreamContentType, "claude-opus-4-7", newSSEWriter(rec)))

	body := rec.Body.String()
	assert.NotContains(t, body, "amazon-bedrock-invocationMetrics")

	events := parseSSE(t, body)
	require.Len(t, events, len(upstreamEvents))
	assert.Equal(t, "message_stop", events[len(events)-1].Name)

	msg := accumulate(t, events)
	assert.Equal(t, "claude-opus-4-7", msg["model"])
	assert.Equal(t, "tool_use", msg["stop_reason"])
	assert.Equal(t, []any{
		map[string]any{"type": "text", "text": "Hello world"},
		map[string]any{"type": "tool_use", "id": "toolu_1", "name": "weather", "input": map[string]any{"city": "Paris"}},
	}, msg["content"])
}

func TestForwardEventStreamException(t *testing.T) {
	stream := encodeEventStream(t,
		chunk(t, upstreamEvents[0]),
		exception("throttlingException", "Too many tokens"),
	)
	rec := httptest.NewRecorder()
	require.NoError(t, forwardStream(bytes.NewReader(stream), eventStreamContentType, "", newSSEWriter(rec)))

	events := parseSSE(t, rec.Body.String())
	require.Len(t, events, 2)
	assert.Equal(t, "error", events[1].Name)
	assert.Equal(t, map[string]any{"type": "rate_limit_error", "message": "throttlingException: Too many tokens"}, events[1].Data["error"])
}

func TestForwardEventStreamTruncated(t *testing.T) {
	stream := encodeEventStream(t, chunk(t, upstreamEvents[0]), chunk(t, upstreamEvents[1]))
	rec := httptest.NewRecorder()
	require.NoError(t, forwardStream(bytes.NewReader(stream), eventStreamContentType, "", newSSEWriter(rec)))

	events := parseSSE(t, rec.Body.String())
	last := events[len(events)-1]
	assert.Equal(t, "error", last.Name)
	assert.Contains(t, last.Data["error"].(map[string]any)["message"], "ended before message_stop")
}

func TestForwardEventStreamCorrupt(t *testing.T) {
	stream := encodeEventStream(t, chunk(t, upstreamEvents[0]))
	stream = append(stream, []byte("garbage-that-is-not-a-prelude")...)
	rec := httptest.NewRecorder()
	require.NoError(t, forwardStream(bytes.NewReader(stream), eventStreamContentType, "", newSSEWriter(rec)))

	events := parseSSE(t, rec.Body.String())
	last := events[len(events)-1]
	assert.Equal(t, "error", last.Name)
	assert.Equal(t, "api_error", last.Data["error"].(map[string]any)["type"])
}

func TestForwardSSE(t *testing.T) {
	var upstream strings.Builder
	upstream.WriteString(": comment line\n\n")
	for _, e := range upstreamEvents {
		var typed struct{ Type string }
		require.NoError(t, json.Unmarshal([]byte(e), &typed))
		upstream.WriteString("event: " + typed.Type + "\ndata: " + e + "\n\n")
	}

	rec := httptest.NewRecorder()
	require.NoError(t, forwardStream(strings.NewReader(upstream.String()), "text/event-stream; charset=utf-8", "claude-opus-4-7", newSSEWriter(rec)))

	events := parseSSE(t, rec.Body.String())
	require.Len(t, events, len(upstreamEvents))
	msg := accumulate(t, events)
	assert.Equal(t, "claude-opus-4-7", msg["model"])
	assert.NotContains(t, rec.Body.String(), "amazon-bedrock-invocationMetrics")
}
