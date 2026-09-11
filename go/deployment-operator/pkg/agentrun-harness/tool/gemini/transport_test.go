package gemini

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"sync/atomic"
	"testing"

	console "github.com/pluralsh/console/go/client"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/usage"
	"github.com/pluralsh/console/go/deployment-operator/pkg/harness/exec"
	stackv1 "github.com/pluralsh/console/go/deployment-operator/pkg/harness/stackrun/v1"
)

func TestTransportKindAndCapabilities(t *testing.T) {
	transport := newTestTransport(t, console.AgentRunModeWrite, "gemini-custom", nil)
	capabilities := transport.Capabilities()
	if transport.Kind() != toolv1.TransportKindRaw {
		t.Fatalf("Kind() = %q, want raw", transport.Kind())
	}
	if !capabilities.SessionResume || capabilities.ToolCallOutputStreaming || !capabilities.UsageReporting ||
		!capabilities.FileSystemRead || !capabilities.FileSystemWrite {
		t.Fatalf("Capabilities() = %#v", capabilities)
	}
}

func TestTransportArgs(t *testing.T) {
	transport := newTestTransport(t, console.AgentRunModeAnalyze, "", nil)
	tests := []struct {
		name    string
		request toolv1.TurnRequest
		want    []string
	}{
		{
			name: "initial analyze turn starts a new session",
			request: toolv1.TurnRequest{
				Kind:      toolv1.TurnKindInitial,
				Prompt:    "analyze repository",
				SessionID: "old-session",
				Settings:  toolv1.Settings{Mode: console.AgentRunModeAnalyze},
			},
			want: []string{"--output-format", "stream-json", "--model", defaultModel, "--prompt", "analyze repository"},
		},
		{
			name: "followup review turn resumes",
			request: toolv1.TurnRequest{
				Kind:      toolv1.TurnKindFollowup,
				Prompt:    "review again",
				SessionID: "session-1",
				Settings: toolv1.Settings{
					Mode:  console.AgentRunModeReview,
					Model: toolv1.ModelSelection{Name: "gemini-review"},
				},
			},
			want: []string{"--output-format", "stream-json", "--model", "gemini-review", "--resume", "session-1", "--prompt", "review again"},
		},
		{
			name: "babysit write turn enables yolo and resumes",
			request: toolv1.TurnRequest{
				Kind:      toolv1.TurnKindBabysit,
				Prompt:    "check pull request",
				SessionID: "session-2",
				Settings: toolv1.Settings{
					Mode:  console.AgentRunModeWrite,
					Model: toolv1.ModelSelection{Name: "gemini-write"},
				},
			},
			want: []string{
				"--output-format", "stream-json", "--model", "gemini-write",
				"--approval-mode", "yolo", "--resume", "session-2", "--prompt", "check pull request",
			},
		},
		{
			name: "followup without a session starts fresh",
			request: toolv1.TurnRequest{
				Kind:     toolv1.TurnKindFollowup,
				Prompt:   "try again",
				Settings: toolv1.Settings{Mode: console.AgentRunModeWrite},
			},
			want: []string{
				"--output-format", "stream-json", "--model", defaultModel,
				"--approval-mode", "yolo", "--prompt", "try again",
			},
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := transport.args(test.request); !reflect.DeepEqual(got, test.want) {
				t.Fatalf("args() = %q, want %q", got, test.want)
			}
		})
	}
}

