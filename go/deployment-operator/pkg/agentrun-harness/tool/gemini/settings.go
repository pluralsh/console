package gemini

import (
	_ "embed"
	"strings"
	"text/template"

	console "github.com/pluralsh/console/go/client"
)

//go:embed templates/settings.json.gotmpl
var settingsTemplate string

const SettingsFileName = "settings.json"

type ConfigTemplateInput struct {
	Model             Model
	RepositoryDir     string
	AgentRunID        string
	AgentRunMode      console.AgentRunMode
	InactivityTimeout int64
	GitAccessToken    string

	// BrowserEnabled is true when the agent pod has the browser-use MCP
	// sidecar available alongside the headless browser. When true, the
	// rendered settings additionally register the `browser` MCP server.
	BrowserEnabled bool

	// BrowserMCPURL is the in-pod URL of the browser-use MCP server
	// (typically http://127.0.0.1:8082/mcp).
	BrowserMCPURL string
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
