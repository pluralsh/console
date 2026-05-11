package gemini

import (
	_ "embed"
	"strings"
	"text/template"

	console "github.com/pluralsh/console/go/client"
	agentrunv1 "github.com/pluralsh/deployment-operator/pkg/agentrun-harness/agentrun/v1"
)

//go:embed templates/settings.json.gotmpl
var settingsTemplate string

const SettingsFileName = "settings.json"

type ConfigTemplateInput struct {
	Model             Model
	RepositoryDir     string
	ConsoleURL        string
	ConsoleToken      string
	DeployToken       string
	AgentRunID        string
	AgentRunMode      console.AgentRunMode
	InactivityTimeout int64
	ExaMcpConfigs     []agentrunv1.ExaMcpServerConfig
	GitAccessToken    string
}

func settings(input *ConfigTemplateInput) (fileName, content string, err error) {
	tmpl, err := template.New(SettingsFileName).Parse(settingsTemplate)
	if err != nil {
		return "", "", err
	}

	out := new(strings.Builder)
	err = tmpl.Execute(out, input)

	return SettingsFileName, out.String(), err
}
