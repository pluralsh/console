package common

const (
	AgentMCPServerPort    = 8080
	AgentMCPServerAddress = ":8080"
	AgentMCPServerURL     = "http://127.0.0.1:8080/mcp"

	AgentWorkbenchMCPServerName = "workbench"
	AgentWorkbenchMCPPath       = "/workbench/mcp"
	AgentWorkbenchMCPURL        = "http://127.0.0.1:8080/workbench/mcp"

	AgentOpenAIChatCompletionsPath = "/v1/chat/completions"
	AgentOpenAIChatCompletionsURL  = "http://127.0.0.1:8080/v1/chat/completions"
	AgentOpenAIResponsesPath       = "/v1/responses"
	AgentOpenAIResponsesURL        = "http://127.0.0.1:8080/v1/responses"
	AgentOpenAIBaseURL             = "http://127.0.0.1:8080/v1"

	// AgentConsoleProxyURL stands in for the Console URL in the harness and in agent AI provider config.
	// The sidecar forwards the paths below to Console and injects the deploy token.
	AgentConsoleProxyURL = "http://127.0.0.1:8080/plural"

	// AgentConsoleExtGQLPath proxies the harness's Console ext API calls.
	AgentConsoleExtGQLPath = "/plural/ext/gql"
	AgentConsoleExtGQLURL  = AgentConsoleProxyURL + "/ext/gql"

	// AgentRunEventsPath long-polls for Console notifications about this agent run, which the sidecar
	// receives over the deploy agent websocket.
	AgentRunEventsPath = "/plural/agent-run/events"
	AgentRunEventsURL  = AgentConsoleProxyURL + "/agent-run/events"

	// AgentConsoleAIPath proxies the agent's model calls to the Console AI proxy.
	AgentConsoleAIPath = "/plural/ext/ai/"
	// AgentAIProxyAPIKey is the placeholder API key agents send to the sidecar, which replaces it.
	AgentAIProxyAPIKey = "plural-sidecar"

	AgentMCPGRPCPort          = 8081
	AgentMCPGRPCServerAddress = ":8081"
	AgentMCPGRPCAddress       = "127.0.0.1:8081"

	AgentRunSharedWorkDir = "/plural/shared"

	// AgentRunRepositoryPrebakeDir is where a repository-prebake image is
	// copied on the shared emptyDir (manifest.json plus cloned git repos).
	AgentRunRepositoryPrebakeDir = AgentRunSharedWorkDir + "/repos"

	// AgentRunAttachmentsDir is where files attached to an agent run or its
	// prompts are downloaded, outside the repository so they're never committed.
	AgentRunAttachmentsDir = AgentRunSharedWorkDir + "/attachments"

	CodebaseMemoryMCPServerName = "codebase-memory-mcp"
	CodebaseMemoryMCPCommand    = "/usr/local/bin/codebase-memory-mcp"
	CodebaseMemoryCacheEnv      = "CBM_CACHE_DIR"
	CodebaseMemoryCacheDir      = "/plural/.cache/codebase-memory-mcp"
)
