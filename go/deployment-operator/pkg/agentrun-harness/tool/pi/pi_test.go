package pi

import (
	"encoding/json"
	"reflect"
	"testing"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/mcp"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

func TestAddExternalMCPServers(t *testing.T) {
	t.Setenv(mcp.EnvServers, `[{"name":"linear","url":"https://mcp.linear.app/mcp","allowedTools":["list_issues"],"headers":{"Authorization":"Bearer secret"}}]`)

	servers := map[string]any{}
	if err := addExternalMCPServers(servers); err != nil {
		t.Fatalf("addExternalMCPServers() error = %v", err)
	}
	linear := servers["linear"].(map[string]any)
	if linear["url"] != "https://mcp.linear.app/mcp" {
		t.Fatalf("url = %v", linear["url"])
	}
	headers := linear["headers"].(map[string]string)
	if headers["Authorization"] != "Bearer secret" {
		t.Fatalf("headers = %#v", headers)
	}
	directTools := linear["directTools"].([]string)
	if len(directTools) != 1 || directTools[0] != "list_issues" {
		t.Fatalf("directTools = %#v", directTools)
	}
}

func TestArgsIncludesJSONModeSessionAndMCPConfig(t *testing.T) {
	tool := &Pi{
		DefaultTool: toolv1.DefaultTool{Config: toolv1.Config{WorkDir: "/work"}},
		model:       "openai/gpt-5.4",
		provider:    "openai",
	}
	want := []string{
		"--mode", "json",
		"--approve",
		"--provider", "openai",
		"--model", "openai/gpt-5.4",
		"--session-dir", "/work/.pi/agent/sessions",
		"--extension", piMCPExtensionPath,
		"--mcp-config", "/work/.pi/agent/mcp.json",
		"--session", "session-1",
		"write a test",
	}
	if got := tool.args("write a test", "session-1"); !reflect.DeepEqual(got, want) {
		t.Fatalf("args = %#v, want %#v", got, want)
	}
}

func TestArgsWithProxyUsesPluralProvider(t *testing.T) {
	tool := &Pi{
		DefaultTool: toolv1.DefaultTool{Config: toolv1.Config{WorkDir: "/work"}},
		model:       "openai/gpt-5.4",
		provider:    proxyProviderKey,
	}
	want := []string{
		"--mode", "json",
		"--approve",
		"--provider", proxyProviderKey,
		"--model", "openai/gpt-5.4",
		"--session-dir", "/work/.pi/agent/sessions",
		"--extension", piMCPExtensionPath,
		"--mcp-config", "/work/.pi/agent/mcp.json",
		"write a task",
	}
	if got := tool.args("write a task", ""); !reflect.DeepEqual(got, want) {
		t.Fatalf("args = %#v, want %#v", got, want)
	}
}

func TestMapStreamEventMapsToolLifecycle(t *testing.T) {
	tool := &Pi{}
	start, callID := tool.mapStreamEvent(&StreamEvent{
		Type:       "tool_execution_start",
		ToolCallID: "call-1",
		ToolName:   "bash",
		Args:       json.RawMessage(`{"command":"go test ./..."}`),
	})
	if callID != "call-1" {
		t.Fatalf("call id = %q", callID)
	}
	if start.Metadata == nil || start.Metadata.Tool == nil || *start.Metadata.Tool.State != console.AgentMessageToolStateRunning {
		t.Fatalf("expected running tool message, got %#v", start)
	}

	end, callID := tool.mapStreamEvent(&StreamEvent{
		Type:       "tool_execution_end",
		ToolCallID: "call-1",
		ToolName:   "bash",
		Args:       json.RawMessage(`{"command":"go test ./..."}`),
		Result:     json.RawMessage(`{"content":[{"type":"text","text":"ok"}]}`),
	})
	if callID != "call-1" {
		t.Fatalf("call id = %q", callID)
	}
	if end.Metadata == nil || end.Metadata.Tool == nil || *end.Metadata.Tool.State != console.AgentMessageToolStateCompleted {
		t.Fatalf("expected completed tool message, got %#v", end)
	}
	if end.Metadata.Tool.Output == nil || *end.Metadata.Tool.Output != "ok" {
		t.Fatalf("expected extracted tool output, got %#v", end.Metadata.Tool.Output)
	}
}

func TestHandleStreamLineEmitsToolOutput(t *testing.T) {
	var callID, stdout string
	tool := &Pi{}
	tool.OnOutput(func(id, out string) {
		callID = id
		stdout = out
	})
	tool.handleStreamLine([]byte(`{"type":"tool_execution_update","toolCallId":"call-1","toolName":"bash","partialResult":{"content":[{"type":"text","text":"hello\nworld"}]}}`))
	if callID != "call-1" {
		t.Fatalf("call id = %q", callID)
	}
	if stdout != "hello\nworld" {
		t.Fatalf("stdout = %q", stdout)
	}
}

func TestToolResultTextEmptyContent(t *testing.T) {
	if got := toolResultText(json.RawMessage(`{"content":[]}`)); got != "" {
		t.Fatalf("empty content = %q, want empty", got)
	}
}

func TestHandleStreamLineIgnoresEmptyPartialContent(t *testing.T) {
	emitted := 0
	tool := &Pi{}
	tool.OnOutput(func(string, string) { emitted++ })
	tool.handleStreamLine([]byte(`{"type":"tool_execution_update","toolCallId":"call-1","toolName":"bash","partialResult":{"content":[]}}`))
	if emitted != 0 {
		t.Fatalf("emitted = %d, want 0", emitted)
	}
}

func TestMessageEndExtractsAssistantText(t *testing.T) {
	tool := &Pi{}
	message := tool.messageEnd(&AgentMessage{
		Role:    "assistant",
		Content: json.RawMessage(`[{"type":"text","text":"done"}]`),
	})
	if message == nil || message.Message != "done" {
		t.Fatalf("message = %#v, want assistant text", message)
	}
}
