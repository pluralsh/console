package codex

import (
	"encoding/json"
	"testing"

	console "github.com/pluralsh/console/go/client"
	"github.com/stretchr/testify/require"
)

func TestMapDynamicToolCallReadFile(t *testing.T) {
	line := `{"type":"item.completed","item":{"id":"item_8","type":"dynamic_tool_call","tool":"read_file","arguments":{"path":"README.md"},"content_items":[{"type":"input_text","text":"# Hello"}],"success":true,"status":"completed"}}`

	c := &Codex{toolItems: make(map[string]*StreamItem)}
	event := &StreamEvent{}
	require.NoError(t, json.Unmarshal([]byte(line), event))

	msg := c.mapStreamEvent(event)
	require.NotNil(t, msg)
	require.Equal(t, "read_file", *msg.Metadata.Tool.Name)
	require.JSONEq(t, `{"tool":"read_file","path":"README.md"}`, *msg.Metadata.Tool.Input)
	require.Equal(t, "# Hello", *msg.Metadata.Tool.Output)
}

func TestMapDynamicToolCallMergesArgumentsFromStarted(t *testing.T) {
	c := &Codex{toolItems: make(map[string]*StreamItem)}

	started := &StreamEvent{}
	require.NoError(t, json.Unmarshal([]byte(`{"type":"item.started","item":{"id":"item_8","type":"dynamic_tool_call","tool":"read_file","arguments":{"path":"README.md"},"status":"in_progress"}}`), started))
	require.Nil(t, c.mapStreamEvent(started))

	completed := &StreamEvent{}
	require.NoError(t, json.Unmarshal([]byte(`{"type":"item.completed","item":{"id":"item_8","type":"dynamic_tool_call","tool":"read_file","content_items":[{"type":"input_text","text":"ok"}],"success":true,"status":"completed"}}`), completed))

	msg := c.mapStreamEvent(completed)
	require.NotNil(t, msg)
	require.Equal(t, "read_file", *msg.Metadata.Tool.Name)
	require.JSONEq(t, `{"tool":"read_file","path":"README.md"}`, *msg.Metadata.Tool.Input)
}

func TestMapMCPToolCallIncludesArgumentsAndResult(t *testing.T) {
	line := `{"type":"item.completed","item":{"id":"item_5","type":"mcp_tool_call","server":"docs","tool":"search","arguments":{"q":"exec --json"},"result":{"content":[{"type":"text","text":"Found 3 matches."}],"structured_content":{"matches":3}},"error":null,"status":"completed"}}`

	c := &Codex{toolItems: make(map[string]*StreamItem)}
	event := &StreamEvent{}
	require.NoError(t, json.Unmarshal([]byte(line), event))

	msg := c.mapStreamEvent(event)
	require.NotNil(t, msg)
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
	require.Nil(t, c.mapStreamEvent(started))

	completed := &StreamEvent{}
	require.NoError(t, json.Unmarshal([]byte(`{"type":"item.completed","item":{"id":"item_5","type":"mcp_tool_call","server":"docs","tool":"search","result":{"content":[{"type":"text","text":"ok"}]},"status":"completed"}}`), completed))

	msg := c.mapStreamEvent(completed)
	require.NotNil(t, msg)
	require.JSONEq(t, `{"server":"docs","tool":"search","q":"exec --json"}`, *msg.Metadata.Tool.Input)
	require.Equal(t, "ok", *msg.Metadata.Tool.Output)
}

func TestMapMCPToolCallFailureUsesErrorMessage(t *testing.T) {
	line := `{"type":"item.completed","item":{"id":"item_6","type":"mcp_tool_call","server":"docs","tool":"search","arguments":{"q":"exec --json"},"result":null,"error":{"message":"tool timeout"},"status":"failed"}}`

	c := &Codex{toolItems: make(map[string]*StreamItem)}
	event := &StreamEvent{}
	require.NoError(t, json.Unmarshal([]byte(line), event))

	msg := c.mapStreamEvent(event)
	require.NotNil(t, msg)
	require.Equal(t, console.AgentMessageToolStateError, *msg.Metadata.Tool.State)
	require.Equal(t, "tool timeout", *msg.Metadata.Tool.Output)
	require.JSONEq(t, `{"server":"docs","tool":"search","q":"exec --json"}`, *msg.Metadata.Tool.Input)
}

func TestMapCommandExecutionIncludesInput(t *testing.T) {
	line := `{"type":"item.completed","item":{"id":"item_1","type":"command_execution","command":"bash -lc ls","aggregated_output":"docs\n","exit_code":0,"status":"completed"}}`

	c := &Codex{toolItems: make(map[string]*StreamItem)}
	event := &StreamEvent{}
	require.NoError(t, json.Unmarshal([]byte(line), event))

	msg := c.mapStreamEvent(event)
	require.NotNil(t, msg)
	require.Equal(t, "command_execution", *msg.Metadata.Tool.Name)
	require.JSONEq(t, `{"command":"bash -lc ls"}`, *msg.Metadata.Tool.Input)
	require.Equal(t, "docs\n", *msg.Metadata.Tool.Output)
}

func TestMapWebSearchIncludesQueryAsInput(t *testing.T) {
	line := `{"type":"item.completed","item":{"id":"item_7","type":"web_search","query":"codex exec --json schema"}}`

	c := &Codex{toolItems: make(map[string]*StreamItem)}
	event := &StreamEvent{}
	require.NoError(t, json.Unmarshal([]byte(line), event))

	msg := c.mapStreamEvent(event)
	require.NotNil(t, msg)
	require.Equal(t, "web_search", *msg.Metadata.Tool.Name)
	require.JSONEq(t, `{"query":"codex exec --json schema"}`, *msg.Metadata.Tool.Input)
}