func TestTransportTurnUsesRepositoryCWDAndPreservesExecutionOptions(t *testing.T) {
	binDir := t.TempDir()
	writeGeminiBinary(t, binDir)
	t.Setenv("PATH", binDir+string(os.PathListSeparator)+os.Getenv("PATH"))
	t.Setenv("GEMINI_TEST_FIXTURE", fixturePath(t, "success.jsonl"))
	launchOutput := filepath.Join(t.TempDir(), "launch")
	t.Setenv("GEMINI_TEST_OUTPUT", launchOutput)

	endpoint := "https://api.example"
	transport := newTestTransport(t, console.AgentRunModeWrite, "gemini-custom", &endpoint)
	sink := newTestSink()
	var preStarts, postStarts atomic.Int32
	result, err := transport.Turn(context.Background(), toolv1.TurnRequest{
		Kind:   toolv1.TurnKindInitial,
		Prompt: "implement feature with spaces",
		Settings: toolv1.Settings{
			Mode:  console.AgentRunModeWrite,
			Model: toolv1.ModelSelection{Name: "gemini-custom"},
		},
		Options: []exec.Option{
			exec.WithHook(stackv1.LifecyclePreStart, func() error {
				preStarts.Add(1)
				return nil
			}),
			exec.WithHook(stackv1.LifecyclePostStart, func() error {
				postStarts.Add(1)
				return nil
			}),
		},
	}, sink)
	if err != nil {
		t.Fatalf("Turn() error = %v", err)
	}
	if result.SessionID != "session-success" {
		t.Fatalf("Turn() session = %q", result.SessionID)
	}
	if preStarts.Load() != 1 || postStarts.Load() != 1 {
		t.Fatalf("lifecycle hooks = %d/%d, want 1/1", preStarts.Load(), postStarts.Load())
	}

	launch, err := os.ReadFile(launchOutput)
	if err != nil {
		t.Fatal(err)
	}
	wantLaunchLines := []string{
		"arg=--output-format", "arg=stream-json", "arg=--model", "arg=gemini-custom",
		"arg=--approval-mode", "arg=yolo", "arg=--prompt", "arg=implement feature with spaces",
		"key=api-key", "endpoint=https://api.example", "trust=true",
		"home=" + transport.agent.config.WorkDir, "cwd=" + transport.repositoryDir,
	}
	for _, want := range wantLaunchLines {
		if !strings.Contains(string(launch), want+"\n") {
			t.Fatalf("launch output missing %q:\n%s", want, launch)
		}
	}

	assertSuccessfulStream(t, sink)
}

func TestTransportEnvUsesConsoleCredentialsForProxy(t *testing.T) {
	run := geminiTestRun(console.AgentRunModeWrite, "gemini-custom", nil)
	run.Runtime.AiProxy = true
	config := toolv1.Config{
		WorkDir:       t.TempDir(),
		RepositoryDir: t.TempDir(),
		Run:           run,
	}
	agent := NewAgent(config)
	agent.consoleURL = "https://console.example/gql"
	agent.consoleToken = "console-token"
	values := make(map[string]string)
	for _, item := range agent.env(config) {
		key, value, ok := strings.Cut(item, "=")
		if ok {
			values[key] = value
		}
	}

	if values[geminiAPIKeyEnv] != "console-token" {
		t.Fatalf("proxy API key = %q, want Console token", values[geminiAPIKeyEnv])
	}
	if values[geminiGoogleBaseURLEnv] != "https://console.example/ext/ai/gemini" {
		t.Fatalf("proxy base URL = %q", values[geminiGoogleBaseURLEnv])
	}
	if _, ok := values[geminiAPIBaseURLEnv]; ok {
		t.Fatal("proxy environment unexpectedly set legacy direct endpoint")
	}
	if values[geminiAPIKeyEnv] == run.Runtime.Config.Gemini.APIKey {
		t.Fatal("proxy environment used provider API key")
	}
}

func TestTransportEnvDoesNotSubstituteProxyCredential(t *testing.T) {
	run := geminiTestRun(console.AgentRunModeWrite, "gemini-custom", nil)
	run.Runtime.AiProxy = true
	config := toolv1.Config{WorkDir: t.TempDir(), RepositoryDir: t.TempDir(), Run: run}

	values := make(map[string]string)
	for _, item := range NewAgent(config).env(config) {
		key, value, ok := strings.Cut(item, "=")
		if ok {
			values[key] = value
		}
	}

	if values[geminiAPIKeyEnv] != "" {
		t.Fatalf("proxy API key = %q, want empty when Console token is missing", values[geminiAPIKeyEnv])
	}
}

