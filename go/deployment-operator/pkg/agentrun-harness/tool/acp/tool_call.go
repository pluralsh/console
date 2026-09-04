package acp

import (
	"encoding/json"
	"fmt"
	"strings"

	acpsdk "github.com/coder/acp-go-sdk"

	console "github.com/pluralsh/console/go/client"
)

const runningToolOutput = "running..."

type toolCall struct {
	id     string
	name   string
	input  string
	output string
	state  console.AgentMessageToolState
}

func (call *toolCall) addOutput(output string) {
	if output == "" || output == call.output {
		return
	}
	call.output = output
}

func (*toolCall) formatValue(value any) string {
	if value == nil {
		return ""
	}
	if stringValue, ok := value.(string); ok {
		return stringValue
	}
	encoded, err := json.Marshal(value)
	if err != nil {
		return fmt.Sprintf("%v", value)
	}
	return string(encoded)
}

func (call *toolCall) contentOutput(content []acpsdk.ToolCallContent) string {
	var builder strings.Builder
	for _, item := range content {
		switch {
		case item.Content != nil:
			if item.Content.Content.Text != nil {
				builder.WriteString(item.Content.Content.Text.Text)
			}
		case item.Diff != nil:
			builder.WriteString(item.Diff.NewText)
		case item.Terminal != nil:
			builder.WriteString(item.Terminal.TerminalId)
		}
	}
	return builder.String()
}

func (call *toolCall) toolOutput(content []acpsdk.ToolCallContent, rawOutput any) string {
	output := call.contentOutput(content)
	if output == "" && rawOutput != nil {
		return call.formatValue(rawOutput)
	}
	return output
}

type toolUpdateEvents struct {
	message      *console.AgentMessageAttributes
	output       string
	streamOutput bool
	terminal     bool
}

func (call *toolCall) message() *console.AgentMessageAttributes {
	name := call.name
	output := call.output
	if output == "" && (call.state == console.AgentMessageToolStateRunning || call.state == console.AgentMessageToolStatePending) {
		output = runningToolOutput
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
		input := call.formatValue(update.RawInput)
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
