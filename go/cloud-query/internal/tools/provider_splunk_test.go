package tools

import (
	"encoding/json"
	"testing"
	"time"
)

func TestSplunkToLogEntry_MessageFallbackFields(t *testing.T) {
	t.Parallel()

	provider := &SplunkProvider{}

	raw, err := json.Marshal(map[string]any{
		"_time": "1710000000.000000",
		"event": "from-event",
	})
	if err != nil {
		t.Fatalf("json.Marshal() returned error: %v", err)
	}

	entry, err := provider.toLogEntry(raw)
	if err != nil {
		t.Fatalf("toLogEntry() returned error: %v", err)
	}
	if entry.Message != "from-event" {
		t.Fatalf("toLogEntry() message = %q, want %q", entry.Message, "from-event")
	}
}

func TestSplunkToLogEntry_MessageJSONFallback(t *testing.T) {
	t.Parallel()

	provider := &SplunkProvider{}

	raw, err := json.Marshal(map[string]any{
		"_time": "1710000000.000000",
		"foo":   "bar",
	})
	if err != nil {
		t.Fatalf("json.Marshal() returned error: %v", err)
	}

	entry, err := provider.toLogEntry(raw)
	if err != nil {
		t.Fatalf("toLogEntry() returned error: %v", err)
	}
	if entry.Message == "" {
		t.Fatal("toLogEntry() message is empty, expected JSON fallback")
	}
}

func TestSplunkParseTime_GMTFormat(t *testing.T) {
	t.Parallel()

	provider := &SplunkProvider{}

	ts, err := provider.parseTime("2026-03-20 13:27:59.000 GMT")
	if err != nil {
		t.Fatalf("parseTime() returned error: %v", err)
	}

	want := time.Date(2026, 3, 20, 13, 27, 59, 0, time.UTC)
	if !ts.Equal(want) {
		t.Fatalf("parseTime() = %s, want %s", ts.Format(time.RFC3339Nano), want.Format(time.RFC3339Nano))
	}
}
