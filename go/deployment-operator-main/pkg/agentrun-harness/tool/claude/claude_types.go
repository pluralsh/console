package claude

import (
	console "github.com/pluralsh/console/go/client"

	toolv1 "github.com/pluralsh/deployment-operator/pkg/agentrun-harness/tool/v1"
	"github.com/pluralsh/deployment-operator/pkg/harness/exec"
)

type Model string

const (
	Sonnet45 Model = "claude-sonnet-4-5-20250929"
	Sonnet4  Model = "claude-sonnet-4-20250514"
	Opus45   Model = "claude-opus-4-5-20251101"
	Opus4    Model = "claude-opus-4-20250514"
	Opus41   Model = "claude-opus-4-1-20250805"
)

func EnsureModel(model string) Model {
	if len(model) == 0 {
		return Opus45
	}

	return Model(model)
}

type Claude struct {
	toolv1.DefaultTool

	// onMessage is a callback called when a new message is received.
	onMessage func(message *console.AgentMessageAttributes)

	// executable is the claude executable used to call CLI.
	executable exec.Executable

	// token is the token used to authenticate with the API.
	token string

	// model is the model used to generate code.
	model Model

	// toolUseCache maps tool_use id to ContentMsg for resolving tool_result.
	toolUseCache map[string]ContentMsg

	// consoleToken is the token used to authenticate with the console API.
	consoleToken string

	// consoleURL is the URL of the console API.
	consoleURL string
}

type StreamEvent struct {
	Type    string        `json:"type"`
	Message *MessageEvent `json:"message,omitempty"`
	// there are other event types but you only need `message` for now
	SessionID       string `json:"session_id"`
	UUID            string `json:"uuid"`
	ParentToolUseID string `json:"parent_tool_use_id"`
}

type MessageEvent struct {
	Model        string       `json:"model"`
	ID           string       `json:"id"`
	Type         string       `json:"type"`
	Role         string       `json:"role"`
	StopReason   *string      `json:"stop_reason"`
	StopSequence *string      `json:"stop_sequence"`
	Usage        *Usage       `json:"usage"`
	Content      []ContentMsg `json:"content"`
}

type ContentMsg struct {
	Type string `json:"type"` // "text", "tool_use", "tool_result"
	Text string `json:"text,omitempty"`

	// Fields for tool_use
	ID    string                 `json:"id,omitempty"`    // Unique tool invocation ID
	Name  string                 `json:"name,omitempty"`  // Tool name (e.g., "web_search")
	Input map[string]interface{} `json:"input,omitempty"` // Tool input parameters

	// Fields for tool_result
	ToolUseID string      `json:"tool_use_id,omitempty"` // References the tool_use ID
	Content   interface{} `json:"content,omitempty"`     // Tool output (can be string or structured)
	IsError   bool        `json:"is_error,omitempty"`    // Whether tool execution failed
}

type Usage struct {
	InputTokens              int `json:"input_tokens"`
	OutputTokens             int `json:"output_tokens"`
	CacheCreationInputTokens int `json:"cache_creation_input_tokens"`
	CacheReadInputTokens     int `json:"cache_read_input_tokens"`
}
