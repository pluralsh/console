package acp

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	acpsdk "github.com/coder/acp-go-sdk"
	"k8s.io/klog/v2"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/usage"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
)

type turnState struct {
	tool           *Tool
	mu             sync.Mutex
	sessionIDValue string
	errValue       error
	assistant      strings.Builder
	reasoning      strings.Builder
	tools          map[string]*toolCall
	cost           float64
	stopFlush      chan struct{}
	flushDone      chan struct{}
}

type toolCall struct {
	id           string
	name         string
	input        string
	output       string
	state        console.AgentMessageToolState
	dirty        bool
	pendingBytes int
	lastFlush    time.Time
}

func newTurn(tool *Tool, sessionID string) *turnState {
	return &turnState{
		tool:           tool,
		sessionIDValue: sessionID,
		tools:          make(map[string]*toolCall),
		stopFlush:      make(chan struct{}),
		flushDone:      make(chan struct{}),
	}
}

func (turn *turnState) startFlusher(ctx context.Context) {
	go func() {
		defer close(turn.flushDone)
		ticker := time.NewTicker(turn.tool.flushInterval)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				turn.flushTools(false)
			case <-turn.stopFlush:
				return
			case <-ctx.Done():
				return
			}
		}
	}()
}

func (turn *turnState) stopFlusher() {
	select {
	case <-turn.stopFlush:
	default:
		close(turn.stopFlush)
	}
	<-turn.flushDone
}

func (turn *turnState) sessionID() string {
	turn.mu.Lock()
	defer turn.mu.Unlock()
	return turn.sessionIDValue
}

func (turn *turnState) setSessionID(sessionID string) {
	turn.mu.Lock()
	turn.sessionIDValue = sessionID
	turn.mu.Unlock()
}

func (turn *turnState) err() error {
	turn.mu.Lock()
	defer turn.mu.Unlock()
	return turn.errValue
}

func (turn *turnState) setErr(err error) {
	if err == nil {
		return
	}
	turn.mu.Lock()
	if turn.errValue == nil {
		turn.errValue = err
	}
	turn.mu.Unlock()
}

func (turn *turnState) handle(notification acpsdk.SessionNotification) error {
	if notification.SessionId != acpsdk.SessionId(turn.sessionID()) {
		err := fmt.Errorf("ACP session update belongs to session %q, expected %q", notification.SessionId, turn.sessionID())
		turn.setErr(err)
		return err
	}
	update := notification.Update
	switch {
	case update.AgentMessageChunk != nil:
		text, err := contentText(update.AgentMessageChunk.Content)
		if err != nil {
			turn.setErr(fmt.Errorf("ACP agent message content: %w", err))
			return err
		}
		turn.mu.Lock()
		turn.assistant.WriteString(text)
		turn.mu.Unlock()
	case update.AgentThoughtChunk != nil:
		text, err := contentText(update.AgentThoughtChunk.Content)
		if err != nil {
			turn.setErr(fmt.Errorf("ACP agent thought content: %w", err))
			return err
		}
		turn.mu.Lock()
		turn.reasoning.WriteString(text)
		turn.mu.Unlock()
	case update.ToolCall != nil:
		return turn.startTool(update.ToolCall)
	case update.ToolCallUpdate != nil:
		return turn.updateTool(update.ToolCallUpdate)
	case update.UsageUpdate != nil:
		turn.usageUpdate(update.UsageUpdate)
	case update.UserMessageChunk != nil:
		if _, err := contentText(update.UserMessageChunk.Content); err != nil {
			turn.setErr(fmt.Errorf("ACP user message content: %w", err))
			return err
		}
	default:
		// Plans, mode/config notifications, and future optional updates do
		// not affect the Console message contract.
		klog.V(log.LogLevelDebug).InfoS("ignoring optional ACP session update")
	}
	return nil
}

func (turn *turnState) startTool(update *acpsdk.SessionUpdateToolCall) error {
	if update.ToolCallId == "" {
		return turn.fail("ACP tool call has an empty id")
	}
	id := string(update.ToolCallId)
	turn.mu.Lock()
	if _, exists := turn.tools[id]; exists {
		turn.mu.Unlock()
		return turn.fail(fmt.Sprintf("ACP tool call %q was started twice", id))
	}
	state, err := toolState(update.Status)
	if err != nil {
		turn.mu.Unlock()
		return turn.fail(err.Error())
	}
	call := &toolCall{
		id:        id,
		name:      toolName(update.Title, update.Kind),
		input:     formatValue(update.RawInput),
		state:     state,
		lastFlush: turn.tool.now(),
	}
	call.output = contentOutput(update.Content)
	call.dirty = true
	turn.tools[id] = call
	message := call.message()
	call.dirty = false
	turn.mu.Unlock()
	turn.tool.emit(message, id)
	return nil
}

