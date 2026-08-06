package controller

import (
	"context"
	"testing"

	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	gqlclient "github.com/pluralsh/console/go/client"
	v1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/test/mocks"
	"github.com/samber/lo"
)

func TestHandleAgentMessageTwoTurnToolFlow(t *testing.T) {
	t.Parallel()

	m := mocks.NewClientMock(t)
	m.On("CreateAgentMessage", mock.Anything, "run-1", mock.MatchedBy(func(attrs gqlclient.AgentMessageAttributes) bool {
		return attrs.Metadata != nil &&
			attrs.Metadata.Tool != nil &&
			attrs.Metadata.Tool.State != nil &&
			*attrs.Metadata.Tool.State == gqlclient.AgentMessageToolStateRunning &&
			attrs.Metadata.Tool.Output != nil &&
			*attrs.Metadata.Tool.Output == v1.RunningToolOutput
	})).Return(&gqlclient.CreateAgentMessage_CreateAgentMessage{ID: "msg-1", Message: "Called tool"}, nil).Once()

	m.On("UpdateAgentMessage", mock.Anything, "msg-1", mock.MatchedBy(func(attrs gqlclient.AgentMessageAttributes) bool {
		return attrs.Metadata != nil &&
			attrs.Metadata.CompletedAt != nil &&
			*attrs.Metadata.CompletedAt != "" &&
			attrs.Metadata.Tool != nil &&
			attrs.Metadata.Tool.State != nil &&
			*attrs.Metadata.Tool.State == gqlclient.AgentMessageToolStateCompleted &&
			attrs.Metadata.Tool.Output != nil &&
			*attrs.Metadata.Tool.Output == "done"
	})).Return(&gqlclient.UpdateAgentMessage_UpdateAgentMessage{ID: "msg-1", Message: "Called tool"}, nil).Once()

	in := &agentRunController{
		agentRunID:         "run-1",
		consoleClient:      m,
		toolCallMessageIDs: map[string]string{},
	}

	in.handleAgentMessage(context.Background(), &gqlclient.AgentMessageAttributes{
		Role:    gqlclient.AiRoleAssistant,
		Message: "Called tool",
		Metadata: &gqlclient.AgentMessageMetadataAttributes{
			Tool: &gqlclient.AgentMessageToolAttributes{
				Name:   lo.ToPtr("command_execution"),
				State:  lo.ToPtr(gqlclient.AgentMessageToolStateRunning),
				Input:  lo.ToPtr(`{"command":"ls"}`),
				Output: lo.ToPtr(v1.RunningToolOutput),
			},
		},
	}, "item_1")

	require.Equal(t, "msg-1", in.toolCallMessageIDs["item_1"])

	in.handleAgentMessage(context.Background(), &gqlclient.AgentMessageAttributes{
		Role:    gqlclient.AiRoleAssistant,
		Message: "Called tool",
		Metadata: &gqlclient.AgentMessageMetadataAttributes{
			Tool: &gqlclient.AgentMessageToolAttributes{
				Name:   lo.ToPtr("command_execution"),
				State:  lo.ToPtr(gqlclient.AgentMessageToolStateCompleted),
				Input:  lo.ToPtr(`{"command":"ls"}`),
				Output: lo.ToPtr("done"),
			},
		},
	}, "item_1")

	_, stillTracked := in.toolCallMessageIDs["item_1"]
	require.False(t, stillTracked)
}

func TestHandleAgentMessageCreatesWhenCallIDMissing(t *testing.T) {
	t.Parallel()

	m := mocks.NewClientMock(t)
	m.On("CreateAgentMessage", mock.Anything, "run-1", mock.Anything).
		Return(&gqlclient.CreateAgentMessage_CreateAgentMessage{ID: "msg-2", Message: "hello"}, nil).Once()

	in := &agentRunController{
		agentRunID:         "run-1",
		consoleClient:      m,
		toolCallMessageIDs: map[string]string{},
	}

	in.handleAgentMessage(context.Background(), &gqlclient.AgentMessageAttributes{
		Role:    gqlclient.AiRoleAssistant,
		Message: "hello",
	}, "")
}
