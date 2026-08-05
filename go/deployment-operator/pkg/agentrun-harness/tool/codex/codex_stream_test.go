package codex

import (
	"encoding/json"
	"testing"

	console "github.com/pluralsh/console/go/client"
	v1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
	harnessusage "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/usage"
	"github.com/stretchr/testify/require"
)

func TestMapDynamicToolCallReadFile(t *testing.T) {
	line := `{"type":"item.completed","item":{"id":"item_8","type":"dynamic_tool_call","tool":"read_file","arguments":{"path":"README.md"},"content_items":[{"type":"input_text","text":"# Hello"}],"success":true,"status":"completed"}}`

	c := &Codex{toolItems: make(map[string]*StreamItem)}
	event := &StreamEvent{}
	require.NoError(t, json.Unmarshal([]byte(line), event))

	msg, callID := c.mapStreamEvent(event)
	require.NotNil(t, msg)
	require.Equal(t, "item_8", callID)
	require.Equal(t, "read_file", *msg.Metadata.Tool.Name)
	require.JSONEq(t, `{"tool":"read_file","path":"README.md"}`, *msg.Metadata.Tool.Input)
	require.Equal(t, "# Hello", *msg.Metadata.Tool.Output)
}

func TestMapDynamicToolCallMergesArgumentsFromStarted(t *testing.T) {
	c := &Codex{toolItems: make(map[string]*StreamItem)}

	started := &StreamEvent{}
	require.NoError(t, json.Unmarshal([]byte(`{"type":"item.started","item":{"id":"item_8","type":"dynamic_tool_call","tool":"read_file","arguments":{"path":"README.md"},"status":"in_progress"}}`), started))
	msg, callID := c.mapStreamEvent(started)
	require.NotNil(t, msg)
	require.Equal(t, "item_8", callID)
	require.Equal(t, console.AgentMessageToolStateRunning, *msg.Metadata.Tool.State)
	require.Equal(t, v1.RunningToolOutput, *msg.Metadata.Tool.Output)
	require.JSONEq(t, `{"tool":"read_file","path":"README.md"}`, *msg.Metadata.Tool.Input)

	completed := &StreamEvent{}
	require.NoError(t, json.Unmarshal([]byte(`{"type":"item.completed","item":{"id":"item_8","type":"dynamic_tool_call","tool":"read_file","content_items":[{"type":"input_text","text":"ok"}],"success":true,"status":"completed"}}`), completed))

	msg, callID = c.mapStreamEvent(completed)
	require.NotNil(t, msg)
	require.Equal(t, "item_8", callID)
	require.Equal(t, "read_file", *msg.Metadata.Tool.Name)
	require.JSONEq(t, `{"tool":"read_file","path":"README.md"}`, *msg.Metadata.Tool.Input)
}

func TestMapMCPToolCallIncludesArgumentsAndResult(t *testing.T) {
	line := `{"type":"item.completed","item":{"id":"item_5","type":"mcp_tool_call","server":"docs","tool":"search","arguments":{"q":"exec --json"},"result":{"content":[{"type":"text","text":"Found 3 matches."}],"structured_content":{"matches":3}},"error":null,"status":"completed"}}`

	c := &Codex{toolItems: make(map[string]*StreamItem)}
	event := &StreamEvent{}
	require.NoError(t, json.Unmarshal([]byte(line), event))

	msg, callID := c.mapStreamEvent(event)
	require.NotNil(t, msg)
	require.Equal(t, "item_5", callID)
	require.NotNil(t, msg.Metadata)
	require.NotNil(t, msg.Metadata.Tool)

	require.Equal(t, "mcp_tool_call", *msg.Metadata.Tool.Name)
	require.Equal(t, console.AgentMessageToolStateCompleted, *msg.Metadata.Tool.State)
	require.JSONEq(t, `{"server":"docs","tool":"search","q":"exec --json"}`, *msg.Metadata.Tool.Input)
	require.Equal(t, `{"matches":3}`, *msg.Metadata.Tool.Output)
}

func TestMapMCPToolCallMergesArgumentsFromStarted(t *testing.T) {
	c := &Codex{toolItems: make(map[string]*StreamItem)}

	started := &StreamEvent{}
	require.NoError(t, json.Unmarshal([]byte(`{"type":"item.started","item":{"id":"item_5","type":"mcp_tool_call","server":"docs","tool":"search","arguments":{"q":"exec --json"},"status":"in_progress"}}`), started))
	msg, callID := c.mapStreamEvent(started)
	require.NotNil(t, msg)
	require.Equal(t, "item_5", callID)
	require.Equal(t, console.AgentMessageToolStateRunning, *msg.Metadata.Tool.State)

	completed := &StreamEvent{}
	require.NoError(t, json.Unmarshal([]byte(`{"type":"item.completed","item":{"id":"item_5","type":"mcp_tool_call","server":"docs","tool":"search","result":{"content":[{"type":"text","text":"ok"}]},"status":"completed"}}`), completed))

	msg, callID = c.mapStreamEvent(completed)
	require.NotNil(t, msg)
	require.Equal(t, "item_5", callID)
	require.JSONEq(t, `{"server":"docs","tool":"search","q":"exec --json"}`, *msg.Metadata.Tool.Input)
	require.Equal(t, "ok", *msg.Metadata.Tool.Output)
}