func (turn *turnState) updateTool(update *acpsdk.SessionToolCallUpdate) error {
	id := string(update.ToolCallId)
	turn.mu.Lock()
	call, exists := turn.tools[id]
	if !exists {
		turn.mu.Unlock()
		return turn.fail(fmt.Sprintf("ACP tool call update %q arrived before tool_call", id))
	}
	if update.Title != nil {
		call.name = *update.Title
	}
	if update.RawInput != nil {
		call.input = formatValue(update.RawInput)
	}
	output := contentOutput(update.Content)
	if output == "" && update.RawOutput != nil {
		output = formatValue(update.RawOutput)
	}
	if output != "" {
		call.addOutput(output)
	}
	terminal := false
	if update.Status != nil {
		state, err := toolState(*update.Status)
		if err != nil {
			turn.mu.Unlock()
			return turn.fail(err.Error())
		}
		call.state = state
		terminal = state == console.AgentMessageToolStateCompleted || state == console.AgentMessageToolStateError
	}
	message := (*console.AgentMessageAttributes)(nil)
	if terminal {
		message = call.message()
		delete(turn.tools, id)
		call.dirty = false
	} else if call.dirty && call.pendingBytes >= turn.tool.flushBytes {
		message = call.message()
		call.dirty = false
		call.pendingBytes = 0
		call.lastFlush = turn.tool.now()
	}
	turn.mu.Unlock()
	if message != nil {
		turn.tool.emit(message, id)
	}
	return nil
}

func (turn *turnState) flushTools(force bool) {
	turn.mu.Lock()
	type pendingMessage struct {
		id      string
		message *console.AgentMessageAttributes
	}
	messages := make([]pendingMessage, 0)
	now := turn.tool.now()
	for id, call := range turn.tools {
		if !call.dirty {
			continue
		}
		if !force && now.Sub(call.lastFlush) < turn.tool.flushInterval {
			continue
		}
		messages = append(messages, pendingMessage{id: id, message: call.message()})
		call.dirty = false
		call.pendingBytes = 0
		call.lastFlush = now
		_ = id
	}
	turn.mu.Unlock()
	for _, pending := range messages {
		turn.tool.emit(pending.message, pending.id)
	}
}

func (turn *turnState) emitAssistant(responseUsage *acpsdk.Usage) {
	turn.mu.Lock()
	text := turn.assistant.String()
	reasoning := turn.reasoning.String()
	cost := turn.cost
	turn.mu.Unlock()

	message := &console.AgentMessageAttributes{Role: console.AiRoleAssistant, Message: text}
	if reasoning != "" {
		message.Metadata = &console.AgentMessageMetadataAttributes{
			Reasoning: &console.AgentMessageReasoningAttributes{Text: &reasoning},
		}
	}
	if responseUsage != nil {
		input, output, total, cached, thought := normalizeUsage(responseUsage)
		if turn.tool.Config.Usage != nil {
			turn.tool.Config.Usage.RecordUsage(usage.Record{
				InputTokens: input, OutputTokens: output, TotalTokens: total,
				CachedTokens: cached, ReasoningTokens: thought,
			})
		}
		inputValue := float64(input)
		outputValue := float64(output)
		thoughtValue := float64(thought)
		message.Cost = &console.AgentMessageCostAttributes{
			Total: cost,
			Tokens: &console.AgentMessageTokensAttributes{
				Input: &inputValue, Output: &outputValue, Reasoning: &thoughtValue,
			},
		}
	} else {
		klog.V(log.LogLevelDebug).InfoS("ACP prompt response omitted optional usage")
	}
	if message.Cost == nil && cost > 0 {
		message.Cost = &console.AgentMessageCostAttributes{Total: cost}
	}
	if text == "" {
		if message.Cost == nil && reasoning == "" {
			return
		}
		message.Message = "__plrl_ignore__"
	}
	turn.tool.emit(message, "")
}

func (turn *turnState) usageUpdate(update *acpsdk.SessionUsageUpdate) {
	if update.Cost == nil {
		klog.V(log.LogLevelDebug).InfoS("ACP usage update omitted optional cost")
		return
	}
	delta := turn.tool.recordCost(update.Cost.Amount)
	if delta > 0 {
		turn.mu.Lock()
		turn.cost += delta
		turn.mu.Unlock()
		if turn.tool.Config.Usage != nil {
			turn.tool.Config.Usage.RecordUsage(usage.Record{TotalCost: delta})
		}
	}
}

func (turn *turnState) fail(message string) error {
	err := errors.New(message)
	turn.setErr(err)
	return err
}

func (call *toolCall) addOutput(output string) {
	if output == "" || output == call.output {
		return
	}
	previous := call.output
	call.output = output
	if strings.HasPrefix(output, previous) {
		call.pendingBytes += len(output) - len(previous)
	} else {
		call.pendingBytes += len(output)
	}
	call.dirty = true
}
