package controller

import (
	"cmp"
	"context"
	"slices"
	"time"

	gqlclient "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
	"github.com/samber/lo"
	"k8s.io/klog/v2"
)

const (
	// defaultToolCallCreateDelay is how long an open tool call's message is held back, so tools
	// that finish within it are created once, already terminal, instead of created then updated.
	defaultToolCallCreateDelay = time.Second
	// pendingToolCallFlushTimeout bounds creating held-back tool calls when the run ends.
	pendingToolCallFlushTimeout = 10 * time.Second
)

// pendingToolCall is an open tool call whose message hasn't been created yet.
type pendingToolCall struct {
	message gqlclient.AgentMessageAttributes
	// output is the latest accumulated stdout, written once the message exists.
	output string
	// seq orders held-back calls by when they started.
	seq   uint64
	timer *time.Timer
}

func (in *agentRunController) handleAgentMessage(ctx context.Context, message *gqlclient.AgentMessageAttributes, callID string) {
	if message == nil {
		return
	}

	terminal := isTerminalToolMessage(message)
	if terminal {
		ensureCompletedAt(message)
	}

	in.toolCallWriteMu.Lock()
	defer in.toolCallWriteMu.Unlock()

	if callID == "" {
		in.createInOrder(ctx, message, "")
		return
	}

	if messageID, ok := in.toolCallMessageID(callID); ok {
		_, err := in.consoleClient.UpdateAgentMessage(ctx, messageID, *message)
		if err != nil {
			klog.ErrorS(err, "failed to update agent message", "messageID", messageID, "callID", callID, "message", message)
			return
		}
		if terminal {
			in.discardToolOutput(callID)
			in.deleteToolCallMessageID(callID)
		}
		return
	}

	if pending, ok := in.pendingToolCalls[callID]; ok {
		if !terminal {
			pending.message = *message
			return
		}
		// The terminal message carries the tool's full output, so the held-back output is dropped.
		in.flushPendingBefore(ctx, pending.seq)
		pending.timer.Stop()
		delete(in.pendingToolCalls, callID)
		in.createAgentMessage(ctx, message, callID)
		return
	}

	if isOpenToolMessage(message) {
		in.holdToolCall(ctx, message, callID)
		return
	}

	in.createInOrder(ctx, message, callID)
}

// createInOrder creates message after every held-back tool call, so Console keeps them in the
// order the agent produced them. Callers hold toolCallWriteMu.
func (in *agentRunController) createInOrder(ctx context.Context, message *gqlclient.AgentMessageAttributes, callID string) {
	in.flushPendingBefore(ctx, in.pendingSeq+1)
	in.createAgentMessage(ctx, message, callID)
}

// holdToolCall delays creating an open tool call's message. Callers hold toolCallWriteMu.
func (in *agentRunController) holdToolCall(ctx context.Context, message *gqlclient.AgentMessageAttributes, callID string) {
	if in.pendingToolCalls == nil {
		in.pendingToolCalls = make(map[string]*pendingToolCall)
	}

	delay := in.toolCallCreateDelay
	if delay <= 0 {
		delay = defaultToolCallCreateDelay
	}
	in.pendingSeq++
	seq := in.pendingSeq
	ctx = context.WithoutCancel(ctx)
	in.pendingToolCalls[callID] = &pendingToolCall{
		message: *message,
		seq:     seq,
		timer:   time.AfterFunc(delay, func() { in.flushPendingTimer(ctx, seq) }),
	}
}

// flushPendingTimer creates a held-back call once its delay passes, along with any older ones.
func (in *agentRunController) flushPendingTimer(ctx context.Context, seq uint64) {
	in.toolCallWriteMu.Lock()
	defer in.toolCallWriteMu.Unlock()
	in.flushPendingBefore(ctx, seq+1)
}

// flushPendingToolCalls creates every held-back tool call, for when the run ends before they finish.
func (in *agentRunController) flushPendingToolCalls() {
	in.toolCallWriteMu.Lock()
	defer in.toolCallWriteMu.Unlock()
	if len(in.pendingToolCalls) == 0 {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), pendingToolCallFlushTimeout)
	defer cancel()
	in.flushPendingBefore(ctx, in.pendingSeq+1)
}

