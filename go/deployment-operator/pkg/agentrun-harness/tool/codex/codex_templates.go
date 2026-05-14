package codex

import (
	"os"
	"path/filepath"

	"github.com/pelletier/go-toml/v2"
)

func loadPrompt(path string) (string, error) {
	if path == "" {
		return "", nil
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func BuildCodexConfig(dir string, agents []AgentInput, mcps []MCPInput, providers []ModelProviderInput) (*CodexConfig, error) {
	cfg := &CodexConfig{
		Profiles:   make(map[string]*Profile),
		MCPServers: make(map[string]*MCPServer),
	}
	cfg.Projects = map[string]*Project{
		dir: {
			TrustLevel: "trusted",
		},
	}

	// Add custom model providers
	if len(providers) > 0 {
		cfg.ModelProviders = make(map[string]*ModelProviderConfig, len(providers))
		for _, p := range providers {
			cfg.ModelProviders[p.Name] = &ModelProviderConfig{
				Name:    p.Name,
				BaseURL: p.BaseURL,
				EnvKey:  p.EnvKey,
			}
		}
	}

	// Add profiles
	for _, a := range agents {
		prompt, err := loadPrompt(a.PromptFile)
		if err != nil {
			return nil, err
		}

		cfg.Profiles[a.Name] = &Profile{
			Model:                a.Model,
			ModelProvider:        a.ModelProvider,
			SandboxMode:          a.SandboxMode,
			ApprovalPolicy:       a.ApprovalPolicy,
			ModelReasoningEffort: a.ModelReasoningEffort,
			ShellEnvironmentPolicy: &ShellEnvPolicy{
				IncludeOnly: a.AllowedEnvVars,
			},
			Features: &Features{
				WebSearchRequest: a.EnableWebSearch,
				ShellSnapshot:    a.EnableShellCache,
			},
			Prompt: prompt,
		}
	}

	// Add MCP servers
	for _, m := range mcps {
		cfg.MCPServers[m.Name] = &MCPServer{
			Type:          m.Type,
			URL:           m.URL,
			Command:       m.Command,
			Args:          m.Args,
			Env:           m.Env,
			Headers:       m.Headers,
			EnabledTools:  m.EnabledTools,
			DisabledTools: m.DisabledTools,
			TrustPolicy:   m.TrustPolicy,
		}
	}

	return cfg, nil
}

func WriteCodexConfig(basePath string, cfg *CodexConfig) (string, error) {
	if err := os.MkdirAll(basePath, 0755); err != nil {
		return "", err
	}

	filePath := filepath.Join(basePath, "config.toml")
	data, err := toml.Marshal(cfg)
	if err != nil {
		return "", err
	}

	if err := os.WriteFile(filePath, data, 0644); err != nil {
		return "", err
	}

	return filePath, nil
}
