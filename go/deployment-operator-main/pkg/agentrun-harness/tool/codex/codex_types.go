package codex

import (
	"encoding/json"

	console "github.com/pluralsh/console/go/client"
	v1 "github.com/pluralsh/deployment-operator/pkg/agentrun-harness/tool/v1"
	"github.com/pluralsh/deployment-operator/pkg/harness/exec"
)

const (
	statusCompleted = "completed"
	statusFailed    = "failed"
)

type Codex struct {
	v1.DefaultTool

	// onMessage is a callback called when a new message is received.
	onMessage func(message *console.AgentMessageAttributes)

	// executable is the Codex executable used to call CLI.
	executable exec.Executable

	// apiKey used to authenticate with the API.
	apiKey string

	// model used to generate code.
	model Model

	// threadID is captured from the "thread.started" event and forwarded to the API
	// as the session identifier (analogous to session_id in Claude).
	threadID string

	proxy bool

	consoleToken string
}

// StreamEvent is the top-level envelope for every JSON line emitted by `codex exec --json`.
type StreamEvent struct {
	// Type identifies the event kind, e.g. "thread.started", "turn.started",
	// "item.started", "item.completed", "turn.completed".
	Type string `json:"type"`

	// ThreadID is set on "thread.started" events and carries the session
	// identifier that must be forwarded to the API (analogous to session_id in Claude).
	ThreadID string `json:"thread_id,omitempty"`

	// Item is populated on "item.started" and "item.completed" events.
	Item *StreamItem `json:"item,omitempty"`

	// Usage is populated on "turn.completed" events and contains token usage statistics.
	Usage *TurnUsage `json:"usage,omitempty"`
}

// TurnUsage holds token usage statistics emitted in the "turn.completed" event.
type TurnUsage struct {
	InputTokens       int `json:"input_tokens"`
	CachedInputTokens int `json:"cached_input_tokens"`
	OutputTokens      int `json:"output_tokens"`
}

// StreamItem is the payload carried inside "item.started" / "item.completed" events.
type StreamItem struct {
	// ID is the stable identifier for this item across started/completed pairs.
	ID string `json:"id"`

	// Type describes what kind of item this is: "reasoning", "agent_message", "todo_list",
	// "command_execution", "mcp_tool_call", "file_change", etc.
	Type string `json:"type"`

	// Text is populated for "reasoning" and "agent_message" items.
	Text string `json:"text,omitempty"`

	// Command and output fields are populated for "command_execution" items.
	Command          string `json:"command,omitempty"`
	AggregatedOutput string `json:"aggregated_output,omitempty"`
	ExitCode         *int   `json:"exit_code,omitempty"`
	Status           string `json:"status,omitempty"`

	// Items is populated for "todo_list" items.
	Items []TodoItem `json:"items,omitempty"`

	// MCP tool call fields are populated for "mcp_tool_call" items.
	Server    string          `json:"server,omitempty"`
	Tool      string          `json:"tool,omitempty"`
	Arguments json.RawMessage `json:"arguments,omitempty"`
	Result    json.RawMessage `json:"result,omitempty"`
	Error     *MCPToolError   `json:"error,omitempty"`

	// Changes is populated for "file_change" items.
	Changes []FileChange `json:"changes,omitempty"`
}

// MCPToolError holds the error payload for a failed "mcp_tool_call" item.
type MCPToolError struct {
	Message string `json:"message,omitempty"`
}

// FileChange describes a single file modification inside a "file_change" item.
type FileChange struct {
	Path string `json:"path,omitempty"`
	Kind string `json:"kind,omitempty"` // e.g. "add", "modify", "delete"
}

// TodoItem is a single entry inside a "todo_list" StreamItem.
type TodoItem struct {
	Text      string `json:"text"`
	Completed bool   `json:"completed"`
}

type AgentInput struct {
	Name                 string
	Model                string
	ModelProvider        string
	SandboxMode          string
	ApprovalPolicy       string
	ModelReasoningEffort string
	AllowedEnvVars       []string
	EnableWebSearch      bool
	EnableShellCache     bool
	PromptFile           string
}

type Project struct {
	TrustLevel string `toml:"trust_level,omitempty"`
}

type MCPInput struct {
	Name          string
	Type          string // Transport type: "stdio", "sse" or "http"
	URL           string
	Command       string
	Args          []string
	Env           map[string]string
	Headers       map[string]string // HTTP request headers, used for "http" transport
	EnabledTools  []string
	DisabledTools []string
	TrustPolicy   string // e.g. "always" to auto-approve tool calls in exec mode
}

// ModelProviderInput is the user-facing input for registering a custom model provider.
type ModelProviderInput struct {
	// Name is the key used to reference this provider from a Profile's ModelProvider field.
	Name string
	// BaseURL is the OpenAI-compatible API endpoint, e.g. "https://api.example.com/v1".
	BaseURL string
	// EnvKey is the name of the environment variable that holds the API key.
	EnvKey string
}

// ModelProviderConfig is serialized into [model_providers.<key>] in config.toml.
type ModelProviderConfig struct {
	Name    string `toml:"name,omitempty"`
	BaseURL string `toml:"base_url,omitempty"`
	EnvKey  string `toml:"env_key,omitempty"`
}

type ShellEnvPolicy struct {
	IncludeOnly []string `toml:"include_only,omitempty"`
}

type Features struct {
	WebSearchRequest bool `toml:"web_search_request,omitempty"`
	ShellSnapshot    bool `toml:"shell_snapshot,omitempty"`
}

type Profile struct {
	Model                  string          `toml:"model"`
	ModelProvider          string          `toml:"model_provider,omitempty"`
	SandboxMode            string          `toml:"sandbox_mode"`
	ApprovalPolicy         string          `toml:"approval_policy"`
	ModelReasoningEffort   string          `toml:"model_reasoning_effort"`
	ShellEnvironmentPolicy *ShellEnvPolicy `toml:"shell_environment_policy,omitempty"`
	Features               *Features       `toml:"features,omitempty"`
	Prompt                 string          `toml:"prompt,omitempty"`
}

type MCPServer struct {
	Type          string            `toml:"type,omitempty"`    // Transport type: "stdio", "sse" or "http"
	URL           string            `toml:"url,omitempty"`     // For remote MCP (sse/http)
	Command       string            `toml:"command,omitempty"` // For local MCP (stdio)
	Args          []string          `toml:"args,omitempty"`
	Env           map[string]string `toml:"env,omitempty"`
	Headers       map[string]string `toml:"headers,omitempty"` // HTTP request headers for "http" transport
	EnabledTools  []string          `toml:"enabled_tools,omitempty"`
	DisabledTools []string          `toml:"disabled_tools,omitempty"`
	TrustPolicy   string            `toml:"trust_policy,omitempty"` // e.g. "always" to auto-approve tool calls in exec mode
}

type CodexConfig struct {
	Projects       map[string]*Project             `toml:"projects,omitempty"`
	ModelProviders map[string]*ModelProviderConfig `toml:"model_providers,omitempty"`
	Profiles       map[string]*Profile             `toml:"profiles"`
	MCPServers     map[string]*MCPServer           `toml:"mcp_servers"`
}
