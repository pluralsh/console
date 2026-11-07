package controller

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	gqlclient "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/output"
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
		agentRunID:          "run-1",
		consoleClient:       m,
		toolCallMessageIDs:  map[string]string{},
		toolCallCreateDelay: time.Millisecond,
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

	waitForToolCallMessage(t, in, "item_1")
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

func waitForToolCallMessage(t *testing.T, in *agentRunController, callID string) {
	t.Helper()
	require.Eventually(t, func() bool {
		_, ok := in.toolCallMessageID(callID)
		return ok
	}, 5*time.Second, time.Millisecond)
}

func TestHandleToolOutputStreamsStdout(t *testing.T) {
	t.Parallel()

	m := mocks.NewClientMock(t)
	m.On("CreateAgentMessage", mock.Anything, "run-1", mock.Anything).
		Return(&gqlclient.CreateAgentMessage_CreateAgentMessage{ID: "msg-1", Message: "Called tool"}, nil).Once()
	m.On("AgentMessageOutput", mock.Anything, mock.MatchedBy(func(attrs gqlclient.AgentMessageOutputAttributes) bool {
		return attrs.MessageID == "msg-1" && attrs.Stdout != nil && *attrs.Stdout == "hello"
	})).Return(nil).Once()
	m.On("UpdateAgentMessage", mock.Anything, "msg-1", mock.Anything).
		Return(&gqlclient.UpdateAgentMessage_UpdateAgentMessage{ID: "msg-1", Message: "Called tool"}, nil).Once()

	in := &agentRunController{
		agentRunID:          "run-1",
		consoleClient:       m,
		toolCallMessageIDs:  map[string]string{},
		output:              output.New(context.Background(), m).WithSizeLimit(len("hello")).WithFlushInterval(time.Hour),
		toolCallCreateDelay: time.Millisecond,
	}

	in.handleAgentMessage(context.Background(), &gqlclient.AgentMessageAttributes{
		Role:    gqlclient.AiRoleAssistant,
		Message: "Called tool",
		Metadata: &gqlclient.AgentMessageMetadataAttributes{
			Tool: &gqlclient.AgentMessageToolAttributes{
				Name:   lo.ToPtr("bash"),
				State:  lo.ToPtr(gqlclient.AgentMessageToolStateRunning),
				Output: lo.ToPtr(v1.RunningToolOutput),
			},
		},
	}, "call-1")

	waitForToolCallMessage(t, in, "call-1")
	in.handleToolOutput("call-1", "hello")
	in.handleAgentMessage(context.Background(), &gqlclient.AgentMessageAttributes{
		Role:    gqlclient.AiRoleAssistant,
		Message: "Called tool",
		Metadata: &gqlclient.AgentMessageMetadataAttributes{
			Tool: &gqlclient.AgentMessageToolAttributes{
				Name:   lo.ToPtr("bash"),
				State:  lo.ToPtr(gqlclient.AgentMessageToolStateCompleted),
				Output: lo.ToPtr("hello"),
			},
		},
	}, "call-1")
}

