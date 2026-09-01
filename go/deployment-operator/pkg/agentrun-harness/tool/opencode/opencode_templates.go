package opencode

import (
	_ "embed"
	"encoding/json"
	"strings"
	"text/template"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/mcp"
)

//go:embed templates/opencode.json.gotmpl
var configTemplateText string

const (
	ConfigFileName = "opencode.json"
)

type ConfigTemplateInput struct {
	ConsoleURL   string
	ConsoleToken string
	AgentRunID   string

	// Fields used when AI proxy is disabled.

	// Provider is the AI provider to use.
	Provider Provider

	// OpenAICompatible is true when using a custom OpenAI-compatible provider block (npm @ai-sdk/openai-compatible).
	OpenAICompatible bool

	// Endpoint is an optional override for the provider baseURL (for example a custom OpenAI-compatible URL).
	// When empty, baseURL is omitted so OpenCode uses the models.dev default for the provider.
	Endpoint string

	// Model is the AI model to use.
	Model string

	// Token is the API token for the AI provider.
	Token string

	// Mode is the agent run mode.
	Mode console.AgentRunMode

	// DindEnabled is true when the agent run pod has Docker-in-Docker available.
	DindEnabled bool

	// StreamingProxy routes plural provider requests through the in-pod mcpserver proxy.
	StreamingProxy bool

	// StreamingProxyBaseURL is the OpenAI-compatible base URL for the in-pod streaming proxy.
	StreamingProxyBaseURL string
}

func configTemplate(input *ConfigTemplateInput) (fileName, content string, err error) {
	tmpl, err := template.New(ConfigFileName).Parse(configTemplateText)
	if err != nil {
		return "", "", err
	}

	out := new(strings.Builder)
	err = tmpl.Execute(out, input)
	if err != nil {
		return ConfigFileName, "", err
	}

	content, err = injectExternalMCPServers(out.String())
	return ConfigFileName, content, err
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

	mcpSection, _ := cfg["mcp"].(map[string]any)
	if mcpSection == nil {
		mcpSection = map[string]any{}
		cfg["mcp"] = mcpSection
	}
	agentSection, _ := cfg["agent"].(map[string]any)

	for _, server := range servers {
		entry := map[string]any{
			"type":    "remote",
			"url":     server.URL,
			"enabled": true,
			"oauth":   false,
		}
		if len(server.Headers) > 0 {
			entry["headers"] = server.Headers
		}
		mcpSection[server.Name] = entry

		for _, agentName := range []string{"analysis", "review", "autonomous"} {
			agent, _ := agentSection[agentName].(map[string]any)
			if agent == nil {
				continue
			}
			tools, _ := agent["tools"].(map[string]any)
			if tools == nil {
				tools = map[string]any{}
				agent["tools"] = tools
			}
			for _, key := range openCodeToolKeys(server) {
				tools[key] = true
			}
		}
	}

	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func openCodeToolKeys(server mcp.Server) []string {
	if !server.HasAllowedTools() {
		return []string{server.Name + "*"}
	}
	keys := make([]string, 0, len(server.AllowedTools))
	for _, tool := range server.AllowedTools {
		keys = append(keys, server.Name+"_"+tool)
	}
	return keys
}
