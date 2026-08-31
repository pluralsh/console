package claude

import (
	"encoding/json"
	"fmt"

	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/mcp"
)

const (
	mcpUpdateAnalysis    = "mcp__plural__updateAgentRunAnalysis"
	mcpAgentPullRequest  = "mcp__plural__agentPullRequest"
	mcpAgentPrReview     = "mcp__plural__agentPrReview"
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
	analyzePluralMCPTools  = []string{mcpGetPRState, mcpUpdateAnalysis}
	reviewPluralMCPTools   = []string{mcpGetPRState, mcpUpdateAnalysis, mcpAgentPrReview}
	codebaseMemoryMCPTools = []string{CodebaseMemoryMCPToolsWildcard}
	writePluralMCPTools    = []string{
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

func externalMCPAllowTools(servers []mcp.Server) []string {
	var tools []string
	for _, server := range servers {
		if server.HasAllowedTools() {
			for _, tool := range server.AllowedTools {
				tools = append(tools, fmt.Sprintf("mcp__%s__%s", server.Name, tool))
			}
			continue
		}
		tools = append(tools, fmt.Sprintf("mcp__%s__*", server.Name))
	}
	return tools
}

func agentWithMCPTools(agentJSON string, extra []string) string {
	if len(extra) == 0 {
		return agentJSON
	}

	payload := map[string]agentDef{}
	if err := json.Unmarshal([]byte(agentJSON), &payload); err != nil {
		return agentJSON
	}
	for name, def := range payload {
		def.Tools = appendTools(def.Tools, extra)
		payload[name] = def
	}
	out, err := json.Marshal(payload)
	if err != nil {
		return agentJSON
	}
	return string(out)
}

var (
	analysisAgent = agentJSON("analysis", agentDef{
		Description: "Analyze code for potential issues, vulnerabilities and improvements. Use PROACTIVELY.",
		Prompt:      "You are a read-only autonomous analysis agent.",
		Tools:       appendTools(appendTools([]string{"Read", "Grep", "Glob", "Bash"}, analyzePluralMCPTools), codebaseMemoryMCPTools),
	})
	reviewAgent = agentJSON("review", agentDef{
		Description: "Review pull request changes without modifying the repository. Use PROACTIVELY.",
		Prompt:      "You are a read-only autonomous pull request review agent.",
		Tools:       appendTools(appendTools([]string{"Read", "Grep", "Glob", "Bash"}, reviewPluralMCPTools), codebaseMemoryMCPTools),
	})
	autonomousAgent = agentJSON("autonomous", agentDef{
		Description: "Autonomous agent for making code changes and creating pull requests. Use PROACTIVELY.",
		Prompt:      "You are an autonomous coding agent, highly skilled in coding and code analysis.",
		Tools: appendTools(
			[]string{"Read", "Write", "Edit", "MultiEdit", "Bash", "Grep", "Glob", "WebFetch"},
			appendTools(writePluralMCPTools, codebaseMemoryMCPTools),
		),
	})
	babysitAgent = agentJSON("babysit", agentDef{
		Description: "Autonomous agent responding to pull request feedback. Commits to the existing PR branch. Does NOT create new PRs. Use PROACTIVELY.",
		Prompt:      "You are an autonomous coding agent. Your pull request is already open. Treat every human-authored PR comment as actionable unless it is clearly informational, and prioritize it over resuming the original task. Consider bot feedback and CI failures too, then commit scoped fixes to the existing branch. Push a CI fix only when logs show a defect in this PR; do not push commits for flakes such as transient network errors, third-party outages, rate limits, or runner issues.",
		Tools: appendTools(
			[]string{"Read", "Write", "Edit", "MultiEdit", "Bash", "Grep", "Glob", "WebFetch"},
			appendTools(babysitPluralMCPTools, codebaseMemoryMCPTools),
		),
	})
)
