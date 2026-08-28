package acp

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"

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

func toolState(status acpsdk.ToolCallStatus) (console.AgentMessageToolState, error) {
	switch status {
	case acpsdk.ToolCallStatusPending:
		return console.AgentMessageToolStatePending, nil
	case acpsdk.ToolCallStatusInProgress, "":
		return console.AgentMessageToolStateRunning, nil
	case acpsdk.ToolCallStatusCompleted:
		return console.AgentMessageToolStateCompleted, nil
	case acpsdk.ToolCallStatusFailed:
		return console.AgentMessageToolStateError, nil
	default:
		return "", fmt.Errorf("ACP tool call has unknown status %q", status)
	}
}

func toolName(title string, kind acpsdk.ToolKind) string {
	if title != "" {
		return title
	}
	if kind != "" {
		return string(kind)
	}
	return "tool"
}

func contentText(content acpsdk.ContentBlock) (string, error) {
	if content.Text != nil {
		return content.Text.Text, nil
	}
	return "", errors.New("expected text content")
}

func contentOutput(content []acpsdk.ToolCallContent) string {
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

func formatValue(value any) string {
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

func normalizeUsage(providerUsage *acpsdk.Usage) (input, output, total, cached, thought int64) {
	input = int64(max(providerUsage.InputTokens, 0))
	output = int64(max(providerUsage.OutputTokens, 0))
	total = max(int64(max(providerUsage.TotalTokens, 0)), input+output)
	if providerUsage.CachedReadTokens != nil {
		cached += int64(max(*providerUsage.CachedReadTokens, 0))
	}
	if providerUsage.CachedWriteTokens != nil {
		cached += int64(max(*providerUsage.CachedWriteTokens, 0))
	}
	if providerUsage.ThoughtTokens != nil {
		thought = int64(max(*providerUsage.ThoughtTokens, 0))
		if total < input+output+thought {
			total = input + output + thought
		}
	}
	return
}
