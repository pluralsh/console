package pi

import (
	"encoding/json"

	console "github.com/pluralsh/console/go/client"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/harness/exec"
)

const (
	defaultModel   = "gpt-5.4"
	openAIProvider = "openai"
	// proxyProviderKey is the models.json provider block name used when aiProxy is enabled.
	// Using a non-"openai" name prevents the Pi CLI from stripping the "openai/" prefix
	// from model IDs (e.g. "openai/gpt-5.4"), ensuring the full provider/model format
	// reaches the Plural AI proxy at /ext/ai/v1.
	proxyProviderKey   = "plural"
	pluralAPIKeyEnv    = "PLRL_CONSOLE_TOKEN"
	openAIAPIKeyEnv    = "OPENAI_API_KEY"
	piMCPExtensionPath = "/opt/pi-mcp-adapter/node_modules/pi-mcp-adapter/index.ts"
)

// Pi implements the Pi coding-agent CLI integration.
type Pi struct {
	toolv1.DefaultTool

	onMessage    toolv1.MessageCallback
	executable   exec.Executable
	sessionID    string
	model        string
	provider     string
	apiKey       string
	endpoint     string
	consoleURL   string
	consoleToken string
}

// StreamEvent is a JSON-mode event emitted by `pi --mode json`.
type StreamEvent struct {
	Type                  string          `json:"type"`
	ID                    string          `json:"id,omitempty"`
	Message               *AgentMessage   `json:"message,omitempty"`
	AssistantMessageEvent *MessageUpdate  `json:"assistantMessageEvent,omitempty"`
	ToolCallID            string          `json:"toolCallId,omitempty"`
	ToolName              string          `json:"toolName,omitempty"`
	Args                  json.RawMessage `json:"args,omitempty"`
	Result                json.RawMessage `json:"result,omitempty"`
	IsError               bool            `json:"isError,omitempty"`
	Error                 *StreamError    `json:"error,omitempty"`
}

type StreamError struct {
	Message string `json:"message,omitempty"`
}

type MessageUpdate struct {
	Type  string `json:"type,omitempty"`
	Delta string `json:"delta,omitempty"`
}

type AgentMessage struct {
	Role    string          `json:"role,omitempty"`
	Content json.RawMessage `json:"content,omitempty"`
	Usage   *Usage          `json:"usage,omitempty"`
}

type Usage struct {
	Input      int64      `json:"input,omitempty"`
	Output     int64      `json:"output,omitempty"`
	CacheRead  int64      `json:"cacheRead,omitempty"`
	CacheWrite int64      `json:"cacheWrite,omitempty"`
	Reasoning  int64      `json:"reasoning,omitempty"`
	Total      int64      `json:"totalTokens,omitempty"`
	Cost       *UsageCost `json:"cost,omitempty"`
}

type UsageCost struct {
	Total float64 `json:"total,omitempty"`
}

type contentBlock struct {
	Type  string          `json:"type"`
	Text  string          `json:"text,omitempty"`
	Name  string          `json:"name,omitempty"`
	ID    string          `json:"id,omitempty"`
	Input json.RawMessage `json:"input,omitempty"`
}

func toolMessage(name string, state console.AgentMessageToolState, input, output string) *console.AgentMessageAttributes {
	tool := &console.AgentMessageToolAttributes{
		Name:   new(name),
		State:  new(state),
		Output: new(output),
	}
	if input != "" {
		tool.Input = new(input)
	}
	return &console.AgentMessageAttributes{
		Role:    console.AiRoleAssistant,
		Message: "Called tool",
		Metadata: &console.AgentMessageMetadataAttributes{
			Tool: tool,
		},
	}
}
