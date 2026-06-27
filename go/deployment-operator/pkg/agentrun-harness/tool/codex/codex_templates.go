package codex

import (
	"os"
	"path/filepath"

	"github.com/pelletier/go-toml/v2"

	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/dind"
)

func BuildCodexConfig(repositoryDir string, agents []AgentInput, mcps []MCPInput, providers []ModelProviderInput) (*CodexConfig, error) {
	cfg := &CodexConfig{
		Features: &Features{
			Skills: true,
		},
		Profiles:   make(map[string]*Profile),
		MCPServers: make(map[string]*MCPServer),
	}
	cfg.Projects = map[string]*Project{
		repositoryDir: {
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
				WireAPI: p.WireAPI,
			}
		}
	}

	// Add profiles
	for _, a := range agents {
		profile := &Profile{
			Model:                  a.Model,
			ModelProvider:          a.ModelProvider,
			SandboxMode:            a.SandboxMode,
			ApprovalPolicy:         a.ApprovalPolicy,
			ModelReasoningEffort:   a.ModelReasoningEffort,
			ShellEnvironmentPolicy: shellEnvPolicy(a.DindEnabled),
			Features: &Features{
				WebSearchRequest: a.EnableWebSearch,
				ShellSnapshot:    a.EnableShellCache,
			},
			ModelInstructionsFile: a.ModelInstructionsFile,
		}
		cfg.Profiles[a.Name] = profile
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

func shellEnvPolicy(dindEnabled bool) *ShellEnvPolicy {
	policy := &ShellEnvPolicy{
		IncludeOnly: codexAllowedEnvVars(dindEnabled),
	}
	if !dindEnabled {
		return policy
	}

	policy.Set = map[string]string{}
	for _, key := range []string{dind.DockerHostEnv} {
		if val := os.Getenv(key); val != "" {
			policy.Set[key] = val
		}
	}
	return policy
}
