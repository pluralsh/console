package opencode

import (
	"bytes"
	"context"
	"fmt"
	"os"
	stdexec "os/exec"
	"path/filepath"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/internal/helpers"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
)

// Configure writes the OpenCode provider configuration and shared system
// prompt files used by both the legacy and ACP adapters.
func Configure(config toolv1.Config, consoleURL, consoleToken string, provider Provider, model string, openaiCompatible bool) error {
	defaultTool := toolv1.DefaultTool{Config: config}
	if err := defaultTool.ConfigureSystemPrompt(console.AgentRuntimeTypeOpencode); err != nil {
		return err
	}
	if err := defaultTool.ConfigureSkills(opencodeSkillsPath(config)); err != nil {
		return err
	}

	input := &ConfigTemplateInput{
		ConsoleURL:            consoleURL,
		ConsoleToken:          consoleToken,
		AgentRunID:            config.Run.ID,
		Provider:              provider,
		OpenAICompatible:      openaiCompatible,
		Endpoint:              config.Run.Runtime.Config.OpenCode.Endpoint,
		Model:                 model,
		Token:                 config.Run.Runtime.Config.OpenCode.Token,
		Mode:                  config.Run.Mode,
		DindEnabled:           config.Run.DindEnabled,
		StreamingProxy:        config.Run.IsStreamingProxyEnabled(),
		StreamingProxyBaseURL: common.AgentOpenAIBaseURL,
	}

	_, content, err := configTemplate(input)
	if err != nil {
		return err
	}

	configPath := opencodeConfigFilePath(config)
	if err = helpers.File().Create(configPath, content, 0644); err != nil {
		return fmt.Errorf("failed configuring opencode config file %q: %w", ConfigFileName, err)
	}
	return nil
}

func opencodeProviderPath(config toolv1.Config) string {
	return filepath.Join(config.WorkDir, ".opencode")
}

func opencodeConfigFilePath(config toolv1.Config) string {
	return filepath.Join(opencodeProviderPath(config), ConfigFileName)
}

func opencodeSkillsPath(config toolv1.Config) string {
	return filepath.Join(opencodeProviderPath(config), "skills")
}

func opencodeConfigHome(config toolv1.Config) string {
	return filepath.Join(config.WorkDir, ".config")
}

func opencodeDataHome(config toolv1.Config) string {
	return filepath.Join(config.WorkDir, ".local", "share")
}

func opencodeEnv(config toolv1.Config, configPath string) []string {
	return []string{
		fmt.Sprintf("OPENCODE_CONFIG=%s", configPath),
		fmt.Sprintf("XDG_CONFIG_HOME=%s", opencodeConfigHome(config)),
		fmt.Sprintf("XDG_DATA_HOME=%s", opencodeDataHome(config)),
	}
}

// ACPConfigPath returns the path to the OpenCode configuration used by ACP.
func ACPConfigPath(config toolv1.Config) string {
	return opencodeConfigFilePath(config)
}

// ACPSkillsPath returns the path to OpenCode skills used by ACP.
func ACPSkillsPath(config toolv1.Config) string {
	return opencodeSkillsPath(config)
}

// ACPEnvironment returns the environment required by OpenCode ACP.
func ACPEnvironment(config toolv1.Config, configPath string) []string {
	return opencodeEnv(config, configPath)
}

// ExportSession writes an OpenCode native session export to outputPath.
func ExportSession(ctx context.Context, config toolv1.Config, sessionID, outputPath string) error {
	if sessionID == "" {
		return fmt.Errorf("opencode session id is not set")
	}
	configPath, err := filepath.Abs(opencodeConfigFilePath(config))
	if err != nil {
		return err
	}

	file, err := os.Create(outputPath)
	if err != nil {
		return fmt.Errorf("create opencode session export %q: %w", outputPath, err)
	}
	defer file.Close()

	cmd := stdexec.CommandContext(ctx, "opencode", "export", sessionID)
	cmd.Env = append(os.Environ(), opencodeEnv(config, configPath)...)
	cmd.Dir = config.RepositoryDir
	cmd.Stdout = file
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("opencode export session %q: %w: %s", sessionID, err, stderr.String())
	}
	return nil
}
