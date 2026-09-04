package acp

import (
	"testing"

	acpsdk "github.com/coder/acp-go-sdk"
	console "github.com/pluralsh/console/go/client"
)

func TestToolCallPrefersContentAndFormatsRawOutput(t *testing.T) {
	call := &toolCall{state: console.AgentMessageToolStateRunning}
	content := []acpsdk.ToolCallContent{acpsdk.ToolContent(acpsdk.TextBlock("displayed"))}
	if got := call.toolOutput(content, map[string]string{"result": "raw"}); got != "displayed" {
		t.Fatalf("content output = %q", got)
	}
	if got := call.toolOutput(nil, map[string]string{"result": "raw"}); got != `{"result":"raw"}` {
		t.Fatalf("raw output = %q", got)
	}
	call.setName("", acpsdk.ToolKindExecute)
	if call.name != string(acpsdk.ToolKindExecute) {
		t.Fatalf("fallback tool name = %q", call.name)
	}
}

func TestToolCallMessageUsesRunningOutputAndInput(t *testing.T) {
	call := &toolCall{name: "shell", input: `{"command":"ls"}`, state: console.AgentMessageToolStateRunning}
	message := call.message()
	if message.Metadata == nil || message.Metadata.Tool == nil {
		t.Fatal("tool metadata missing")
	}
	if *message.Metadata.Tool.Output != runningToolOutput {
		t.Fatalf("running output = %q", *message.Metadata.Tool.Output)
	}
	if *message.Metadata.Tool.Input != `{"command":"ls"}` {
		t.Fatalf("tool input = %q", *message.Metadata.Tool.Input)
	}
}

func TestToolCallStatusMapping(t *testing.T) {
	call := &toolCall{}
	for _, test := range []struct {
		status acpsdk.ToolCallStatus
		state  console.AgentMessageToolState
		end    bool
	}{
		{acpsdk.ToolCallStatusPending, console.AgentMessageToolStatePending, false},
		{acpsdk.ToolCallStatusInProgress, console.AgentMessageToolStateRunning, false},
		{acpsdk.ToolCallStatusCompleted, console.AgentMessageToolStateCompleted, true},
		{acpsdk.ToolCallStatusFailed, console.AgentMessageToolStateError, true},
	} {
		status := test.status
		end, changed, err := call.updateStatus(&status)
		if err != nil || !changed || end != test.end || call.state != test.state {
			t.Fatalf("status %q = end %v changed %v state %q err %v", test.status, end, changed, call.state, err)
		}
	}
	unknown := acpsdk.ToolCallStatus("unknown")
	if _, _, err := call.updateStatus(&unknown); err == nil {
		t.Fatal("unknown status unexpectedly succeeded")
	}
}
