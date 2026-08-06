package controller

import (
	"context"
	"time"

	gqlclient "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
	"k8s.io/klog/v2"
)

func (in *agentRunController) handleAgentMessage(ctx context.Context, message *gqlclient.AgentMessageAttributes, callID string) {
	if message == nil {
		return
	}

	if isTerminalToolMessage(message) {
		ensureCompletedAt(message)
	}

	if callID != "" {
		if messageID, ok := in.toolCallMessageIDs[callID]; ok {
			_, err := in.consoleClient.UpdateAgentMessage(ctx, messageID, *message)
			if err != nil {
				klog.ErrorS(err, "failed to update agent message", "messageID", messageID, "callID", callID, "message", message)
				return
			}
			if isTerminalToolMessage(message) {
				delete(in.toolCallMessageIDs, callID)
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
		in.ensureToolCallMessageIDs()
		in.toolCallMessageIDs[callID] = created.ID
	}
}

func (in *agentRunController) ensureToolCallMessageIDs() {
	if in.toolCallMessageIDs == nil {
		in.toolCallMessageIDs = make(map[string]string)
	}
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