func TestHandleAgentMessageCorrelatesRecoveredTerminalToolCall(t *testing.T) {
	t.Parallel()

	m := mocks.NewClientMock(t)
	m.On("CreateAgentMessage", mock.Anything, "run-1", mock.MatchedBy(func(attrs gqlclient.AgentMessageAttributes) bool {
		return attrs.Metadata != nil && attrs.Metadata.Tool != nil && attrs.Metadata.Tool.State != nil &&
			*attrs.Metadata.Tool.State == gqlclient.AgentMessageToolStateRunning
	})).Return(&gqlclient.CreateAgentMessage_CreateAgentMessage{ID: "msg-1", Message: "Called tool"}, nil).Once()
	m.On("UpdateAgentMessage", mock.Anything, "msg-1", mock.MatchedBy(func(attrs gqlclient.AgentMessageAttributes) bool {
		return attrs.Metadata != nil && attrs.Metadata.Tool != nil && attrs.Metadata.Tool.State != nil &&
			*attrs.Metadata.Tool.State == gqlclient.AgentMessageToolStateCompleted
	})).Return(&gqlclient.UpdateAgentMessage_UpdateAgentMessage{ID: "msg-1", Message: "Called tool"}, nil).Once()

	// The terminal message carries the full output, so the unflushed "done" chunk is dropped.
	in := &agentRunController{
		agentRunID:          "run-1",
		consoleClient:       m,
		toolCallMessageIDs:  map[string]string{},
		output:              output.New(t.Context(), m).WithSizeLimit(1024).WithFlushInterval(time.Hour),
		toolCallCreateDelay: time.Millisecond,
	}
	callID := "call-1"
	in.handleAgentMessage(t.Context(), &gqlclient.AgentMessageAttributes{
		Role:    gqlclient.AiRoleAssistant,
		Message: "Called tool",
		Metadata: &gqlclient.AgentMessageMetadataAttributes{Tool: &gqlclient.AgentMessageToolAttributes{
			State:  lo.ToPtr(gqlclient.AgentMessageToolStateRunning),
			Output: lo.ToPtr(v1.RunningToolOutput),
		}},
	}, callID)
	waitForToolCallMessage(t, in, callID)
	in.handleToolOutput(callID, "done")
	in.handleAgentMessage(t.Context(), &gqlclient.AgentMessageAttributes{
		Role:    gqlclient.AiRoleAssistant,
		Message: "Called tool",
		Metadata: &gqlclient.AgentMessageMetadataAttributes{Tool: &gqlclient.AgentMessageToolAttributes{
			State:  lo.ToPtr(gqlclient.AgentMessageToolStateCompleted),
			Output: lo.ToPtr("done"),
		}},
	}, callID)

	_, tracked := in.toolCallMessageID(callID)
	require.False(t, tracked)
	in.output.CloseAll()
	m.AssertNotCalled(t, "AgentMessageOutput", mock.Anything, mock.Anything)
}

