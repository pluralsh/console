package common

const (
	AgentMCPServerPort    = 8080
	AgentMCPServerAddress = ":8080"
	AgentMCPServerURL     = "http://127.0.0.1:8080/mcp"

	AgentOpenAIChatCompletionsPath = "/v1/chat/completions"
	AgentOpenAIChatCompletionsURL  = "http://127.0.0.1:8080/v1/chat/completions"
	AgentOpenAIResponsesPath       = "/v1/responses"
	AgentOpenAIResponsesURL        = "http://127.0.0.1:8080/v1/responses"
	AgentOpenAIBaseURL             = "http://127.0.0.1:8080/v1"

	AgentMCPGRPCPort          = 8081
	AgentMCPGRPCServerAddress = ":8081"
	AgentMCPGRPCAddress       = "127.0.0.1:8081"

	// BrowserUseMCPServerPort is the port the `browser-use --mcp` daemon
	// listens on inside the agent pod. It runs as a separate init container
	// when the AgentRuntime's browser sidecar is enabled and is reachable
	// to the agent CLIs over loopback at BrowserUseMCPServerURL.
	BrowserUseMCPServerPort = 8082
	BrowserUseMCPServerURL  = "http://127.0.0.1:8082/mcp"

	AgentRunSharedWorkDir = "/plural/shared"
)
