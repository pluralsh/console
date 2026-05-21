package codex

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/samber/lo"
	"k8s.io/klog/v2"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
)

func (in *Codex) resetToolItems() {
	in.toolItems = make(map[string]*StreamItem)
}

func (in *Codex) handleStreamLine(line []byte) {
	event := &StreamEvent{}
	if err := json.Unmarshal(line, event); err != nil {
		klog.V(log.LogLevelExtended).InfoS("failed to unmarshal codex stream event", "line", string(line))
		return
	}

	if event.Type == streamEventTypeThreadStarted && event.ThreadID != "" {
		in.threadID = event.ThreadID
		klog.V(log.LogLevelDebug).InfoS("codex thread started", "thread_id", in.threadID)
	}

	msg := in.mapStreamEvent(event)
	if in.onMessage != nil && msg != nil {
		in.onMessage(msg)
	}
}

// mapStreamEvent converts a Codex CLI JSON stream event (codex exec --json) into
// AgentMessageAttributes. See https://takopi.dev/reference/runners/codex/exec-json-cheatsheet/
func (in *Codex) mapStreamEvent(event *StreamEvent) *console.AgentMessageAttributes {
	switch event.Type {
	case streamEventTypeItemStarted:
		in.cacheToolItem(event.Item)
		return nil
	case streamEventTypeItemCompleted:
		if event.Item == nil {
			return nil
		}
		item := in.mergeToolItem(event.Item)
		return mapCompletedStreamItem(item, in.threadID)
	case streamEventTypeTurnCompleted:
		if event.Usage == nil {
			return nil
		}
		totalTokens := float64(event.Usage.InputTokens + event.Usage.OutputTokens)
		return &console.AgentMessageAttributes{
			Role:    console.AiRoleAssistant,
			Message: "turn.completed",
			Cost: &console.AgentMessageCostAttributes{
				Total: totalTokens,
				Tokens: &console.AgentMessageTokensAttributes{
					Input:  lo.ToPtr(float64(event.Usage.InputTokens)),
					Output: lo.ToPtr(float64(event.Usage.OutputTokens)),
				},
			},
		}
	case streamEventTypeTurnFailed:
		msg := ""
		if event.Error != nil {
			msg = event.Error.Message
		}
		if msg == "" {
			return nil
		}
		return &console.AgentMessageAttributes{
			Role:    console.AiRoleAssistant,
			Message: msg,
		}
	case "error":
		return &console.AgentMessageAttributes{
			Role:    console.AiRoleAssistant,
			Message: event.Message,
		}
	}
	return nil
}

func (in *Codex) cacheToolItem(item *StreamItem) {
	if item == nil || item.ID == "" {
		return
	}
	switch item.Type {
	case "mcp_tool_call", "command_execution", streamItemTypeDynamicToolCall:
		in.toolItems[item.ID] = item
	}
}

func (in *Codex) mergeToolItem(item *StreamItem) *StreamItem {
	if item == nil || item.ID == "" {
		return item
	}
	cached, ok := in.toolItems[item.ID]
	delete(in.toolItems, item.ID)
	if !ok {
		return item
	}

	merged := *item
	if isJSONNull(merged.Arguments) {
		merged.Arguments = cached.Arguments
	}
	if merged.Command == "" {
		merged.Command = cached.Command
	}
	if merged.Server == "" {
		merged.Server = cached.Server
	}
	if merged.Tool == "" {
		merged.Tool = cached.Tool
	}
	if merged.Namespace == "" {
		merged.Namespace = cached.Namespace
	}
	return &merged
}

