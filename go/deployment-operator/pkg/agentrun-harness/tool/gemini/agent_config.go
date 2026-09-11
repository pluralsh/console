package gemini

import (
	"fmt"
	"os"
	"path/filepath"

	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

const (
	privateDirectoryMode = 0700
	privateFileMode      = 0600
	geminiPolicy         = `[[rule]]
toolName = "update_topic"
decision = "deny"
priority = 999
denyMessage = "Use normal progress messages instead of update_topic."

[[rule]]
toolName = "run_shell_command"
commandPrefix = "rm -rf"
decision = "deny"
priority = 999
denyMessage = "Recursive forced deletion is disabled in this environment."

[[rule]]
toolName = "run_shell_command"
# This is an accidental secret-dump guard, not a shell sandbox.
# Gemini matches commandRegex against JSON-encoded tool arguments.
commandRegex = '''\s*(?:\(\s*)?(?:[A-Za-z_][A-Za-z0-9_]*=(?:[^\s"'\\]|\\"(?:[^"\\]|\\.)*\\"|\\\\.|'[^']*')*\s+)*(?:(?:exec|command|builtin)\s+)?(?:(?:/usr/bin/|/bin/)?env(?:\s+(?:-|--|-i|--ignore-environment|-0|--null|-v|--debug)|\s+(?:-u|-C|-S|--unset|--chdir|--split-string|--argv0)\s+\S+|\s+(?:-[uCS]\S+|--(?:unset|chdir|split-string|argv0)=\S+))*(?:\s+[A-Za-z_][A-Za-z0-9_]*=(?:[^\s"'\\]|\\"(?:[^"\\]|\\.)*\\"|\\\\.|'[^']*')*)*|(?:/usr/bin/|/bin/)?printenv(?:\s+-\S+)*|set|export\s+-p)(?:\s*(?:[|;&]|\d*(?:>>?|<<?)|"\s*[,}]|\))|\s+#)'''
decision = "deny"
priority = 999
denyMessage = "Broad environment enumeration can disclose secrets. Inspect only a named non-secret variable."
`
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
		return fmt.Errorf("render gemini settings: %w", err)
	}
	homePath := agent.geminiHome(config)
	if err := ensurePrivateDirectory(homePath); err != nil {
		return fmt.Errorf("create gemini settings directory: %w", err)
	}
	if err := writePrivateFile(filepath.Join(homePath, SettingsFileName), []byte(content)); err != nil {
		return fmt.Errorf("write gemini settings: %w", err)
	}

	policyPath := agent.policiesPath(config)
	if err := ensurePrivateDirectory(policyPath); err != nil {
		return fmt.Errorf("create gemini policy directory: %w", err)
	}
	if err := writePrivateFile(filepath.Join(policyPath, geminiPolicyFileName), []byte(geminiPolicy)); err != nil {
		return fmt.Errorf("write gemini policy: %w", err)
	}
	return nil
}

func ensurePrivateDirectory(path string) error {
	if err := os.MkdirAll(path, privateDirectoryMode); err != nil {
		return err
	}
	return os.Chmod(path, privateDirectoryMode)
}

func writePrivateFile(path string, content []byte) error {
	if err := os.Chmod(path, privateFileMode); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("secure existing file: %w", err)
	}
	if err := os.WriteFile(path, content, privateFileMode); err != nil {
		return err
	}
	return os.Chmod(path, privateFileMode)
}
