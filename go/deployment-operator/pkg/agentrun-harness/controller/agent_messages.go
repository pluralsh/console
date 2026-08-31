package controller

import (
	"context"
	"time"

	gqlclient "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
	"github.com/samber/lo"
	"k8s.io/klog/v2"
)

func (in *agentRunController) handleAgentMessage(ctx context.Context, message *gqlclient.AgentMessageAttributes, callID string) {
	if message == nil {
		return
	}

	terminal := isTerminalToolMessage(message)
	if terminal {
		ensureCompletedAt(message)
	}

	if callID != "" {
		if messageID, ok := in.toolCallMessageID(callID); ok {
			_, err := in.consoleClient.UpdateAgentMessage(ctx, messageID, *message)
			if err != nil {
				klog.ErrorS(err, "failed to update agent message", "messageID", messageID, "callID", callID, "message", message)
				return
			}
			if terminal {
				in.closeToolOutput(callID)
				in.deleteToolCallMessageID(callID)
			}
			return
		}
	}

	created, err := in.consoleClient.CreateAgentMessage(ctx, in.agentRunID, *message)
	if err != nil {
		klog.ErrorS(err, "failed to create agent message", "callID", callID, "message", message)
		return
	}
	if callID == "" || created == nil || created.ID == "" {
		return
	}
	if isOpenToolMessage(message) {
		in.setToolCallMessageID(callID, created.ID)
	}
}

func (in *agentRunController) handleToolOutput(callID, stdout string) {
	if callID == "" || stdout == "" {
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

func (in *agentRunController) closeToolOutput(callID string) {
	if in.output == nil || callID == "" {
		return
	}
	in.output.Close(callID)
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