func TestTransportTurnReportsStreamErrorsAfterDrain(t *testing.T) {
	binDir := t.TempDir()
	writeGeminiBinary(t, binDir)
	t.Setenv("PATH", binDir+string(os.PathListSeparator)+os.Getenv("PATH"))

	tests := []struct {
		name          string
		fixture       string
		wantError     string
		wantSessionID string
		wantMessage   string
	}{
		{
			name:          "malformed event",
			fixture:       "malformed.jsonl",
			wantError:     "decode gemini stream event",
			wantSessionID: "session-after-malformed",
			wantMessage:   "processed after malformed event",
		},
		{
			name:          "error result",
			fixture:       "result_error.jsonl",
			wantError:     "permission denied",
			wantSessionID: "session-error",
			wantMessage:   "partial response",
		},
		{
			name:          "invalid stream result uses preceding error event",
			fixture:       "invalid_stream.jsonl",
			wantError:     "response contained only thought content",
			wantSessionID: "session-invalid-stream",
			wantMessage:   "Error: response contained only thought content",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			t.Setenv("GEMINI_TEST_FIXTURE", fixturePath(t, test.fixture))
			transport := newTestTransport(t, console.AgentRunModeAnalyze, "gemini-custom", nil)
			sink := newTestSink()
			var postStarts atomic.Int32
			result, err := transport.Turn(context.Background(), toolv1.TurnRequest{
				Kind:   toolv1.TurnKindInitial,
				Prompt: "test errors",
				Settings: toolv1.Settings{
					Mode:  console.AgentRunModeAnalyze,
					Model: toolv1.ModelSelection{Name: "gemini-custom"},
				},
				Options: []exec.Option{exec.WithHook(stackv1.LifecyclePostStart, func() error {
					postStarts.Add(1)
					return nil
				})},
			}, sink)
			if err == nil || !strings.Contains(err.Error(), test.wantError) {
				t.Fatalf("Turn() error = %v, want %q", err, test.wantError)
			}
			if result.SessionID != test.wantSessionID {
				t.Fatalf("Turn() session = %q, want %q", result.SessionID, test.wantSessionID)
			}
			if postStarts.Load() != 1 {
				t.Fatalf("post-start hook calls = %d, want 1", postStarts.Load())
			}
			if !sink.hasMessage(test.wantMessage) {
				t.Fatalf("messages = %#v, want %q after stream error", sink.messages, test.wantMessage)
			}
		})
	}
}

func TestTransportTurnRejectsPreCancelledContext(t *testing.T) {
	transport := newTestTransport(t, console.AgentRunModeAnalyze, "", nil)
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	result, err := transport.Turn(ctx, toolv1.TurnRequest{SessionID: "existing"}, nil)
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("Turn() error = %v, want context canceled", err)
	}
	if result.SessionID != "existing" {
		t.Fatalf("Turn() session = %q", result.SessionID)
	}
}

func assertSuccessfulStream(t *testing.T, sink *testSink) {
	t.Helper()
	if !reflect.DeepEqual(sink.sessions, []string{"session-success"}) {
		t.Fatalf("sessions = %q", sink.sessions)
	}
	if len(sink.messages) != 7 {
		t.Fatalf("messages = %#v", sink.messages)
	}
	if sink.messages[0].attributes.Message != "I will inspect." || sink.messages[0].callID != "" {
		t.Fatalf("first assistant message = %#v", sink.messages[0])
	}
	assertToolMessage(t, sink.messages[1], "call-1", "read_file", `{"path":"README.md"}`, toolv1.RunningToolOutput, console.AgentMessageToolStateRunning)
	assertToolMessage(t, sink.messages[2], "call-1", "read_file", `{"path":"README.md"}`, "line one\nline two  ", console.AgentMessageToolStateCompleted)
	assertToolMessage(t, sink.messages[3], "call-2", "run_shell", `{"command":"false"}`, toolv1.RunningToolOutput, console.AgentMessageToolStateRunning)
	assertToolMessage(t, sink.messages[4], "call-2", "run_shell", `{"command":"false"}`, "command failed", console.AgentMessageToolStateError)
	if sink.messages[5].attributes.Role != console.AiRoleSystem || sink.messages[5].attributes.Message != "Warning: approaching turn limit" {
		t.Fatalf("warning message = %#v", sink.messages[5])
	}
	final := sink.messages[6].attributes
	if final.Role != console.AiRoleAssistant || final.Message != "Done." || final.Cost == nil || final.Cost.Tokens == nil ||
		final.Cost.Tokens.Input == nil || *final.Cost.Tokens.Input != 20 ||
		final.Cost.Tokens.Output == nil || *final.Cost.Tokens.Output != 10 {
		t.Fatalf("final assistant message = %#v", final)
	}
	if !reflect.DeepEqual(sink.usages, []usage.Record{{
		InputTokens: 20, OutputTokens: 10, TotalTokens: 30, CachedTokens: 4,
	}}) {
		t.Fatalf("usage = %#v", sink.usages)
	}
}

