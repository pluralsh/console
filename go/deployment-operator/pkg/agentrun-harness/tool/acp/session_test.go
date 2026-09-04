package acp

import (
	"context"
	"strings"
	"testing"

	acpsdk "github.com/coder/acp-go-sdk"
)

func TestEngineTurnDeliversUpdatesSentBeforeSessionResponse(t *testing.T) {
	state := newTestState()
	state.newSessionUpdates = []acpsdk.SessionNotification{
		{SessionId: "session-1", Update: acpsdk.UpdateAgentMessageText("early ")},
	}
	state.promptUpdates = []acpsdk.SessionUpdate{acpsdk.UpdateAgentMessageText("response")}
	sink := &testSink{}
	_, process, _ := newTestAgentProcess(state, true)
	if _, err := NewEngine(Config{}).Turn(context.Background(), process, Request{Cwd: t.TempDir(), Prompt: "prompt"}, sink); err != nil {
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
	if _, err := NewEngine(Config{}).Turn(context.Background(), process, Request{
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
	_, err := NewEngine(Config{}).Turn(context.Background(), process, Request{Cwd: t.TempDir(), Prompt: "version"}, &testSink{})
	if err == nil || !strings.Contains(err.Error(), "protocol version") {
		t.Fatalf("protocol version error = %v", err)
	}
}
