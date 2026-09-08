package claude

import (
	"fmt"
	"path/filepath"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/mcp"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
)

func (agent *Agent) writeNativeConfig(config toolv1.Config, model string) error {
	claude, err := agent.runConfig(config.Run)
	if err != nil {
		return err
	}
	if model == "" {
		model = agent.resolveModel(claude.Model)
	}

	external, err := mcp.Load()
	if err != nil {
		return err
	}
	mcpConfig := NewMCPConfigBuilder()
	mcpConfig.AddURLServer("plural", common.AgentMCPServerURL).Done().
		AddServer(common.CodebaseMemoryMCPServerName, common.CodebaseMemoryMCPCommand).
		Env(common.CodebaseMemoryCacheEnv, common.CodebaseMemoryCacheDir).Done()
	for _, server := range external {
		builder := mcpConfig.AddURLServer(server.Name, server.URL)
		for name, value := range server.Headers {
			builder.Header(name, value)
		}
		builder.Done()
	}
	if err := mcpConfig.WriteToFile(filepath.Join(config.WorkDir, ".mcp.json")); err != nil {
		return err
	}

	settings := NewSettingsBuilder(model).WithAvailableModels(model)
	settings.WithEnv("BASH_DEFAULT_TIMEOUT_MS", fmt.Sprintf("%d", claude.BashTimeout.Milliseconds()))
	settings.WithEnv("BASH_MAX_TIMEOUT_MS", fmt.Sprintf("%d", claude.BashMaxTimeout.Milliseconds()))
	if config.Run.Mode == console.AgentRunModeAnalyze || config.Run.Mode == console.AgentRunModeReview {
		settings.AllowTools(
			"Read", "Grep", "Glob", "Bash(ls:*)", "Bash(cd:*)", "Bash(pwd)",
			"Bash(git status)", "Bash(git diff:*)", "Bash(git branch:*)", "Bash(git log:*)",
			"Bash(git show:*)", "Bash(git merge-base:*)", "Bash(git rev-parse:*)",
			"Bash(head:*)", "Bash(tail:*)", "Bash(cat:*)", "Bash(grep:*)", "Bash(rg:*)",
			"Bash(find:*)", "WebFetch", PluralMCPToolsWildcard, CodebaseMemoryMCPToolsWildcard,
		).AllowTools(externalMCPAllowTools(external)...).DenyTools("Edit", "Write", "Bash(rm:*)", "Bash(sudo:*)")
	} else {
		settings.AllowTools(
			"Read", "Write", "Edit", "MultiEdit", "Bash", "WebFetch",
			PluralMCPToolsWildcard, CodebaseMemoryMCPToolsWildcard,
		).AllowTools(externalMCPAllowTools(external)...)
	}
	return settings.WriteToFile(filepath.Join(agent.configPath(config), "settings.local.json"))
}

func externalMCPAllowTools(servers []mcp.Server) []string {
	tools := make([]string, 0)
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
