package opencode

import (
	_ "embed"
	"strings"
	"text/template"

	console "github.com/pluralsh/console/go/client"
	agentrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun/v1"
)

//go:embed templates/opencode.json.gotmpl
var configTemplateText string

const (
	ConfigFileName = "opencode.json"
)

type ConfigTemplateInput struct {
	ConsoleURL   string
	ConsoleToken string
	DeployToken  string
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

	// ExaMcpConfigs holds additional external MCP server configurations.
	ExaMcpConfigs []agentrunv1.ExaMcpServerConfig
}

func configTemplate(input *ConfigTemplateInput) (fileName, content string, err error) {
	tmpl, err := template.New(ConfigFileName).Parse(configTemplateText)
	if err != nil {
		return "", "", err
	}

	out := new(strings.Builder)
	err = tmpl.Execute(out, input)

	return ConfigFileName, out.String(), err
}
