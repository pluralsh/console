package gemini

import (
	_ "embed"
	"encoding/json"
	"strings"
	"text/template"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/mcp"
)

//go:embed templates/settings.json.gotmpl
var settingsTemplate string

const SettingsFileName = "settings.json"

type ConfigTemplateInput struct {
	Model             Model
	RepositoryDir     string
	ExtraDirectories  []string
	AgentRunID        string
	AgentRunMode      console.AgentRunMode
	InactivityTimeout int64
	GitAccessToken    string
}

func settings(input *ConfigTemplateInput) (fileName, content string, err error) {
	tmpl, err := template.New(SettingsFileName).Parse(settingsTemplate)
	if err != nil {
		return "", "", err
	}

	out := new(strings.Builder)
	err = tmpl.Execute(out, input)
	if err != nil {
		return SettingsFileName, "", err
	}

	content, err = injectExternalMCPServers(out.String())
	return SettingsFileName, content, err
}

func injectExternalMCPServers(content string) (string, error) {
	servers, err := mcp.Load()
	if err != nil {
		return "", err
	}
	if len(servers) == 0 {
		return content, nil
	}

	var cfg map[string]any
	if err := json.Unmarshal([]byte(content), &cfg); err != nil {
		return "", err
	}

	mcpServers, _ := cfg["mcpServers"].(map[string]any)
	if mcpServers == nil {
		mcpServers = map[string]any{}
		cfg["mcpServers"] = mcpServers
	}

	for _, server := range servers {
		entry := map[string]any{
			"httpUrl":     server.URL,
			"trust":       true,
			"description": "External MCP server " + server.Name,
		}
		if len(server.Headers) > 0 {
			entry["headers"] = server.Headers
		}
		if server.HasAllowedTools() {
			entry["includeTools"] = server.AllowedTools
		}
		mcpServers[server.Name] = entry
	}

	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return "", err
	}
	return string(data), nil
}