func TestMapMCPToolCallFailureUsesErrorMessage(t *testing.T) {
	line := `{"type":"item.completed","item":{"id":"item_6","type":"mcp_tool_call","server":"docs","tool":"search","arguments":{"q":"exec --json"},"result":null,"error":{"message":"tool timeout"},"status":"failed"}}`

	c := &Codex{toolItems: make(map[string]*StreamItem)}
	event := &StreamEvent{}
	require.NoError(t, json.Unmarshal([]byte(line), event))

	msg, callID := c.mapStreamEvent(event)
	require.NotNil(t, msg)
	require.Equal(t, "item_6", callID)
	require.Equal(t, console.AgentMessageToolStateError, *msg.Metadata.Tool.State)
	require.Equal(t, "tool timeout", *msg.Metadata.Tool.Output)
	require.JSONEq(t, `{"server":"docs","tool":"search","q":"exec --json"}`, *msg.Metadata.Tool.Input)
}

func TestMapCommandExecutionTwoTurn(t *testing.T) {
	c := &Codex{toolItems: make(map[string]*StreamItem)}

	started := &StreamEvent{}
	require.NoError(t, json.Unmarshal([]byte(`{"type":"item.started","item":{"id":"item_1","type":"command_execution","command":"bash -lc ls","status":"in_progress"}}`), started))
	msg, callID := c.mapStreamEvent(started)
	require.NotNil(t, msg)
	require.Equal(t, "item_1", callID)
	require.Equal(t, "command_execution", *msg.Metadata.Tool.Name)
	require.Equal(t, console.AgentMessageToolStateRunning, *msg.Metadata.Tool.State)
	require.Equal(t, v1.RunningToolOutput, *msg.Metadata.Tool.Output)
	require.JSONEq(t, `{"command":"bash -lc ls"}`, *msg.Metadata.Tool.Input)

	completed := &StreamEvent{}
	require.NoError(t, json.Unmarshal([]byte(`{"type":"item.completed","item":{"id":"item_1","type":"command_execution","command":"bash -lc ls","aggregated_output":"docs\n","exit_code":0,"status":"completed"}}`), completed))
	msg, callID = c.mapStreamEvent(completed)
	require.NotNil(t, msg)
	require.Equal(t, "item_1", callID)
	require.Equal(t, console.AgentMessageToolStateCompleted, *msg.Metadata.Tool.State)
	require.Equal(t, "docs\n", *msg.Metadata.Tool.Output)
}

func TestMapCommandExecutionEmptyOutputClearsRunningPlaceholder(t *testing.T) {
	c := &Codex{toolItems: make(map[string]*StreamItem)}

	started := &StreamEvent{}
	require.NoError(t, json.Unmarshal([]byte(`{"type":"item.started","item":{"id":"item_1","type":"command_execution","command":"bash -lc 'sleep 100'","status":"in_progress"}}`), started))
	msg, callID := c.mapStreamEvent(started)
	require.NotNil(t, msg)
	require.Equal(t, "item_1", callID)
	require.Equal(t, v1.RunningToolOutput, *msg.Metadata.Tool.Output)

	completed := &StreamEvent{}
	require.NoError(t, json.Unmarshal([]byte(`{"type":"item.completed","item":{"id":"item_1","type":"command_execution","command":"bash -lc 'sleep 100'","aggregated_output":"","exit_code":0,"status":"completed"}}`), completed))
	msg, callID = c.mapStreamEvent(completed)
	require.NotNil(t, msg)
	require.Equal(t, "item_1", callID)
	require.Equal(t, console.AgentMessageToolStateCompleted, *msg.Metadata.Tool.State)
	require.NotNil(t, msg.Metadata.Tool.Output)
	require.Equal(t, "", *msg.Metadata.Tool.Output)
}

func TestMapTurnCompletedPersistsCostWithoutChatContent(t *testing.T) {
	line := `{"type":"turn.completed","usage":{"input_tokens":100,"cached_input_tokens":20,"output_tokens":50,"reasoning_output_tokens":12}}`

	c := &Codex{toolItems: make(map[string]*StreamItem)}
	c.Config.Usage = harnessusage.New(nil)
	event := &StreamEvent{}
	require.NoError(t, json.Unmarshal([]byte(line), event))

	msg, callID := c.mapStreamEvent(event)
	require.NotNil(t, msg)
	require.Empty(t, callID)
	require.Equal(t, ignoredAgentMessage, msg.Message)
	require.NotNil(t, msg.Cost)
	require.Equal(t, float64(150), msg.Cost.Total)
	require.Equal(t, float64(100), *msg.Cost.Tokens.Input)
	require.Equal(t, float64(50), *msg.Cost.Tokens.Output)

	attrs := c.Config.Usage.Attributes()
	require.NotNil(t, attrs)
	require.Equal(t, int64(100), *attrs.InputTokens)
	require.Equal(t, int64(50), *attrs.OutputTokens)
	require.Equal(t, int64(150), *attrs.TotalTokens)
	require.Equal(t, int64(20), *attrs.CachedTokens)
	require.Equal(t, int64(12), *attrs.ReasoningTokens)
}

func TestMapWebSearchIncludesQueryAsInput(t *testing.T) {
	line := `{"type":"item.completed","item":{"id":"item_7","type":"web_search","query":"codex exec --json schema"}}`

	c := &Codex{toolItems: make(map[string]*StreamItem)}
	event := &StreamEvent{}
	require.NoError(t, json.Unmarshal([]byte(line), event))

	msg, callID := c.mapStreamEvent(event)
	require.NotNil(t, msg)
	require.Equal(t, "item_7", callID)
	require.Equal(t, "web_search", *msg.Metadata.Tool.Name)
	require.JSONEq(t, `{"query":"codex exec --json schema"}`, *msg.Metadata.Tool.Input)
}
