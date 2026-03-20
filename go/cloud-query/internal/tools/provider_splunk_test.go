package tools

import (
	"testing"
	"time"
)

func TestSplunkToLogEntry_MessageFallbackFields(t *testing.T) {
	t.Parallel()

	provider := &SplunkProvider{}

	entry, err := provider.toLogEntry(SplunkSearchResponseResult{
		Timestamp: "1710000000.000000",
	})
	if err != nil {
		t.Fatalf("toLogEntry() returned error: %v", err)
	}
	if entry.Message != "" {
		t.Fatalf("toLogEntry() message = %q, want empty string", entry.Message)
	}
}

func TestSplunkToLogEntry_MessageJSONFallback(t *testing.T) {
	t.Parallel()

	provider := &SplunkProvider{}

	entry, err := provider.toLogEntry(SplunkSearchResponseResult{
		Timestamp: "1710000000.000000",
		Message:   "from-raw",
	})
	if err != nil {
		t.Fatalf("toLogEntry() returned error: %v", err)
	}
	if entry.Message != "from-raw" {
		t.Fatalf("toLogEntry() message = %q, want %q", entry.Message, "from-raw")
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
