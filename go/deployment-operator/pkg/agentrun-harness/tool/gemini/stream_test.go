package gemini

import (
	"strings"
	"testing"
)

func TestStreamTurnRejectsInvalidKnownEvents(t *testing.T) {
	tests := []struct {
		name string
		line string
		want string
	}{
		{
			name: "init without session",
			line: `{"type":"init","model":"gemini"}`,
			want: "session id and model are required",
		},
		{
			name: "assistant message without delta",
			line: `{"type":"message","role":"assistant","content":"hello"}`,
			want: "assistant message must be a delta",
		},
		{
			name: "tool use without parameters",
			line: `{"type":"tool_use","tool_name":"read_file","tool_id":"call"}`,
			want: "parameters must be an object",
		},
		{
			name: "uncorrelated tool result",
			line: `{"type":"tool_result","tool_id":"call","status":"success","output":"ok"}`,
			want: "was not started",
		},
		{
			name: "unknown error severity",
			line: `{"type":"error","severity":"fatal","message":"boom"}`,
			want: "unsupported severity",
		},
		{
			name: "result without stats",
			line: `{"type":"result","status":"success"}`,
			want: "stats are required",
		},
		{
			name: "negative result stats",
			line: `{"type":"result","status":"success","stats":{"total_tokens":-1}}`,
			want: "stats cannot be negative",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			turn := newStreamTurn("", newTestSink())
			turn.consume([]byte(test.line))
			if turn.err == nil || !strings.Contains(turn.err.Error(), test.want) {
				t.Fatalf("stream error = %v, want %q", turn.err, test.want)
			}
		})
	}
}

func TestStreamTurnIgnoresNoiseUnknownEventsAndUserMessages(t *testing.T) {
	sink := newTestSink()
	turn := newStreamTurn("", sink)
	for _, line := range []string{
		"[DEBUG] stderr noise",
		`{"type":"future_event","value":"ignored"}`,
		`{"type":"message","role":"user","content":"runtime already emitted this"}`,
	} {
		turn.consume([]byte(line))
	}

	if turn.err != nil {
		t.Fatalf("stream error = %v", turn.err)
	}
	if len(sink.messages) != 0 {
		t.Fatalf("messages = %#v, want none", sink.messages)
	}
}

func TestStreamTurnStateIsPerTurn(t *testing.T) {
	firstSink := newTestSink()
	first := newStreamTurn("", firstSink)
	first.consume([]byte(`{"type":"message","role":"assistant","content":"first","delta":true}`))

	secondSink := newTestSink()
	second := newStreamTurn("", secondSink)
	second.consume([]byte(`{"type":"message","role":"assistant","content":"second","delta":true}`))
	second.consume([]byte(`{"type":"result","status":"success","stats":{}}`))
	first.consume([]byte(`{"type":"result","status":"success","stats":{}}`))

	if len(firstSink.messages) != 1 || firstSink.messages[0].attributes.Message != "first" {
		t.Fatalf("first turn messages = %#v", firstSink.messages)
	}
	if len(secondSink.messages) != 1 || secondSink.messages[0].attributes.Message != "second" {
		t.Fatalf("second turn messages = %#v", secondSink.messages)
	}
}

func TestStreamTurnResultErrorFallback(t *testing.T) {
	tests := []struct {
		name        string
		events      []string
		want        string
		doesNotWant string
	}{
		{
			name: "latest severity error",
			events: []string{
				`{"type":"error","severity":"error","message":"first error"}`,
				`{"type":"error","severity":"warning","message":"later warning"}`,
				`{"type":"error","severity":"error","message":"latest error"}`,
			},
			want: "latest error",
		},
		{
			name: "warning is not a fatal fallback",
			events: []string{
				`{"type":"error","severity":"warning","message":"warning only"}`,
			},
			want:        "gemini result status is error",
			doesNotWant: "warning only",
		},
		{
			name: "explicit result error takes precedence",
			events: []string{
				`{"type":"error","severity":"error","message":"stream error"}`,
			},
			want:        "explicit result error",
			doesNotWant: "stream error",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			turn := newStreamTurn("", newTestSink())
			for _, event := range test.events {
				turn.consume([]byte(event))
			}
			result := `{"type":"result","status":"error","stats":{}}`
			if test.name == "explicit result error takes precedence" {
				result = `{"type":"result","status":"error","error":{"message":"explicit result error"},"stats":{}}`
			}
			turn.consume([]byte(result))

			if turn.err == nil || !strings.Contains(turn.err.Error(), test.want) {
				t.Fatalf("stream error = %v, want %q", turn.err, test.want)
			}
			if test.doesNotWant != "" && strings.Contains(turn.err.Error(), test.doesNotWant) {
				t.Fatalf("stream error = %v, does not want %q", turn.err, test.doesNotWant)
			}
		})
	}
}
