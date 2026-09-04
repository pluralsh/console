package acp

import (
	"testing"

	acpsdk "github.com/coder/acp-go-sdk"
	console "github.com/pluralsh/console/go/client"
)

func TestToolCallPrefersContentAndFormatsRawOutput(t *testing.T) {
	call := &toolCall{state: console.AgentMessageToolStateRunning}
	content := []acpsdk.ToolCallContent{acpsdk.ToolContent(acpsdk.TextBlock("displayed"))}
	if got := call.toolOutput(content, nil, map[string]string{"result": "raw"}); got.text != "displayed" {
		t.Fatalf("content output = %q", got.text)
	}
	if got := call.toolOutput(nil, nil, map[string]string{"result": "raw"}); got.text != `{"result":"raw"}` {
		t.Fatalf("raw output = %q", got.text)
	}
	call.setName("", acpsdk.ToolKindExecute)
	if call.name != string(acpsdk.ToolKindExecute) {
		t.Fatalf("fallback tool name = %q", call.name)
	}
}

func TestToolCallMapsAdapterTerminalOutput(t *testing.T) {
	sink := &testSink{}
	turn := &turnState{sink: sink, tools: map[string]*toolCall{"call-1": {id: "call-1"}}}
	status := acpsdk.ToolCallStatusCompleted
	updates := []struct {
		meta       map[string]any
		rawOutput  any
		status     *acpsdk.ToolCallStatus
		wantOutput string
		stream     bool
	}{
		{meta: adapterTerminalMeta("terminal_output_delta", "first\n"), wantOutput: "first\n", stream: true},
		{meta: adapterTerminalMeta("terminal_output_delta", "second\n"), wantOutput: "first\nsecond\n", stream: true},
		{meta: adapterTerminalMeta("terminal_output", "first\nsecond\n"), wantOutput: "first\nsecond\n"},
		{rawOutput: map[string]any{"formatted_output": "first\nsecond\n", "exit_code": float64(0)}, status: &status, wantOutput: "first\nsecond\n"},
	}
	for _, update := range updates {
		events, err := turn.applyToolUpdate(&acpsdk.SessionToolCallUpdate{
			ToolCallId: "call-1", Meta: update.meta, RawOutput: update.rawOutput, Status: update.status,
		})
		if err != nil {
			t.Fatalf("applyToolUpdate() error = %v", err)
		}
		if events.output != update.wantOutput || events.streamOutput != update.stream {
			t.Fatalf("tool output = %q, stream = %v", events.output, events.streamOutput)
		}
		turn.emitToolUpdate("call-1", events)
	}
	sink.mu.Lock()
	outputs := append([]string(nil), sink.outputs...)
	sink.mu.Unlock()
	if len(outputs) != 2 || outputs[0] != "call-1:first\n" || outputs[1] != "call-1:first\nsecond\n" {
		t.Fatalf("adapter output events = %v", outputs)
	}
}

func adapterTerminalMeta(name, data string) map[string]any {
	return map[string]any{name: map[string]any{"data": data}}
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
