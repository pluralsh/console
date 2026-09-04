package codex

import (
	"fmt"
	"os"
	"path/filepath"

	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/dind"
	mcpcfg "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/mcp"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
)

// These names are the shell environment variables allowed by native Codex
// configuration.
const (
	gitAccessTokenEnv = "GIT_ACCESS_TOKEN"
	pathEnv           = "PATH"
	homeEnv           = "HOME"
	gitSigningKeyEnv  = "GIT_SIGNING_KEY_PATH"
)

// The mounted signing key is exposed to Codex only when this agent-run path
// exists and can be used by the shell environment policy.
const gitSigningKeyPath = common.GitSigningKeyMountPath

// Codex trusts the agent-run pod for isolation and never waits for an
// interactive approval during a configured run.
const (
	sandboxModeHarness  = "danger-full-access"
	approvalPolicyNever = "never"
)

// Built-in and user-configured MCP servers use these Codex transport and trust
// labels when native configuration is generated.
const (
	mcpHTTPTransport  = "http"
	mcpStdioTransport = "stdio"
	trustPolicyAlways = "always"
)

func (agent *Agent) writeNativeConfig(config toolv1.Config, model string) error {
	external, err := mcpcfg.Load()
	if err != nil {
		return err
	}

	profile, ok := agent.profileForMode(config.Run.Mode)
	if !ok {
		return fmt.Errorf("unsupported agent run mode %q for codex", config.Run.Mode)
	}
	modelInstructionsFile, err := agent.systemPromptPath(config)
	if err != nil {
		return err
	}

	provider, baseURL, envKey, wireAPI := agent.resolveProviderSettings(config)
	var providers []configTemplateProvider
	if provider != "" {
		providers = []configTemplateProvider{{
			Name:    provider,
			BaseURL: baseURL,
			EnvKey:  envKey,
			WireAPI: wireAPI,
		}}
	}

	templateInput := &ConfigTemplateInput{
		RepositoryDir: config.RepositoryDir,
		Profile: configTemplateProfile{
			Name:                   profile,
			Model:                  model,
			ModelProvider:          provider,
			SandboxMode:            sandboxModeHarness,
			ApprovalPolicy:         approvalPolicyNever,
			ModelReasoningEffort:   defaultReasoning,
			ShellEnvironmentPolicy: agent.shellEnvironmentPolicy(config.Run.DindEnabled),
			EnableWebSearch:        true,
			EnableShellCache:       true,
			ModelInstructionsFile:  modelInstructionsFile,
		},
		Providers:  providers,
		MCPServers: agent.nativeMCPServers(external),
	}

	configPath, err := agent.writeConfig(filepath.Join(agent.codexHome(config)), templateInput)
	if err != nil {
		return err
	}

	klog.InfoS("Codex configured", "configPath", configPath)
	return nil
}

func (agent *Agent) nativeMCPServers(external []mcpcfg.Server) []configTemplateMCP {
	result := []configTemplateMCP{{
		Name:        pluralProvider,
		Type:        mcpHTTPTransport,
		URL:         common.AgentMCPServerURL,
		TrustPolicy: trustPolicyAlways,
	}, {
		Name:        common.CodebaseMemoryMCPServerName,
		Type:        mcpStdioTransport,
		Command:     common.CodebaseMemoryMCPCommand,
		Env:         agent.templateKeyValues(map[string]string{common.CodebaseMemoryCacheEnv: common.CodebaseMemoryCacheDir}),
		TrustPolicy: trustPolicyAlways,
	}}
	indices := map[string]int{
		pluralProvider:                     0,
		common.CodebaseMemoryMCPServerName: 1,
	}

	for _, server := range external {
		input := configTemplateMCP{
			Name:        server.Name,
			URL:         server.URL,
			HTTPHeaders: agent.templateKeyValues(server.Headers),
			TrustPolicy: trustPolicyAlways,
		}
		if server.HasAllowedTools() {
			input.EnabledTools = server.AllowedTools
		}
		if index, ok := indices[server.Name]; ok {
			result[index] = input
			continue
		}
		indices[server.Name] = len(result)
		result = append(result, input)
	}
	return result
}

func (agent *Agent) shellEnvironmentVariables(dindEnabled bool) []string {
	vars := []string{pathEnv, homeEnv, gitAccessTokenEnv}
	if _, err := os.Stat(gitSigningKeyPath); err == nil {
		vars = append(vars, gitSigningKeyEnv)
	}
	if dindEnabled {
		vars = append(vars, dind.DockerHostEnv)
	}
	return vars
}

func (agent *Agent) shellEnvironmentPolicy(dindEnabled bool) *configTemplateShellEnvironmentPolicy {
	policy := &configTemplateShellEnvironmentPolicy{IncludeOnly: agent.shellEnvironmentVariables(dindEnabled)}
	if !dindEnabled {
		return policy
	}
	if value := os.Getenv(dind.DockerHostEnv); value != "" {
		policy.Set = []configTemplateKeyValue{{Key: dind.DockerHostEnv, Value: value}}
	}
	return policy
}