// flushPendingBefore creates the held-back calls that started before seq, oldest first. Callers
// hold toolCallWriteMu.
func (in *agentRunController) flushPendingBefore(ctx context.Context, seq uint64) {
	callIDs := lo.Filter(lo.Keys(in.pendingToolCalls), func(callID string, _ int) bool {
		return in.pendingToolCalls[callID].seq < seq
	})
	slices.SortFunc(callIDs, func(a, b string) int {
		return cmp.Compare(in.pendingToolCalls[a].seq, in.pendingToolCalls[b].seq)
	})

	for _, callID := range callIDs {
		pending := in.pendingToolCalls[callID]
		pending.timer.Stop()
		delete(in.pendingToolCalls, callID)
		messageID, ok := in.createAgentMessage(ctx, &pending.message, callID)
		if ok && pending.output != "" && in.output != nil {
			in.output.Write(callID, messageID, pending.output)
		}
	}
}

// createAgentMessage creates message and tracks its ID for open tool calls, returning it if tracked.
func (in *agentRunController) createAgentMessage(ctx context.Context, message *gqlclient.AgentMessageAttributes, callID string) (string, bool) {
	created, err := in.consoleClient.CreateAgentMessage(ctx, in.agentRunID, *message)
	if err != nil {
		klog.ErrorS(err, "failed to create agent message", "callID", callID, "message", message)
		return "", false
	}
	if callID == "" || created == nil || created.ID == "" || !isOpenToolMessage(message) {
		return "", false
	}
	in.setToolCallMessageID(callID, created.ID)
	return created.ID, true
}

func (in *agentRunController) handleToolOutput(callID, stdout string) {
	if callID == "" || stdout == "" {
		return
	}

	in.toolCallWriteMu.Lock()
	defer in.toolCallWriteMu.Unlock()
	if pending, ok := in.pendingToolCalls[callID]; ok {
		pending.output = stdout
		return
	}

	messageID, ok := in.toolCallMessageID(callID)
	if !ok {
		klog.V(log.LogLevelDebug).InfoS("ignoring untracked agent message output", "callID", callID)
		return
	}
	if in.output == nil {
		return
	}
	in.output.Write(callID, messageID, stdout)
}

func (in *agentRunController) discardToolOutput(callID string) {
	if in.output == nil || callID == "" {
		return
	}
	in.output.Discard(callID)
}

func (in *agentRunController) ensureToolCallMessageIDs() {
	in.toolCallMu.Lock()
	defer in.toolCallMu.Unlock()
	if in.toolCallMessageIDs == nil {
		in.toolCallMessageIDs = make(map[string]string)
	}
}

func (in *agentRunController) toolCallMessageID(callID string) (string, bool) {
	in.toolCallMu.RLock()
	defer in.toolCallMu.RUnlock()
	messageID, ok := in.toolCallMessageIDs[callID]
	return messageID, ok
}

func (in *agentRunController) setToolCallMessageID(callID, messageID string) {
	in.toolCallMu.Lock()
	defer in.toolCallMu.Unlock()
	if in.toolCallMessageIDs == nil {
		in.toolCallMessageIDs = make(map[string]string)
	}
	in.toolCallMessageIDs[callID] = messageID
}

func (in *agentRunController) deleteToolCallMessageID(callID string) {
	in.toolCallMu.Lock()
	defer in.toolCallMu.Unlock()
	delete(in.toolCallMessageIDs, callID)
}

func isOpenToolMessage(message *gqlclient.AgentMessageAttributes) bool {
	state := toolState(message)
	return state == gqlclient.AgentMessageToolStateRunning || state == gqlclient.AgentMessageToolStatePending
}

func isTerminalToolMessage(message *gqlclient.AgentMessageAttributes) bool {
	state := toolState(message)
	return state == gqlclient.AgentMessageToolStateCompleted || state == gqlclient.AgentMessageToolStateError
}

func toolState(message *gqlclient.AgentMessageAttributes) gqlclient.AgentMessageToolState {
	if message == nil || message.Metadata == nil || message.Metadata.Tool == nil || message.Metadata.Tool.State == nil {
		return ""
	}
	return *message.Metadata.Tool.State
}

func ensureCompletedAt(message *gqlclient.AgentMessageAttributes) {
	if message.Metadata == nil {
		message.Metadata = &gqlclient.AgentMessageMetadataAttributes{}
	}
	if message.Metadata.CompletedAt != nil && *message.Metadata.CompletedAt != "" {
		return
	}
	message.Metadata.CompletedAt = lo.ToPtr(time.Now().UTC().Format(time.RFC3339Nano))
}
