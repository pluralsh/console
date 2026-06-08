package claude

import "encoding/json"

const (
	mcpUpdateAnalysis    = "mcp__plural__updateAgentRunAnalysis"
	mcpAgentPullRequest  = "mcp__plural__agentPullRequest"
	mcpCreateBranch      = "mcp__plural__createBranch"
	mcpFetchTodos        = "mcp__plural__fetchAgentRunTodos"
	mcpUpdateTodos       = "mcp__plural__updateAgentRunTodos"
	mcpDownloadManifests = "mcp__plural__downloadServiceManifests"
	mcpCreateCommit      = "mcp__plural__createCommit"
	mcpGetPRState        = "mcp__plural__getPRState"
	mcpGetCILogs         = "mcp__plural__getCILogs"
	mcpReactToComment    = "mcp__plural__reactToComment"
)

var (
	analyzePluralMCPTools = []string{mcpGetPRState, mcpUpdateAnalysis}
	writePluralMCPTools   = []string{
		mcpAgentPullRequest,
		mcpCreateBranch,
		mcpFetchTodos,
		mcpUpdateTodos,
		mcpDownloadManifests,
		mcpCreateCommit,
		mcpGetPRState,
		mcpGetCILogs,
		mcpReactToComment,
		mcpUpdateAnalysis,
	}
	babysitPluralMCPTools = []string{
		mcpCreateCommit,
		mcpFetchTodos,
		mcpUpdateTodos,
		mcpGetPRState,
		mcpGetCILogs,
		mcpDownloadManifests,
		mcpReactToComment,
	}
)

type agentDef struct {
	Description string   `json:"description"`
	Prompt      string   `json:"prompt"`
	Tools       []string `json:"tools"`
}

func agentJSON(name string, def agentDef) string {
	payload, err := json.Marshal(map[string]agentDef{name: def})
	if err != nil {
		panic(err)
	}
	return string(payload)
}

func appendTools(base, extra []string) []string {
	return append(append([]string(nil), base...), extra...)
}

var (
	analysisAgent = agentJSON("analysis", agentDef{
		Description: "Analyze code for potential issues, vulnerabilities and improvements. Use PROACTIVELY.",
		Prompt:      "You are a read-only autonomous analysis agent.",
		Tools:       appendTools([]string{"Read", "Grep", "Glob", "Bash"}, analyzePluralMCPTools),
	})
	autonomousAgent = agentJSON("autonomous", agentDef{
		Description: "Autonomous agent for making code changes and creating pull requests. Use PROACTIVELY.",
		Prompt:      "You are an autonomous coding agent, highly skilled in coding and code analysis.",
		Tools: appendTools(
			[]string{"Read", "Write", "Edit", "MultiEdit", "Bash", "Grep", "Glob", "WebFetch"},
			writePluralMCPTools,
		),
	})
	babysitAgent = agentJSON("babysit", agentDef{
		Description: "Autonomous agent responding to pull request feedback. Commits to the existing PR branch. Does NOT create new PRs. Use PROACTIVELY.",
		Prompt:      "You are an autonomous coding agent. Your pull request is already open. Address reviewer comments and fix CI failures, then commit to the existing branch.",
		Tools: appendTools(
			[]string{"Read", "Write", "Edit", "MultiEdit", "Bash", "Grep", "Glob", "WebFetch"},
			babysitPluralMCPTools,
		),
	})
)