func mapCompletedStreamItem(item *StreamItem, threadID string) *console.AgentMessageAttributes {
	switch item.Type {
	case "error":
		msg := lo.Ternary(len(item.Message) == 0, item.Text, item.Message)
		if len(msg) == 0 {
			return nil
		}

		klog.V(log.LogLevelDebug).InfoS("codex item error", "message", msg, "thread_id", threadID)
		return &console.AgentMessageAttributes{
			Role:    console.AiRoleAssistant,
			Message: msg,
		}
	case "reasoning":
		// Reasoning summaries are not forwarded to the console API.
		return nil

	case "agent_message":
		if item.Text == "" {
			return nil
		}
		klog.V(log.LogLevelDebug).InfoS("codex agent message", "text", item.Text, "thread_id", threadID)
		return &console.AgentMessageAttributes{
			Role:    console.AiRoleAssistant,
			Message: item.Text,
		}

	case "command_execution":
		return mapCommandExecutionItem(item, threadID)

	case streamItemTypeDynamicToolCall:
		return mapDynamicToolCallItem(item, threadID)

	case "mcp_tool_call":
		return mapMCPToolCallItem(item, threadID)

	case "file_change":
		return mapFileChangeItem(item, threadID)

	case "web_search":
		return mapWebSearchItem(item, threadID)
	}

	return nil
}

func mapCommandExecutionItem(item *StreamItem, threadID string) *console.AgentMessageAttributes {
	if item.Status != statusCompleted && item.Status != statusFailed {
		return nil
	}
	exitCode := 0
	if item.ExitCode != nil {
		exitCode = *item.ExitCode
	}
	state := console.AgentMessageToolStateCompleted
	if item.Status == statusFailed || exitCode != 0 {
		state = console.AgentMessageToolStateError
	}
	klog.V(log.LogLevelDebug).InfoS("codex command execution", "command", item.Command, "exit_code", exitCode, "thread_id", threadID)
	return toolCallMessage(
		"command_execution",
		state,
		formatCommandInput(item.Command),
		item.AggregatedOutput,
	)
}

func mapDynamicToolCallItem(item *StreamItem, threadID string) *console.AgentMessageAttributes {
	state, ok := dynamicToolState(item)
	if !ok {
		return nil
	}
	toolName := resolveDynamicToolName(item)
	output := formatDynamicToolOutput(item)
	klog.V(log.LogLevelDebug).InfoS(
		"codex dynamic tool call",
		"tool", toolName,
		"namespace", item.Namespace,
		"status", item.Status,
		"thread_id", threadID,
	)
	return toolCallMessage(
		toolName,
		state,
		formatDynamicToolInput(item),
		output,
	)
}

func mapMCPToolCallItem(item *StreamItem, threadID string) *console.AgentMessageAttributes {
	if item.Status != statusCompleted && item.Status != statusFailed {
		return nil
	}
	state := console.AgentMessageToolStateCompleted
	if item.Status == statusFailed {
		state = console.AgentMessageToolStateError
	}
	output := formatMCPOutput(item)
	klog.V(log.LogLevelDebug).InfoS(
		"codex mcp tool call",
		"server", item.Server,
		"tool", item.Tool,
		"status", item.Status,
		"thread_id", threadID,
	)
	return toolCallMessage(
		"mcp_tool_call",
		state,
		formatMCPInput(item.Server, item.Tool, item.Arguments),
		output,
	)
}

func mapFileChangeItem(item *StreamItem, threadID string) *console.AgentMessageAttributes {
	if item.Status != statusCompleted && item.Status != statusFailed {
		return nil
	}
	state := console.AgentMessageToolStateCompleted
	if item.Status == statusFailed {
		state = console.AgentMessageToolStateError
	}
	paths := make([]string, 0, len(item.Changes))
	for _, c := range item.Changes {
		paths = append(paths, fmt.Sprintf("%s:%s", c.Kind, c.Path))
	}
	output := strings.Join(paths, ", ")
	input, _ := json.Marshal(item.Changes)
	klog.V(log.LogLevelDebug).InfoS("codex file change", "changes", output, "thread_id", threadID)
	return toolCallMessage("file_change", state, string(input), output)
}

func mapWebSearchItem(item *StreamItem, threadID string) *console.AgentMessageAttributes {
	if item.Query == "" {
		return nil
	}
	klog.V(log.LogLevelDebug).InfoS("codex web search", "query", item.Query, "thread_id", threadID)
	input, _ := json.Marshal(map[string]string{"query": item.Query})
	return toolCallMessage("web_search", console.AgentMessageToolStateCompleted, string(input), "")
}

