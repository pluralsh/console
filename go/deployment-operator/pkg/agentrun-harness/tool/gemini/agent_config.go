package gemini

import (
	"fmt"
	"os"
	"path/filepath"

	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

func (agent *Agent) writeNativeConfig(config toolv1.Config, model string) error {
	gemini, err := agent.runConfig(config.Run)
	if err != nil {
		return err
	}
	if err := agent.validateMode(config.Run.Mode); err != nil {
		return err
	}
	if model == "" {
		model = agent.resolveModelForSettings(config, toolv1.Settings{Model: toolv1.ModelSelection{Name: gemini.Model}})
	}

	input := &ConfigTemplateInput{
		Model:             model,
		AgentRunMode:      config.Run.Mode,
		InactivityTimeout: int64(gemini.InactivityTimeout.Seconds()),
	}
	_, content, err := settings(input)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(agent.geminiHome(config), 0755); err != nil {
		return fmt.Errorf("create gemini settings directory: %w", err)
	}
	if err := os.WriteFile(filepath.Join(agent.geminiHome(config), SettingsFileName), []byte(content), 0644); err != nil {
		return fmt.Errorf("write gemini settings: %w", err)
	}
	return nil
}
