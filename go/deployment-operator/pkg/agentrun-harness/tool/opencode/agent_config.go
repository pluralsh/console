package opencode

import (
	"fmt"
	"path/filepath"

	"github.com/pluralsh/console/go/deployment-operator/internal/helpers"
	agentrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun/v1"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
)

// These paths keep OpenCode's native configuration and skills inside the
// workspace owned by the agent run.
const (
	opencodeHomeDir   = ".opencode"
	opencodeSkillsDir = "skills"
)

// ConfigFileName is the native OpenCode configuration filename.
const ConfigFileName = "opencode.json"

// configureNative writes only the provider-native OpenCode configuration. The
// shared prompt and skill files are prepared separately by Agent.Prepare.
func (agent *Agent) configureNative(config toolv1.Config, consoleURL, consoleToken string, provider Provider, model string, openaiCompatible bool, token string) error {
	input := &ConfigTemplateInput{
		ConsoleURL:            consoleURL,
		ConsoleToken:          consoleToken,
		AgentRunID:            config.Run.ID,
		Provider:              provider,
		OpenAICompatible:      openaiCompatible,
		Endpoint:              config.Run.Runtime.Config.OpenCode.Endpoint,
		Model:                 model,
		Token:                 token,
		Mode:                  config.Run.Mode,
		DindEnabled:           config.Run.DindEnabled,
		StreamingProxy:        config.Run.IsStreamingProxyEnabled(),
		StreamingProxyBaseURL: common.AgentOpenAIBaseURL,
	}

	_, content, err := configTemplate(input)
	if err != nil {
		return err
	}

	configPath := agent.configPath(config)
	if err = helpers.File().Create(configPath, content, 0644); err != nil {
		return fmt.Errorf("failed configuring opencode config file %q: %w", ConfigFileName, err)
	}

	return nil
}

func (agent *Agent) providerPath(config toolv1.Config) string {
	return filepath.Join(config.WorkDir, opencodeHomeDir)
}

func (agent *Agent) configPath(config toolv1.Config) string {
	return filepath.Join(agent.providerPath(config), ConfigFileName)
}

func (agent *Agent) skillsPath(config toolv1.Config) string {
	return filepath.Join(agent.providerPath(config), opencodeSkillsDir)
}

func (agent *Agent) configWithOpenCode() (*agentrunv1.OpencodeConfig, error) {
	if agent.config.WorkDir == "" {
		return nil, fmt.Errorf("work directory is not set")
	}
	if agent.config.RepositoryDir == "" {
		return nil, fmt.Errorf("repository directory is not set")
	}
	return agent.runConfig(agent.config.Run)
}

func (agent *Agent) configForFilesystem(request toolv1.FileSystemRequest) (toolv1.Config, error) {
	if request.WorkDir == "" {
		return toolv1.Config{}, fmt.Errorf("work directory is not set")
	}
	if request.RepositoryDir == "" {
		return toolv1.Config{}, fmt.Errorf("repository directory is not set")
	}
	if agent.config.Run == nil {
		return toolv1.Config{}, fmt.Errorf("agent run is not set")
	}

	config := agent.config
	config.WorkDir = request.WorkDir
	config.RepositoryDir = request.RepositoryDir
	return config, nil
}
