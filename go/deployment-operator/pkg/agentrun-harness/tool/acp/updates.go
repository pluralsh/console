package acp

import (
	"errors"
	"fmt"
	"strings"
	"sync"

	acpsdk "github.com/coder/acp-go-sdk"
	"k8s.io/klog/v2"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/usage"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
)

type turnState struct {
	engine         *Engine
	sink           Sink
	mu             sync.Mutex
	sessionIDValue string
	errValue       error
	assistant      strings.Builder
	reasoning      strings.Builder
	tools          map[string]*toolCall
	cost           float64
}

func (turn *turnState) contentText(content acpsdk.ContentBlock) (string, error) {
	if content.Text != nil {
		return content.Text.Text, nil
	}
	return "", errors.New("expected text content")
}

func (turn *turnState) normalizeUsage(providerUsage *acpsdk.Usage) (input, output, total, cached, thought int64) {
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
	if err := turn.bindNotification(notification.SessionId); err != nil {
		return err
	}
	update := notification.Update
	switch {
	case update.AgentMessageChunk != nil:
		return turn.appendTextChunk(update.AgentMessageChunk.Content, &turn.assistant, "agent message")
	case update.AgentThoughtChunk != nil:
		return turn.appendTextChunk(update.AgentThoughtChunk.Content, &turn.reasoning, "agent thought")
	case update.ToolCall != nil:
		return turn.startTool(update.ToolCall)
	case update.ToolCallUpdate != nil:
		return turn.updateTool(update.ToolCallUpdate)
	case update.UsageUpdate != nil:
		turn.usageUpdate(update.UsageUpdate)
	case update.UserMessageChunk != nil:
		if _, err := turn.contentText(update.UserMessageChunk.Content); err != nil {
			turn.setErr(fmt.Errorf("acp user message content: %w", err))
			return err
		}
	default:
		// Plans, mode/config notifications, and future optional updates do
		// not affect the Console message contract.
		klog.V(log.LogLevelDebug).InfoS("ignoring optional ACP session update")
	}
	return nil
}

func (turn *turnState) bindNotification(sessionID acpsdk.SessionId) error {
	if sessionID == "" {
		return turn.fail("acp session update has an empty session id")
	}

	// A trusted ACP child can send updates before NewSession returns. Bind the
	// first non-empty notification provisionally and reconcile it in createSession;
	// buffering those callbacks would add latency and state without protecting
	// this trusted process from a protocol race.
	turn.mu.Lock()
	expected := turn.sessionIDValue
	if expected == "" {
		expected = string(sessionID)
		turn.sessionIDValue = expected
	}
	turn.mu.Unlock()
	if sessionID == acpsdk.SessionId(expected) {
		return nil
	}
	return turn.sessionUpdateMismatch(sessionID, expected)
}

func (turn *turnState) appendTextChunk(content acpsdk.ContentBlock, target *strings.Builder, kind string) error {
	text, err := turn.contentText(content)
	if err != nil {
		turn.setErr(fmt.Errorf("acp %s content: %w", kind, err))
		return err
	}
	turn.mu.Lock()
	target.WriteString(text)
	turn.mu.Unlock()
	return nil
}

func (turn *turnState) sessionUpdateMismatch(actual acpsdk.SessionId, expected string) error {
	err := fmt.Errorf("acp session update belongs to session %q, expected %q", actual, expected)
	turn.setErr(err)
	return err
}

func (turn *turnState) startTool(update *acpsdk.SessionUpdateToolCall) error {
	if update.ToolCallId == "" {
		return turn.fail("acp tool call has an empty id")
	}
	id := string(update.ToolCallId)
	turn.mu.Lock()
	if _, exists := turn.tools[id]; exists {
		turn.mu.Unlock()
		return turn.fail(fmt.Sprintf("acp tool call %q was started twice", id))
	}
	call := &toolCall{id: id}
	call.input = call.formatValue(update.RawInput)
	call.setName(update.Title, update.Kind)
	if _, _, err := call.updateStatus(&update.Status); err != nil {
		turn.mu.Unlock()
		return turn.fail(err.Error())
	}
	call.output = call.toolOutput(update.Content, update.RawOutput)
	turn.tools[id] = call
	message := call.message()
	output := call.output
	turn.mu.Unlock()
	turn.sink.Message(message, id)
	if output != "" {
		turn.sink.ToolCallOutput(id, output)
	}
	return nil
}

func (turn *turnState) updateTool(update *acpsdk.SessionToolCallUpdate) error {
	turn.mu.Lock()
	events, err := turn.applyToolUpdate(update)
	turn.mu.Unlock()
	if err != nil {
		turn.setErr(err)
		return err
	}
	turn.emitToolUpdate(update.ToolCallId, events)
	return nil
}

func (turn *turnState) applyToolUpdate(update *acpsdk.SessionToolCallUpdate) (toolUpdateEvents, error) {
	id := string(update.ToolCallId)
	call, exists := turn.tools[id]
	if !exists {
		return toolUpdateEvents{}, fmt.Errorf("acp tool call update %q arrived before tool_call", id)
	}
	metadataChanged := call.updateMetadata(update)
	previousOutput := call.output
	if output := call.toolOutput(update.Content, update.RawOutput); output != "" {
		call.addOutput(output)
	}
	streamOutput := call.output != previousOutput && (previousOutput == "" || strings.HasPrefix(call.output, previousOutput))
	terminal, statusChanged, err := call.updateStatus(update.Status)
	if err != nil {
		return toolUpdateEvents{}, err
	}
	metadataChanged = metadataChanged || statusChanged
	message := (*console.AgentMessageAttributes)(nil)
	if terminal {
		message = call.message()
		delete(turn.tools, id)
	} else if metadataChanged {
		message = call.message()
	}
	return toolUpdateEvents{
		message:      message,
		output:       call.output,
		streamOutput: streamOutput,
		terminal:     terminal,
	}, nil
}

func (turn *turnState) emitToolUpdate(id acpsdk.ToolCallId, events toolUpdateEvents) {
	if events.streamOutput {
		turn.sink.ToolCallOutput(string(id), events.output)
	}

	if events.message != nil {
		turn.sink.Message(events.message, string(id))
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
		input, output, total, cached, thought := turn.normalizeUsage(responseUsage)
		turn.sink.Usage(usage.Record{
			InputTokens: input, OutputTokens: output, TotalTokens: total,
			CachedTokens: cached, ReasoningTokens: thought,
		})
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
	turn.sink.Message(message, "")
}

func (turn *turnState) usageUpdate(update *acpsdk.SessionUsageUpdate) {
	if update.Cost == nil {
		klog.V(log.LogLevelDebug).InfoS("ACP usage update omitted optional cost")
		return
	}
	delta := turn.engine.costs.RecordCumulativeCost(turn.sessionID(), update.Cost.Amount)
	if delta <= 0 {
		return
	}
	turn.sink.Usage(usage.Record{TotalCost: delta})
	turn.mu.Lock()
	turn.cost += delta
	turn.mu.Unlock()
}

func (turn *turnState) fail(message string) error {
	err := errors.New(message)
	turn.setErr(err)
	return err
}

func newTurn(engine *Engine, sink Sink, sessionID string) *turnState {
	return &turnState{
		engine:         engine,
		sink:           sink,
		sessionIDValue: sessionID,
		tools:          make(map[string]*toolCall),
	}
}
