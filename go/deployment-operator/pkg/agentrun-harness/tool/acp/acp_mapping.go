package acp

import (
	"fmt"

	acpsdk "github.com/coder/acp-go-sdk"

	console "github.com/pluralsh/console/go/client"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

func (call *toolCall) message() *console.AgentMessageAttributes {
	name := call.name
	output := call.output
	if output == "" && (call.state == console.AgentMessageToolStateRunning || call.state == console.AgentMessageToolStatePending) {
		output = toolv1.RunningToolOutput
	}
	message := &console.AgentMessageAttributes{
		Role:    console.AiRoleAssistant,
		Message: "Called tool",
		Metadata: &console.AgentMessageMetadataAttributes{
			Tool: &console.AgentMessageToolAttributes{
				Name: new(name), State: &call.state, Output: new(output),
			},
		},
	}
	if call.input != "" {
		message.Metadata.Tool.Input = new(call.input)
	}
	return message
}

func (call *toolCall) setName(title string, kind acpsdk.ToolKind) {
	switch {
	case title != "":
		call.name = title
	case kind != "":
		call.name = string(kind)
	default:
		call.name = "tool"
	}
}

func (call *toolCall) updateMetadata(update *acpsdk.SessionToolCallUpdate) bool {
	changed := false
	if update.Title != nil && call.name != *update.Title {
		call.name = *update.Title
		changed = true
	}
	if update.RawInput != nil {
		input := formatValue(update.RawInput)
		if call.input != input {
			call.input = input
			changed = true
		}
	}
	return changed
}

func (call *toolCall) updateStatus(status *acpsdk.ToolCallStatus) (bool, bool, error) {
	if status == nil {
		return false, false, nil
	}
	var state console.AgentMessageToolState
	switch *status {
	case acpsdk.ToolCallStatusPending:
		state = console.AgentMessageToolStatePending
	case acpsdk.ToolCallStatusInProgress, "":
		state = console.AgentMessageToolStateRunning
	case acpsdk.ToolCallStatusCompleted:
		state = console.AgentMessageToolStateCompleted
	case acpsdk.ToolCallStatusFailed:
		state = console.AgentMessageToolStateError
	default:
		return false, false, fmt.Errorf("acp tool call has unknown status %q", *status)
	}
	terminal := state == console.AgentMessageToolStateCompleted || state == console.AgentMessageToolStateError
	changed := call.state != state
	if changed {
		call.state = state
	}
	return terminal, changed, nil
}
