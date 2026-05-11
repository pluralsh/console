package opencode

import (
	_ "embed"
	"strings"
	"text/template"

	console "github.com/pluralsh/console/go/client"
	agentrunv1 "github.com/pluralsh/deployment-operator/pkg/agentrun-harness/agentrun/v1"
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

	// Endpoint is the AI provider API endpoint.
	Endpoint string

	// Model is the AI model to use.
	Model string

	// Token is the API token for the AI provider.
	Token string

	// Mode is the agent run mode.
	Mode console.AgentRunMode

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