func toolCallMessage(name string, state console.AgentMessageToolState, input, output string) *console.AgentMessageAttributes {
	tool := &console.AgentMessageToolAttributes{
		Name:  lo.ToPtr(name),
		State: lo.ToPtr(state),
	}
	if input != "" {
		tool.Input = lo.ToPtr(input)
	}
	if output != "" {
		tool.Output = lo.ToPtr(output)
	}
	return &console.AgentMessageAttributes{
		Role:    console.AiRoleAssistant,
		Message: "Called tool",
		Metadata: &console.AgentMessageMetadataAttributes{
			Tool: tool,
		},
	}
}

func formatMCPInput(server, tool string, arguments json.RawMessage) string {
	payload := map[string]any{
		"server": server,
		"tool":   tool,
	}
	if hasJSONContent(arguments) {
		var args map[string]any
		if err := json.Unmarshal(arguments, &args); err == nil {
			for k, v := range args {
				payload[k] = v
			}
		}
	}
	encoded, err := json.Marshal(payload)
	if err != nil {
		return formatToolArguments(arguments)
	}
	return string(encoded)
}

func dynamicToolState(item *StreamItem) (console.AgentMessageToolState, bool) {
	switch item.Status {
	case statusCompleted:
		if item.Success != nil && !*item.Success {
			return console.AgentMessageToolStateError, true
		}
		return console.AgentMessageToolStateCompleted, true
	case statusFailed:
		return console.AgentMessageToolStateError, true
	default:
		return "", false
	}
}

func resolveDynamicToolName(item *StreamItem) string {
	if item.Tool != "" {
		return item.Tool
	}
	return streamItemTypeDynamicToolCall
}

func formatDynamicToolInput(item *StreamItem) string {
	payload := map[string]any{}
	if item.Namespace != "" {
		payload["namespace"] = item.Namespace
	}
	if item.Tool != "" {
		payload["tool"] = item.Tool
	}
	if hasJSONContent(item.Arguments) {
		var args map[string]any
		if err := json.Unmarshal(item.Arguments, &args); err == nil {
			for k, v := range args {
				payload[k] = v
			}
		}
	}
	if len(payload) == 0 {
		return formatToolArguments(item.Arguments)
	}
	encoded, err := json.Marshal(payload)
	if err != nil {
		return formatToolArguments(item.Arguments)
	}
	return string(encoded)
}

func formatDynamicToolOutput(item *StreamItem) string {
	if item.Error != nil && item.Error.Message != "" {
		return item.Error.Message
	}
	var parts []string
	for _, block := range item.ContentItems {
		switch block.Type {
		case "input_text", "text":
			if block.Text != "" {
				parts = append(parts, block.Text)
			}
		default:
			if encoded, err := json.Marshal(block); err == nil {
				parts = append(parts, string(encoded))
			}
		}
	}
	if len(parts) > 0 {
		return strings.Join(parts, "\n")
	}
	return formatMCPOutput(item)
}

func formatCommandInput(command string) string {
	if command == "" {
		return ""
	}
	input, err := json.Marshal(map[string]string{"command": command})
	if err != nil {
		return command
	}
	return string(input)
}

func isJSONNull(raw json.RawMessage) bool {
	return len(raw) == 0 || string(raw) == jsonNullLiteral
}

func hasJSONContent(raw json.RawMessage) bool {
	return len(raw) > 0 && string(raw) != jsonNullLiteral
}

func formatToolArguments(arguments json.RawMessage) string {
	if isJSONNull(arguments) {
		return ""
	}
	if !json.Valid(arguments) {
		return string(arguments)
	}
	return string(arguments)
}

func formatMCPOutput(item *StreamItem) string {
	if item.Error != nil && item.Error.Message != "" {
		return item.Error.Message
	}
	if item.Result == nil {
		return ""
	}
	if hasJSONContent(item.Result.StructuredContent) {
		return formatToolArguments(item.Result.StructuredContent)
	}
	var parts []string
	for _, block := range item.Result.Content {
		switch block.Type {
		case "text":
			if block.Text != "" {
				parts = append(parts, block.Text)
			}
		default:
			if encoded, err := json.Marshal(block); err == nil {
				parts = append(parts, string(encoded))
			}
		}
	}
	if len(parts) > 0 {
		return strings.Join(parts, "\n")
	}
	if encoded, err := json.Marshal(item.Result); err == nil {
		return string(encoded)
	}
	return ""
}
