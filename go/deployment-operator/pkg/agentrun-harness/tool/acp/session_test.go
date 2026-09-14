package acp

import (
	"context"
	"errors"
	"fmt"
	"os"
	stdexec "os/exec"
	"strings"
	"testing"

	acpsdk "github.com/coder/acp-go-sdk"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/prebake"
	"github.com/pluralsh/console/go/deployment-operator/pkg/harness/exec"
)

func TestNewSessionAttemptIncludesPrebakeReadOnlyRoot(t *testing.T) {
	prebakeDirectory := t.TempDir()
	t.Setenv(prebake.EnvDir, prebakeDirectory)
	_, process, _ := newTestAgentProcess(newTestState(), true)
	attempt, err := newSessionAttempt(
		NewEngine(),
		context.Background(),
		process,
		Request{Cwd: t.TempDir()},
		&testSink{},
	)
	if err != nil {
		t.Fatalf("create session attempt: %v", err)
	}
	t.Cleanup(attempt.close)

	if len(attempt.readOnlyRoots) != 1 {
		t.Fatalf("read-only root count = %d, want 1", len(attempt.readOnlyRoots))
	}
	if attempt.readOnlyRoots[0].directory != prebakeDirectory {
		t.Fatalf("read-only root = %q, want %q", attempt.readOnlyRoots[0].directory, prebakeDirectory)
	}
}

func TestEngineTurnReportsInitializeProcessFailure(t *testing.T) {
	process, err := exec.StartWithStdio(context.Background(), os.Args[0],
		exec.WithArgs([]string{"-test.run=TestInitializeFailureHelperProcess", "--"}),
		exec.WithEnv([]string{"ACP_INITIALIZE_FAILURE_HELPER=1"}),
	)
	if err != nil {
		t.Fatalf("start helper: %v", err)
	}

	_, err = NewEngine().Turn(context.Background(), process, Request{Cwd: t.TempDir(), Prompt: "prompt"}, &testSink{})
	if err == nil {
		t.Fatal("initialize failure succeeded")
	}
	var exitErr *stdexec.ExitError
	if !errors.As(err, &exitErr) || exitErr.ExitCode() != 42 {
		t.Fatalf("initialize failure did not preserve child exit status: %v", err)
	}
	message := err.Error()
	for _, expected := range []string{"peer disconnected before response", "exit status 42", "startup failure"} {
		if !strings.Contains(message, expected) {
			t.Errorf("initialize failure %q does not contain %q", message, expected)
		}
	}
	if strings.Contains(message, "discarded-prefix") {
		t.Errorf("initialize failure did not bound stderr tail: %q", message)
	}
}

func TestInitializeFailureHelperProcess(t *testing.T) {
	if os.Getenv("ACP_INITIALIZE_FAILURE_HELPER") != "1" {
		return
	}
	_, _ = fmt.Fprint(os.Stderr, "discarded-prefix"+strings.Repeat("x", 9*1024)+"\nstartup failure\n")
	os.Exit(42)
}

func TestEngineTurnDeliversUpdatesSentBeforeSessionResponse(t *testing.T) {
	state := newTestState()
	state.newSessionUpdates = []acpsdk.SessionNotification{
		{SessionId: "session-1", Update: acpsdk.UpdateAgentMessageText("early ")},
	}
	state.promptUpdates = []acpsdk.SessionUpdate{acpsdk.UpdateAgentMessageText("response")}
	sink := &testSink{}
	_, process, _ := newTestAgentProcess(state, true)
	if _, err := NewEngine().Turn(context.Background(), process, Request{Cwd: t.TempDir(), Prompt: "prompt"}, sink); err != nil {
		t.Fatalf("early update turn: %v", err)
	}
	sink.mu.Lock()
	defer sink.mu.Unlock()
	if len(sink.messages) != 1 || sink.messages[0].Message != "early response" {
		t.Fatalf("assistant messages = %+v", sink.messages)
	}
}

func TestEngineTurnUsesAdvertisedSessionMode(t *testing.T) {
	state := newTestState()
	state.modes = &acpsdk.SessionModeState{
		AvailableModes: []acpsdk.SessionMode{{Id: "analysis"}},
		CurrentModeId:  "default",
	}
	_, process, _ := newTestAgentProcess(state, true)
	if _, err := NewEngine().Turn(context.Background(), process, Request{
		Cwd: t.TempDir(), Prompt: "mode", Settings: SessionSettings{ModeID: "analysis"},
	}, &testSink{}); err != nil {
		t.Fatalf("mode turn: %v", err)
	}
	_, _, _, configCount, modeCount, _, _ := state.snapshot()
	if configCount != 0 || modeCount != 1 {
		t.Fatalf("mode configuration = config %d, direct mode %d", configCount, modeCount)
	}
}

func TestEngineTurnRejectsUnsupportedProtocolVersion(t *testing.T) {
	state := newTestState()
	state.protocolVersion = acpsdk.ProtocolVersionNumber + 1
	_, process, _ := newTestAgentProcess(state, true)
	_, err := NewEngine().Turn(context.Background(), process, Request{Cwd: t.TempDir(), Prompt: "version"}, &testSink{})
	if err == nil || !strings.Contains(err.Error(), "protocol version") {
		t.Fatalf("protocol version error = %v", err)
	}
}
