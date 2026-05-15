package claude

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

type SettingsBuilder struct {
	settings Settings
}

type Settings struct {
	Model                      string                 `json:"model"`
	Temperature                float64                `json:"temperature"`
	EnableAllProjectMcpServers bool                   `json:"enableAllProjectMcpServers,omitempty"`
	Permissions                Permissions            `json:"permissions"`
	Env                        map[string]string      `json:"env,omitempty"`
	Custom                     map[string]interface{} `json:",inline,omitempty"`
}

type Permissions struct {
	Allow []string `json:"allow"`
	Deny  []string `json:"deny"`
}

func NewSettingsBuilder(model Model) *SettingsBuilder {
	return &SettingsBuilder{
		settings: Settings{
			Model:                      string(model),
			Temperature:                0.1,
			EnableAllProjectMcpServers: true,
			Permissions: Permissions{
				Allow: []string{},
				Deny:  []string{},
			},
			Env:    make(map[string]string),
			Custom: make(map[string]interface{}),
		},
	}
}
func (b *SettingsBuilder) WithModel(model string) *SettingsBuilder {
	b.settings.Model = model
	return b
}

func (b *SettingsBuilder) WithTemperature(temp float64) *SettingsBuilder {
	b.settings.Temperature = temp
	return b
}

func (b *SettingsBuilder) AllowTools(tools ...string) *SettingsBuilder {
	b.settings.Permissions.Allow = append(b.settings.Permissions.Allow, tools...)
	return b
}

func (b *SettingsBuilder) DenyTools(tools ...string) *SettingsBuilder {
	b.settings.Permissions.Deny = append(b.settings.Permissions.Deny, tools...)
	return b
}

func (b *SettingsBuilder) WithEnv(key, value string) *SettingsBuilder {
	b.settings.Env[key] = value
	return b
}

func (b *SettingsBuilder) Build() Settings {
	return b.settings
}

func (b *SettingsBuilder) WriteToFile(path string) error {
	// Create directory if needed
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}

	// Marshal with indentation
	data, err := json.MarshalIndent(b.settings, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal settings: %w", err)
	}

	// Write to file
	if err := os.WriteFile(path, data, 0644); err != nil {
		return fmt.Errorf("failed to write file: %w", err)
	}

	return nil
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
