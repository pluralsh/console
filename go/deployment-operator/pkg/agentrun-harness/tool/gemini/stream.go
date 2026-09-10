package gemini

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	console "github.com/pluralsh/console/go/client"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/usage"
)

type streamEventType string

const (
	streamEventInit       streamEventType = "init"
	streamEventMessage    streamEventType = "message"
	streamEventToolUse    streamEventType = "tool_use"
	streamEventToolResult streamEventType = "tool_result"
	streamEventError      streamEventType = "error"
	streamEventResult     streamEventType = "result"

	streamRoleUser      = "user"
	streamRoleAssistant = "assistant"

	streamSeverityWarning = "warning"
	streamSeverityError   = "error"

	streamStatusSuccess = "success"
	streamStatusError   = "error"
)

type streamEvent struct {
	Type streamEventType `json:"type"`
}

type streamInitEvent struct {
	SessionID string `json:"session_id"`
	Model     string `json:"model"`
}

type streamMessageEvent struct {
	Role    string  `json:"role"`
	Content *string `json:"content"`
	Delta   *bool   `json:"delta,omitempty"`
}

type streamToolUseEvent struct {
	ToolName   string          `json:"tool_name"`
	ToolID     string          `json:"tool_id"`
	Parameters json.RawMessage `json:"parameters"`
}

type streamToolResultEvent struct {
	ToolID string             `json:"tool_id"`
	Status string             `json:"status"`
	Output *string            `json:"output,omitempty"`
	Error  *streamResultError `json:"error,omitempty"`
}

type streamErrorEvent struct {
	Severity string `json:"severity"`
	Message  string `json:"message"`
}

type streamResultEvent struct {
	Status string             `json:"status"`
	Error  *streamResultError `json:"error,omitempty"`
	Stats  *streamStats       `json:"stats"`
}

type streamResultError struct {
	Type    string `json:"type"`
	Message string `json:"message"`
}

type streamStats struct {
	TotalTokens  int64 `json:"total_tokens"`
	InputTokens  int64 `json:"input_tokens"`
	OutputTokens int64 `json:"output_tokens"`
	CachedTokens int64 `json:"cached"`
	DurationMS   int64 `json:"duration_ms"`
	ToolCalls    int64 `json:"tool_calls"`
}

type streamToolCall struct {
	name  string
	input string
}

type streamTurn struct {
	sink               toolv1.TurnSink
	sessionID          string
	err                error
	streamErrorMessage string
	assistant          strings.Builder
	tools              map[string]streamToolCall
}

func newStreamTurn(sessionID string, sink toolv1.TurnSink) *streamTurn {
	return &streamTurn{
		sink:      sink,
		sessionID: sessionID,
		tools:     make(map[string]streamToolCall),
	}
}

func (turn *streamTurn) consume(line []byte) {
	trimmed := bytes.TrimSpace(line)
	if len(trimmed) == 0 || trimmed[0] != '{' {
		return
	}

	base := streamEvent{}
	if err := json.Unmarshal(trimmed, &base); err != nil {
		turn.recordError(fmt.Errorf("decode gemini stream event: %w", err))
		return
	}

	var err error
	switch base.Type {
	case streamEventInit:
		err = turn.handleInit(trimmed)
	case streamEventMessage:
		err = turn.handleMessage(trimmed)
	case streamEventToolUse:
		err = turn.handleToolUse(trimmed)
	case streamEventToolResult:
		err = turn.handleToolResult(trimmed)
	case streamEventError:
		err = turn.handleError(trimmed)
	case streamEventResult:
		err = turn.handleResult(trimmed)
	default:
		return
	}
	turn.recordError(err)
}

func (turn *streamTurn) handleInit(line []byte) error {
	event := streamInitEvent{}
	if err := json.Unmarshal(line, &event); err != nil {
		return fmt.Errorf("decode gemini init event: %w", err)
	}
	if event.SessionID == "" || event.Model == "" {
		return errors.New("invalid gemini init event: session id and model are required")
	}

	turn.sessionID = event.SessionID
	turn.sink.Session(event.SessionID)
	return nil
}

func (turn *streamTurn) handleMessage(line []byte) error {
	event := streamMessageEvent{}
	if err := json.Unmarshal(line, &event); err != nil {
		return fmt.Errorf("decode gemini message event: %w", err)
	}
	if event.Content == nil {
		return errors.New("invalid gemini message event: content is required")
	}

	switch event.Role {
	case streamRoleUser:
		return nil
	case streamRoleAssistant:
		if event.Delta == nil || !*event.Delta {
			return errors.New("invalid gemini message event: assistant message must be a delta")
		}
		turn.assistant.WriteString(*event.Content)
		return nil
	default:
		return fmt.Errorf("invalid gemini message event: unsupported role %q", event.Role)
	}
}

func (turn *streamTurn) handleToolUse(line []byte) error {
	event := streamToolUseEvent{}
	if err := json.Unmarshal(line, &event); err != nil {
		return fmt.Errorf("decode gemini tool use event: %w", err)
	}
	if event.ToolID == "" || event.ToolName == "" {
		return errors.New("invalid gemini tool use event: tool id and name are required")
	}
	if _, exists := turn.tools[event.ToolID]; exists {
		return fmt.Errorf("invalid gemini tool use event: tool %q was started twice", event.ToolID)
	}
	input, err := event.input()
	if err != nil {
		return err
	}

	turn.flushAssistant(nil)
	turn.tools[event.ToolID] = streamToolCall{name: event.ToolName, input: input}
	state := console.AgentMessageToolStateRunning
	output := toolv1.RunningToolOutput
	turn.sink.Message(&console.AgentMessageAttributes{
		Role:    console.AiRoleAssistant,
		Message: "Called tool",
		Metadata: &console.AgentMessageMetadataAttributes{
			Tool: &console.AgentMessageToolAttributes{
				Name: &event.ToolName, State: &state, Input: &input, Output: &output,
			},
		},
	}, event.ToolID)
	return nil
}