func assertToolMessage(
	t *testing.T,
	message testSinkMessage,
	callID, name, input, output string,
	state console.AgentMessageToolState,
) {
	t.Helper()
	tool := message.attributes.Metadata
	if message.callID != callID || tool == nil || tool.Tool == nil || tool.Tool.Name == nil || *tool.Tool.Name != name ||
		tool.Tool.Input == nil || *tool.Tool.Input != input || tool.Tool.Output == nil || *tool.Tool.Output != output ||
		tool.Tool.State == nil || *tool.Tool.State != state {
		t.Fatalf("tool message = %#v", message)
	}
}

func newTestTransport(t *testing.T, mode console.AgentRunMode, model string, endpoint *string) *Transport {
	t.Helper()
	config := toolv1.Config{
		WorkDir:       t.TempDir(),
		RepositoryDir: t.TempDir(),
		Run:           geminiTestRun(mode, model, endpoint),
	}
	transport, err := NewTransport(NewAgent(config))
	if err != nil {
		t.Fatal(err)
	}
	return transport
}

func fixturePath(t *testing.T, name string) string {
	t.Helper()
	path, err := filepath.Abs(filepath.Join("testdata", name))
	if err != nil {
		t.Fatal(err)
	}
	return path
}

func writeGeminiBinary(t *testing.T, binDir string) {
	t.Helper()
	script := `#!/bin/sh
if [ -n "$GEMINI_TEST_OUTPUT" ]; then
  : > "$GEMINI_TEST_OUTPUT"
  for arg in "$@"; do
    printf 'arg=%s\n' "$arg" >> "$GEMINI_TEST_OUTPUT"
  done
  printf 'key=%s\nendpoint=%s\ngoogle_endpoint=%s\ntrust=%s\nhome=%s\ncwd=%s\n' "$GEMINI_API_KEY" "$GEMINI_API_BASE_URL" "$GOOGLE_GEMINI_BASE_URL" "$GEMINI_CLI_TRUST_WORKSPACE" "$GEMINI_CLI_HOME" "$PWD" >> "$GEMINI_TEST_OUTPUT"
fi
printf '[DEBUG] ignored Gemini CLI stderr noise\n' >&2
if [ -n "$GEMINI_TEST_FIXTURE" ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    printf '%s\n' "$line"
  done < "$GEMINI_TEST_FIXTURE"
fi
`
	if err := os.WriteFile(filepath.Join(binDir, geminiBinary), []byte(script), 0755); err != nil {
		t.Fatal(err)
	}
}

type testSinkMessage struct {
	attributes *console.AgentMessageAttributes
	callID     string
}

type testSink struct {
	sessions []string
	messages []testSinkMessage
	outputs  map[string]string
	usages   []usage.Record
}

func newTestSink() *testSink {
	return &testSink{outputs: make(map[string]string)}
}

func (sink *testSink) Session(sessionID string) {
	sink.sessions = append(sink.sessions, sessionID)
}

func (sink *testSink) Message(attributes *console.AgentMessageAttributes, callID string) {
	sink.messages = append(sink.messages, testSinkMessage{attributes: attributes, callID: callID})
}

func (sink *testSink) ToolCallOutput(callID, output string) {
	sink.outputs[callID] = output
}

func (sink *testSink) Usage(record usage.Record) {
	sink.usages = append(sink.usages, record)
}

func (sink *testSink) hasMessage(message string) bool {
	for _, candidate := range sink.messages {
		if candidate.attributes.Message == message {
			return true
		}
	}
	return false
}
