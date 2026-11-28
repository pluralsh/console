package daemon

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestHomeCheck(t *testing.T) {
	var h homeCheck
	now := time.Unix(0, 0)
	eio := errors.New("input/output error")

	// One failed probe isn't enough.
	if run, _, _ := h.begin(now); !run {
		t.Fatal("first probe didn't run")
	}
	if _, changed := h.finish(eio); changed || h.error() != "" {
		t.Fatalf("failed after one probe: %q", h.error())
	}
	h.begin(now)
	if msg, changed := h.finish(eio); !changed || !strings.Contains(msg, "input/output error") {
		t.Fatalf("second failure = %q, %v", msg, changed)
	}
	h.begin(now)
	if msg, changed := h.finish(nil); !changed || msg != "" {
		t.Fatalf("recovery = %q, %v", msg, changed)
	}

	// A probe that never returns.
	h.begin(now)
	if run, _, changed := h.begin(now.Add(homeCheckStuck / 2)); run || changed {
		t.Fatal("a slow probe counted as hung")
	}
	if run, msg, changed := h.begin(now.Add(homeCheckStuck + time.Second)); run || !changed || !strings.Contains(msg, "hasn't returned") {
		t.Fatalf("hung probe = %v, %q, %v", run, msg, changed)
	}

	// A restore remounted the home: the hung probe gets a fresh deadline.
	later := now.Add(time.Hour)
	h.reset(later)
	if h.error() != "" {
		t.Fatalf("error kept across a restore: %q", h.error())
	}
	if _, _, changed := h.begin(later.Add(homeCheckStuck / 2)); changed {
		t.Fatal("the restored probe counted as hung")
	}
}

func TestProbeHome(t *testing.T) {
	dir := t.TempDir()
	if err := probeHome(dir); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(dir, homeProbeFile)); err != nil {
		t.Fatal(err)
	}
	if err := probeHome(filepath.Join(dir, "missing")); err == nil {
		t.Fatal("probing a missing home succeeded")
	}
}