func (turn *streamTurn) handleToolResult(line []byte) error {
	event := streamToolResultEvent{}
	if err := json.Unmarshal(line, &event); err != nil {
		return fmt.Errorf("decode gemini tool result event: %w", err)
	}
	if event.ToolID == "" {
		return errors.New("invalid gemini tool result event: tool id is required")
	}
	call, exists := turn.tools[event.ToolID]
	if !exists {
		return fmt.Errorf("invalid gemini tool result event: tool %q was not started", event.ToolID)
	}

	state := console.AgentMessageToolStateCompleted
	switch event.Status {
	case streamStatusSuccess:
	case streamStatusError:
		state = console.AgentMessageToolStateError
		if event.Error == nil || event.Error.Message == "" {
			return fmt.Errorf("invalid gemini tool result event: tool %q error is required", event.ToolID)
		}
	default:
		return fmt.Errorf("invalid gemini tool result event: unsupported status %q", event.Status)
	}

	output := ""
	if event.Output != nil {
		output = *event.Output
	} else if event.Error != nil {
		output = event.Error.Message
	}
	turn.sink.Message(&console.AgentMessageAttributes{
		Role:    console.AiRoleAssistant,
		Message: "Called tool",
		Metadata: &console.AgentMessageMetadataAttributes{
			Tool: &console.AgentMessageToolAttributes{
				Name: &call.name, State: &state, Input: &call.input, Output: &output,
			},
		},
	}, event.ToolID)
	delete(turn.tools, event.ToolID)
	return nil
}

func (turn *streamTurn) handleError(line []byte) error {
	event := streamErrorEvent{}
	if err := json.Unmarshal(line, &event); err != nil {
		return fmt.Errorf("decode gemini error event: %w", err)
	}
	if event.Message == "" {
		return errors.New("invalid gemini error event: message is required")
	}

	prefix := ""
	switch event.Severity {
	case streamSeverityWarning:
		prefix = "Warning"
	case streamSeverityError:
		prefix = "Error"
		turn.streamErrorMessage = event.Message
	default:
		return fmt.Errorf("invalid gemini error event: unsupported severity %q", event.Severity)
	}
	turn.sink.Message(&console.AgentMessageAttributes{
		Role: console.AiRoleSystem, Message: fmt.Sprintf("%s: %s", prefix, event.Message),
	}, "")
	return nil
}

func (turn *streamTurn) handleResult(line []byte) error {
	event := streamResultEvent{}
	if err := json.Unmarshal(line, &event); err != nil {
		return fmt.Errorf("decode gemini result event: %w", err)
	}
	if event.Status != streamStatusSuccess && event.Status != streamStatusError {
		return fmt.Errorf("invalid gemini result event: unsupported status %q", event.Status)
	}
	if event.Error != nil && event.Error.Message == "" {
		return errors.New("invalid gemini result event: error message is required")
	}
	if event.Stats == nil {
		return errors.New("invalid gemini result event: stats are required")
	}
	if err := event.Stats.validate(); err != nil {
		return err
	}

	turn.sink.Usage(event.Stats.usage())
	turn.flushAssistant(event.Stats)
	if event.Status == streamStatusSuccess {
		return nil
	}
	if event.Error != nil {
		return fmt.Errorf("gemini result error: %s", event.Error.Message)
	}
	if turn.streamErrorMessage != "" {
		return fmt.Errorf("gemini result error: %s", turn.streamErrorMessage)
	}
	return errors.New("gemini result status is error")
}

func (turn *streamTurn) flushAssistant(stats *streamStats) {
	message := turn.assistant.String()
	if message == "" {
		return
	}
	turn.assistant.Reset()

	attributes := &console.AgentMessageAttributes{Role: console.AiRoleAssistant, Message: message}
	if stats != nil {
		input := float64(max(stats.InputTokens, 0))
		output := float64(max(stats.OutputTokens, 0))
		attributes.Cost = &console.AgentMessageCostAttributes{
			Tokens: &console.AgentMessageTokensAttributes{Input: &input, Output: &output},
		}
	}
	turn.sink.Message(attributes, "")
}

func (turn *streamTurn) recordError(err error) {
	if err != nil {
		turn.err = errors.Join(turn.err, err)
	}
}

func (event streamToolUseEvent) input() (string, error) {
	parameters := map[string]json.RawMessage{}
	if len(event.Parameters) == 0 || json.Unmarshal(event.Parameters, &parameters) != nil || parameters == nil {
		return "", errors.New("invalid gemini tool use event: parameters must be an object")
	}

	buffer := new(bytes.Buffer)
	if err := json.Compact(buffer, event.Parameters); err != nil {
		return "", fmt.Errorf("compact gemini tool input: %w", err)
	}
	return buffer.String(), nil
}

func (stats streamStats) validate() error {
	if stats.TotalTokens < 0 || stats.InputTokens < 0 || stats.OutputTokens < 0 ||
		stats.CachedTokens < 0 || stats.DurationMS < 0 || stats.ToolCalls < 0 {
		return errors.New("invalid gemini result event: stats cannot be negative")
	}
	return nil
}

func (stats streamStats) usage() usage.Record {
	total := max(stats.TotalTokens, stats.InputTokens+stats.OutputTokens)
	return usage.Record{
		InputTokens:  stats.InputTokens,
		OutputTokens: stats.OutputTokens,
		TotalTokens:  total,
		CachedTokens: stats.CachedTokens,
	}
}
