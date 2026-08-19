package claude

import (
	"testing"

	console "github.com/pluralsh/console/go/client"
	v1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
	harnessusage "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/usage"
	"github.com/stretchr/testify/require"
)

func TestClaudeUsageRecordsCacheTokensAsInput(t *testing.T) {
	recorder := harnessusage.New(nil)
	var emitted []*console.AgentMessageAttributes
	emitClaudeContent(&StreamEvent{
		Message: &MessageEvent{
			Role: string(console.AiRoleAssistant),
			Content: []ContentMsg{
				{Type: "text", Text: "done"},
			},
			Usage: &Usage{
				InputTokens:              10,
				OutputTokens:             5,
				CacheCreationInputTokens: 3,
				CacheReadInputTokens:     2,
			},
		},
	}, map[string]ContentMsg{}, recorder, func(message *console.AgentMessageAttributes, _ string) {
		emitted = append(emitted, message)
	})

	require.Len(t, emitted, 1)
	msg := emitted[0]
	require.NotNil(t, msg.Cost)
	require.Equal(t, float64(20), msg.Cost.Total)
	require.Equal(t, float64(15), *msg.Cost.Tokens.Input)
	require.Equal(t, float64(5), *msg.Cost.Tokens.Output)

	attrs := recorder.Attributes()
	require.NotNil(t, attrs)
	require.Equal(t, int64(15), *attrs.InputTokens)
	require.Equal(t, int64(5), *attrs.OutputTokens)
	require.Equal(t, int64(20), *attrs.TotalTokens)
	require.Equal(t, int64(5), *attrs.CachedTokens)
}

func TestClaudeToolUseEmitsRunningThenCompleted(t *testing.T) {
	recorder := harnessusage.New(nil)
	cache := map[string]ContentMsg{}
	var emitted []struct {
		msg    *console.AgentMessageAttributes
		callID string
	}
	cb := func(message *console.AgentMessageAttributes, callID string) {
		emitted = append(emitted, struct {
			msg    *console.AgentMessageAttributes
			callID string
		}{message, callID})
	}

	emitClaudeContent(&StreamEvent{
		Message: &MessageEvent{
			Role: string(console.AiRoleAssistant),
			Content: []ContentMsg{
				{Type: "tool_use", ID: "tool_1", Name: "Bash", Input: map[string]any{"command": "ls"}},
			},
		},
	}, cache, recorder, cb)

	require.Len(t, emitted, 1)
	require.Equal(t, "tool_1", emitted[0].callID)
	require.Equal(t, console.AgentMessageToolStateRunning, *emitted[0].msg.Metadata.Tool.State)
	require.Equal(t, v1.RunningToolOutput, *emitted[0].msg.Metadata.Tool.Output)

	emitClaudeContent(&StreamEvent{
		Message: &MessageEvent{
			Role: string(console.AiRoleUser),
			Content: []ContentMsg{
				{Type: "tool_result", ToolUseID: "tool_1", Content: "ok", IsError: false},
			},
		},
	}, cache, recorder, cb)

	require.Len(t, emitted, 2)
	require.Equal(t, "tool_1", emitted[1].callID)
	require.Equal(t, console.AgentMessageToolStateCompleted, *emitted[1].msg.Metadata.Tool.State)
	require.Equal(t, "ok", *emitted[1].msg.Metadata.Tool.Output)
	require.Equal(t, "Bash", *emitted[1].msg.Metadata.Tool.Name)
}
