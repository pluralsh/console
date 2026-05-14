package controller

import (
	"encoding/json"
	"os"
	"strings"
	"testing"

	console "github.com/pluralsh/console/go/client"
)

func TestBuildGotestsumRunArgs_Defaults(t *testing.T) {
	args := buildGotestsumRunArgs("/tmp/out", "/tmp/out/unit-tests.xml", "30m", nil, false)

	mustContainArgPair(t, args, "--test.count", "1")
	mustContainArgPair(t, args, "--test.timeout", "30m")
	mustNotContainArg(t, args, "--rerun-fails")
	mustNotContainArg(t, args, "--packages=./...")
	mustNotContainArg(t, args, "-p")
}

func TestBuildGotestsumRunArgs_ConfigOverrides(t *testing.T) {
	rerunFailures := true
	rerunFailuresCount := int64(4)
	p := "8"
	parallel := "3"

	args := buildGotestsumRunArgs("/tmp/out", "/tmp/out/unit-tests.xml", "45m", &console.SentinelCheckIntegrationTestConfigurationFragment{
		RerunFailures:      &rerunFailures,
		RerunFailuresCount: &rerunFailuresCount,
		Gotestsum: &console.SentinelCheckIntegrationTestConfigurationFragment_Gotestsum{
			P:        &p,
			Parallel: &parallel,
		},
	}, false)

	mustContainArg(t, args, "--rerun-fails=4")
	mustContainArg(t, args, "--packages=./...")
	mustContainArgPair(t, args, "-p", "8")
	mustContainArgPair(t, args, "-parallel", "3")
	mustNotContainArgPair(t, args, "-parallel", "1")
}

func mustContainArgPair(t *testing.T, args []string, key, value string) {
	t.Helper()
	for idx := 0; idx < len(args)-1; idx++ {
		if args[idx] == key && args[idx+1] == value {
			return
		}
	}
	t.Fatalf("expected args to contain pair %q %q, got: %v", key, value, args)
}

func mustContainArg(t *testing.T, args []string, key string) {
	t.Helper()
	for _, arg := range args {
		if arg == key {
			return
		}
	}
	t.Fatalf("expected args to contain %q, got: %v", key, args)
}

func mustNotContainArg(t *testing.T, args []string, key string) {
	t.Helper()
	for _, arg := range args {
		if arg == key {
			t.Fatalf("expected args to not contain %q, got: %v", key, args)
		}
	}
}

func mustNotContainArgPair(t *testing.T, args []string, key, value string) {
	t.Helper()
	for idx := 0; idx < len(args)-1; idx++ {
		if args[idx] == key && args[idx+1] == value {
			t.Fatalf("expected args to not contain pair %q %q, got: %v", key, value, args)
		}
	}
}

// Helper for writing temp JSON files for test events
func writeTempJSONFile(t *testing.T, events []TestEvent) string {
	t.Helper()
	tmpfile, err := os.CreateTemp("", "testjson-*.json")
	if err != nil {
		t.Fatalf("failed to create temp file: %v", err)
	}
	enc := json.NewEncoder(tmpfile)
	for _, ev := range events {
		if err := enc.Encode(ev); err != nil {
			t.Fatalf("failed to encode event: %v", err)
		}
	}
	tmpfile.Close()
	return tmpfile.Name()
}

func TestDecodeTestJSONFileToString_AllPass(t *testing.T) {
	events := []TestEvent{
		{Action: "run", Test: "TestFoo"},
		{Action: "pass", Test: "TestFoo", Elapsed: 1.23},
	}
	file := writeTempJSONFile(t, events)
	defer os.Remove(file)
	output, passed, err := DecodeTestJSONFileToString(file)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !passed {
		t.Errorf("expected passed=true, got false")
	}
	if !strings.Contains(output, "--- PASS: TestFoo (1.23s)") {
		t.Errorf("output missing PASS line: %q", output)
	}
}

func TestDecodeTestJSONFileToString_Fail(t *testing.T) {
	events := []TestEvent{
		{Action: "run", Test: "TestBar"},
		{Action: "fail", Test: "TestBar", Elapsed: 2.34},
	}
	file := writeTempJSONFile(t, events)
	defer os.Remove(file)
	output, passed, err := DecodeTestJSONFileToString(file)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if passed {
		t.Errorf("expected passed=false, got true")
	}
	if !strings.Contains(output, "--- FAIL: TestBar (2.34s)") {
		t.Errorf("output missing FAIL line: %q", output)
	}
}

func TestDecodeTestJSONFileToString_Mixed(t *testing.T) {
	events := []TestEvent{
		{Action: "run", Test: "TestA"},
		{Action: "pass", Test: "TestA", Elapsed: 0.5},
		{Action: "run", Test: "TestB"},
		{Action: "fail", Test: "TestB", Elapsed: 1.5},
	}
	file := writeTempJSONFile(t, events)
	defer os.Remove(file)
	output, passed, err := DecodeTestJSONFileToString(file)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if passed {
		t.Errorf("expected passed=false, got true")
	}
	if !strings.Contains(output, "--- PASS: TestA (0.50s)") || !strings.Contains(output, "--- FAIL: TestB (1.50s)") {
		t.Errorf("output missing expected lines: %q", output)
	}
}

func TestDecodeTestJSONFileToString_OutputLines(t *testing.T) {
	events := []TestEvent{
		{Action: "run", Test: "TestLog"},
		{Action: "output", Test: "TestLog", Output: "hello\n"},
		{Action: "pass", Test: "TestLog", Elapsed: 0.1},
	}
	file := writeTempJSONFile(t, events)
	defer os.Remove(file)
	output, passed, err := DecodeTestJSONFileToString(file)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !passed {
		t.Errorf("expected passed=true, got false")
	}
	if !strings.Contains(output, "hello") {
		t.Errorf("output missing log line: %q", output)
	}
}
