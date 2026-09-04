package opencode

import (
	"bytes"
	"context"
	"fmt"
	"os"
	stdexec "os/exec"
	"path/filepath"

	"github.com/pluralsh/console/go/deployment-operator/internal/helpers"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
)

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

func (*Agent) providerPath(config toolv1.Config) string {
	return filepath.Join(config.WorkDir, ".opencode")
}

func (agent *Agent) configPath(config toolv1.Config) string {
	return filepath.Join(agent.providerPath(config), ConfigFileName)
}

func (agent *Agent) skillsPath(config toolv1.Config) string {
	return filepath.Join(agent.providerPath(config), "skills")
}

func (*Agent) configHome(config toolv1.Config) string {
	return filepath.Join(config.WorkDir, ".config")
}

func (*Agent) dataHome(config toolv1.Config) string {
	return filepath.Join(config.WorkDir, ".local", "share")
}

func (agent *Agent) env(config toolv1.Config, configPath string) []string {
	return []string{
		fmt.Sprintf("OPENCODE_CONFIG=%s", configPath),
		fmt.Sprintf("XDG_CONFIG_HOME=%s", agent.configHome(config)),
		fmt.Sprintf("XDG_DATA_HOME=%s", agent.dataHome(config)),
	}
}

// exportSession writes an OpenCode native session export to outputPath.
func (agent *Agent) exportSession(ctx context.Context, config toolv1.Config, sessionID, outputPath string) error {
	if sessionID == "" {
		return fmt.Errorf("opencode session id is not set")
	}
	configPath, err := filepath.Abs(agent.configPath(config))
	if err != nil {
		return err
	}

	file, err := os.Create(outputPath)
	if err != nil {
		return fmt.Errorf("create opencode session export %q: %w", outputPath, err)
	}
	defer file.Close()

	cmd := stdexec.CommandContext(ctx, "opencode", "export", sessionID)
	cmd.Env = append(os.Environ(), agent.env(config, configPath)...)
	cmd.Dir = config.RepositoryDir
	cmd.Stdout = file
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("opencode export session %q: %w: %s", sessionID, err, stderr.String())
	}
	return nil
}
