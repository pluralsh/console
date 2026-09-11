package pi

import (
	"encoding/json"
	"fmt"
	"path/filepath"

	"github.com/pluralsh/console/go/deployment-operator/internal/helpers"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/mcp"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
)

const (
	modelsFileName     = "models.json"
	mcpFileName        = "mcp.json"
	settingsFileName   = "settings.json"
	piMCPExtensionPath = "/opt/pi-mcp-adapter/node_modules/pi-mcp-adapter/index.ts"
)

func (agent *Agent) configPath(config toolv1.Config) string {
	return filepath.Join(agent.piHome(config), modelsFileName)
}

func (agent *Agent) mcpConfigPath(config toolv1.Config) string {
	return filepath.Join(agent.piHome(config), mcpFileName)
}

func (agent *Agent) settingsPath(config toolv1.Config) string {
	return filepath.Join(agent.piHome(config), settingsFileName)
}

func (agent *Agent) writeNativeConfig(config toolv1.Config, model string) error {
	resolved, err := agent.nativeSettings(config, model)
	if err != nil {
		return err
	}

	providers := map[string]any{}
	if resolved.endpoint != "" {
		providers[resolved.provider] = map[string]any{
			"baseUrl": resolved.endpoint,
			"apiKey":  fmt.Sprintf("$%s", openAIAPIKeyEnv),
			"api":     "openai-responses",
			"models": []map[string]any{{
				"id":            resolved.model,
				"contextWindow": 128000,
				"maxTokens":     16384,
			}},
		}
	}
	data, err := json.Marshal(map[string]any{"providers": providers})
	if err != nil {
		return fmt.Errorf("marshal pi model config: %w", err)
	}
	if err := helpers.File().Create(agent.configPath(config), string(data), 0644); err != nil {
		return fmt.Errorf("write pi model config: %w", err)
	}

	servers := map[string]any{
		"plural": map[string]any{
			"url":         common.AgentMCPServerURL,
			"directTools": true,
		},
		common.CodebaseMemoryMCPServerName: map[string]any{
			"command": common.CodebaseMemoryMCPCommand,
			"env": map[string]string{
				common.CodebaseMemoryCacheEnv: common.CodebaseMemoryCacheDir,
			},
			"directTools": true,
		},
	}
	if err := addExternalMCPServers(servers); err != nil {
		return err
	}
	mcpData, err := json.Marshal(map[string]any{"mcpServers": servers})
	if err != nil {
		return fmt.Errorf("marshal pi mcp config: %w", err)
	}
	if err := helpers.File().Create(agent.mcpConfigPath(config), string(mcpData), 0644); err != nil {
		return fmt.Errorf("write pi mcp config: %w", err)
	}
	settingsData, err := json.Marshal(map[string]any{"extensions": []string{piMCPExtensionPath}})
	if err != nil {
		return fmt.Errorf("marshal pi settings: %w", err)
	}
	if err := helpers.File().Create(agent.settingsPath(config), string(settingsData), 0644); err != nil {
		return fmt.Errorf("write pi settings: %w", err)
	}
	return nil
}

func addExternalMCPServers(servers map[string]any) error {
	external, err := mcp.Load()
	if err != nil {
		return fmt.Errorf("load external mcp servers: %w", err)
	}
	for _, server := range external {
		entry := map[string]any{"url": server.URL}
		if len(server.Headers) > 0 {
			entry["headers"] = server.Headers
		}
		if server.HasAllowedTools() {
			entry["directTools"] = server.AllowedTools
			entry["includeTools"] = server.AllowedTools
		} else {
			entry["directTools"] = true
		}
		servers[server.Name] = entry
	}
	return nil
}
