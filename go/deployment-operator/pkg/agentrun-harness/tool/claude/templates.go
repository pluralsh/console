package claude

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"text/template"

	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/mcp"
)

//go:embed templates/settings.local.json.gotmpl
var settingsTemplateText string

const settingsTemplateFileName = "settings.local.json"

type settingsTemplateInput struct {
	Model                string
	BashDefaultTimeoutMS string
	BashMaxTimeoutMS     string
	ExternalMCPServers   []mcp.Server
	ReadOnly             bool
}

func settingsTemplate(input *settingsTemplateInput) (string, error) {
	quote := func(value string) (string, error) {
		quoted, err := json.Marshal(value)
		return string(quoted), err
	}

	tmpl, err := template.New(settingsTemplateFileName).Funcs(template.FuncMap{
		"quote": quote,
	}).Parse(settingsTemplateText)
	if err != nil {
		return "", err
	}

	output := new(strings.Builder)
	if err := tmpl.Execute(output, input); err != nil {
		return "", err
	}

	return output.String(), nil
}

func (agent *Agent) writeSettings(basePath string, input *settingsTemplateInput) (string, error) {
	if err := os.MkdirAll(basePath, 0755); err != nil {
		return "", fmt.Errorf("create settings directory: %w", err)
	}

	content, err := settingsTemplate(input)
	if err != nil {
		return "", fmt.Errorf("render settings template: %w", err)
	}

	filePath := filepath.Join(basePath, settingsTemplateFileName)
	if err := os.WriteFile(filePath, []byte(content), 0644); err != nil {
		return "", fmt.Errorf("write settings file: %w", err)
	}

	return filePath, nil
}

type MCPConfig struct {
	MCPServers map[string]MCPServer `json:"mcpServers"`
}

type MCPServer struct {
	Type    string            `json:"type,omitempty"`
	Command string            `json:"command,omitempty"`
	Args    []string          `json:"args,omitempty"`
	Env     map[string]string `json:"env,omitempty"`
	URL     string            `json:"url,omitempty"`
	Headers map[string]string `json:"headers,omitempty"`
}

type MCPConfigBuilder struct {
	cfg MCPConfig
}

func NewMCPConfigBuilder() *MCPConfigBuilder {
	return &MCPConfigBuilder{
		cfg: MCPConfig{
			MCPServers: make(map[string]MCPServer),
		},
	}
}

func (b *MCPConfigBuilder) AddServer(name, command string) *MCPServerBuilder {
	return &MCPServerBuilder{
		parent: b,
		name:   name,
		server: MCPServer{Command: command, Env: map[string]string{}},
	}
}

func (b *MCPConfigBuilder) AddURLServer(name, url string) *MCPServerBuilder {
	return &MCPServerBuilder{
		parent: b,
		name:   name,
		server: MCPServer{Type: "http", URL: url, Headers: map[string]string{}},
	}
}

func (b *MCPConfigBuilder) Build() MCPConfig {
	return b.cfg
}

func (b *MCPConfigBuilder) ToJSON() ([]byte, error) {
	return json.MarshalIndent(b.cfg, "", "  ")
}

func (b *MCPConfigBuilder) WriteToFile(path string) error {
	// Create directory if needed
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}

	// Marshal with indentation
	data, err := json.MarshalIndent(b.cfg, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal settings: %w", err)
	}

	// Write to file
	if err := os.WriteFile(path, data, 0644); err != nil {
		return fmt.Errorf("failed to write file: %w", err)
	}

	return nil
}

type MCPServerBuilder struct {
	parent *MCPConfigBuilder
	name   string
	server MCPServer
}

func (sb *MCPServerBuilder) Args(args ...string) *MCPServerBuilder {
	sb.server.Args = args
	return sb
}

func (sb *MCPServerBuilder) Env(key, value string) *MCPServerBuilder {
	sb.server.Env[key] = value
	return sb
}

func (sb *MCPServerBuilder) Header(key, value string) *MCPServerBuilder {
	sb.server.Headers[key] = value
	return sb
}

func (sb *MCPServerBuilder) Done() *MCPConfigBuilder {
	sb.parent.cfg.MCPServers[sb.name] = sb.server
	return sb.parent
}
