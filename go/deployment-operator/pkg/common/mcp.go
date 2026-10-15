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

	// AgentConsoleExtGQLPath proxies the harness's Console ext API calls; the sidecar injects the deploy token.
	AgentConsoleExtGQLPath = "/plural/ext/gql"
	AgentConsoleExtGQLURL  = "http://127.0.0.1:8080/plural/ext/gql"

	// AgentConsoleProxyURL stands in for the Console URL in agent AI provider config. The sidecar
	// forwards AgentConsoleAIPath to the Console AI proxy and injects the deploy token.
	AgentConsoleProxyURL = "http://127.0.0.1:8080/plural"
	AgentConsoleAIPath   = "/plural/ext/ai/"
	// AgentAIProxyAPIKey is the placeholder API key agents send to the sidecar, which replaces it.
	AgentAIProxyAPIKey = "plural-sidecar"

	AgentMCPGRPCPort          = 8081
	AgentMCPGRPCServerAddress = ":8081"
	AgentMCPGRPCAddress       = "127.0.0.1:8081"

	AgentRunSharedWorkDir = "/plural/shared"

	// AgentRunRepositoryPrebakeDir is where a repository-prebake image is
	// copied on the shared emptyDir (manifest.json plus cloned git repos).
	AgentRunRepositoryPrebakeDir = AgentRunSharedWorkDir + "/repos"

	CodebaseMemoryMCPServerName = "codebase-memory-mcp"
	CodebaseMemoryMCPCommand    = "/usr/local/bin/codebase-memory-mcp"
	CodebaseMemoryCacheEnv      = "CBM_CACHE_DIR"
	CodebaseMemoryCacheDir      = "/plural/.cache/codebase-memory-mcp"
)