func TestHandleAgentMessageKeepsOutputOpenWhenTerminalUpdateFails(t *testing.T) {
	t.Parallel()

	m := mocks.NewClientMock(t)
	m.On("UpdateAgentMessage", mock.Anything, "msg-1", mock.Anything).
		Return(nil, errors.New("unavailable")).Once()
	m.On("AgentMessageOutput", mock.Anything, mock.MatchedBy(func(attrs gqlclient.AgentMessageOutputAttributes) bool {
		return attrs.MessageID == "msg-1" &&
			attrs.Stdout != nil &&
			*attrs.Stdout == "hello world"
	})).Return(nil).Once()

	in := &agentRunController{
		consoleClient:      m,
		toolCallMessageIDs: map[string]string{"call-1": "msg-1"},
		output:             output.New(t.Context(), m).WithSizeLimit(1024).WithFlushInterval(time.Hour),
	}

	in.handleToolOutput("call-1", "hello")
	in.handleAgentMessage(t.Context(), &gqlclient.AgentMessageAttributes{
		Role:    gqlclient.AiRoleAssistant,
		Message: "Called tool",
		Metadata: &gqlclient.AgentMessageMetadataAttributes{
			Tool: &gqlclient.AgentMessageToolAttributes{
				State:  lo.ToPtr(gqlclient.AgentMessageToolStateCompleted),
				Output: lo.ToPtr("hello"),
			},
		},
	}, "call-1")

	_, stillTracked := in.toolCallMessageID("call-1")
	require.True(t, stillTracked)

	in.handleToolOutput("call-1", "hello world")
	in.output.CloseAll()
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

func toolMessage(state gqlclient.AgentMessageToolState, out string) *gqlclient.AgentMessageAttributes {
	return &gqlclient.AgentMessageAttributes{
		Role:    gqlclient.AiRoleAssistant,
		Message: "Called tool",
		Metadata: &gqlclient.AgentMessageMetadataAttributes{Tool: &gqlclient.AgentMessageToolAttributes{
			Name:   lo.ToPtr("bash"),
			State:  lo.ToPtr(state),
			Output: lo.ToPtr(out),
		}},
	}
}

func hasToolState(state gqlclient.AgentMessageToolState) func(gqlclient.AgentMessageAttributes) bool {
	return func(attrs gqlclient.AgentMessageAttributes) bool {
		return attrs.Metadata != nil && attrs.Metadata.Tool != nil && attrs.Metadata.Tool.State != nil &&
			*attrs.Metadata.Tool.State == state
	}
}

func TestHandleAgentMessageCreatesShortToolCallsOnceCompleted(t *testing.T) {
	t.Parallel()

	m := mocks.NewClientMock(t)
	m.On("CreateAgentMessage", mock.Anything, "run-1", mock.MatchedBy(func(attrs gqlclient.AgentMessageAttributes) bool {
		return hasToolState(gqlclient.AgentMessageToolStateCompleted)(attrs) &&
			attrs.Metadata.CompletedAt != nil &&
			*attrs.Metadata.Tool.Output == "hello"
	})).Return(&gqlclient.CreateAgentMessage_CreateAgentMessage{ID: "msg-1"}, nil).Once()

	in := &agentRunController{
		agentRunID:         "run-1",
		consoleClient:      m,
		toolCallMessageIDs: map[string]string{},
		output:             output.New(t.Context(), m).WithSizeLimit(1024).WithFlushInterval(time.Hour),
	}

	in.handleAgentMessage(t.Context(), toolMessage(gqlclient.AgentMessageToolStatePending, ""), "call-1")
	in.handleAgentMessage(t.Context(), toolMessage(gqlclient.AgentMessageToolStateRunning, v1.RunningToolOutput), "call-1")
	in.handleToolOutput("call-1", "hello")
	in.handleAgentMessage(t.Context(), toolMessage(gqlclient.AgentMessageToolStateCompleted, "hello"), "call-1")

	_, tracked := in.toolCallMessageID("call-1")
	require.False(t, tracked)
	require.Empty(t, in.pendingToolCalls)
	in.output.CloseAll()
	m.AssertNotCalled(t, "UpdateAgentMessage", mock.Anything, mock.Anything, mock.Anything)
	m.AssertNotCalled(t, "AgentMessageOutput", mock.Anything, mock.Anything)
}

func TestHandleAgentMessageKeepsHeldToolCallsInOrder(t *testing.T) {
	t.Parallel()

	var created []string
	m := mocks.NewClientMock(t)
	m.On("CreateAgentMessage", mock.Anything, "run-1", mock.Anything).
		Run(func(args mock.Arguments) {
			attrs := args.Get(2).(gqlclient.AgentMessageAttributes)
			created = append(created, attrs.Message+":"+string(lo.FromPtr(attrs.Metadata.Tool.State)))
		}).
		Return(&gqlclient.CreateAgentMessage_CreateAgentMessage{ID: "msg"}, nil)

	in := &agentRunController{
		agentRunID:         "run-1",
		consoleClient:      m,
		toolCallMessageIDs: map[string]string{},
	}

	first, second := toolMessage(gqlclient.AgentMessageToolStateRunning, ""), toolMessage(gqlclient.AgentMessageToolStateRunning, "")
	first.Message, second.Message = "first", "second"
	in.handleAgentMessage(t.Context(), first, "call-1")
	in.handleAgentMessage(t.Context(), second, "call-2")

	done := toolMessage(gqlclient.AgentMessageToolStateCompleted, "")
	done.Message = "second"
	in.handleAgentMessage(t.Context(), done, "call-2")

	require.Equal(t, []string{"first:RUNNING", "second:COMPLETED"}, created)
	_, tracked := in.toolCallMessageID("call-1")
	require.True(t, tracked, "the older call is created as running so it can still be updated")
}

func TestFlushPendingToolCallsCreatesUnfinishedCallsWithTheirOutput(t *testing.T) {
	t.Parallel()

	m := mocks.NewClientMock(t)
	m.On("CreateAgentMessage", mock.Anything, "run-1", mock.MatchedBy(hasToolState(gqlclient.AgentMessageToolStateRunning))).
		Return(&gqlclient.CreateAgentMessage_CreateAgentMessage{ID: "msg-1"}, nil).Once()
	m.On("AgentMessageOutput", mock.Anything, mock.MatchedBy(func(attrs gqlclient.AgentMessageOutputAttributes) bool {
		return attrs.MessageID == "msg-1" && attrs.Stdout != nil && *attrs.Stdout == "hello"
	})).Return(nil).Once()

	in := &agentRunController{
		agentRunID:         "run-1",
		consoleClient:      m,
		toolCallMessageIDs: map[string]string{},
		output:             output.New(t.Context(), m).WithSizeLimit(1024).WithFlushInterval(time.Hour),
	}

	in.handleAgentMessage(t.Context(), toolMessage(gqlclient.AgentMessageToolStateRunning, v1.RunningToolOutput), "call-1")
	in.handleToolOutput("call-1", "hello")
	in.flushPendingToolCalls()
	in.output.CloseAll()

	messageID, tracked := in.toolCallMessageID("call-1")
	require.True(t, tracked)
	require.Equal(t, "msg-1", messageID)
}
