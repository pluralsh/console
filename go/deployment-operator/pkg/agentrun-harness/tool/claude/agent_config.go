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

	settings := &settingsTemplateInput{
		Model:                model,
		BashDefaultTimeoutMS: fmt.Sprintf("%d", claude.BashTimeout.Milliseconds()),
		BashMaxTimeoutMS:     fmt.Sprintf("%d", claude.BashMaxTimeout.Milliseconds()),
		ExternalMCPServers:   external,
		ReadOnly: config.Run.Mode == console.AgentRunModeAnalyze ||
			config.Run.Mode == console.AgentRunModeReview,
	}
	_, err = agent.writeSettings(agent.configPath(config), settings)
	return err
}
