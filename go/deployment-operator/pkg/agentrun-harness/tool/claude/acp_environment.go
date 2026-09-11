package claude

import (
	"fmt"

	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

const (
	claudeConfigEnv     = "CLAUDE_CONFIG_DIR"
	claudeExecutableEnv = "CLAUDE_CODE_EXECUTABLE"
	claudeSandboxEnv    = "IS_SANDBOX"
	anthropicAPIKeyEnv  = "ANTHROPIC_API_KEY"
	anthropicAuthEnv    = "ANTHROPIC_AUTH_TOKEN"
	anthropicBaseURLEnv = "ANTHROPIC_BASE_URL"
	nativeClaudeBinary  = "/usr/local/bin/claude"
)

func (agent *Agent) env(config toolv1.Config) []string {
	claude := config.Run.Runtime.Config.Claude
	env := []string{
		fmt.Sprintf("%s=%s", claudeConfigEnv, agent.configPath(config)),
		fmt.Sprintf("%s=%s", claudeExecutableEnv, nativeClaudeBinary),
		// DIND runs the harness as root. The ACP adapter only advertises its
		// unattended bypass mode to root inside an explicitly marked sandbox.
		fmt.Sprintf("%s=1", claudeSandboxEnv),
	}

	if config.Run.IsProxyEnabled() {
		return append(env,
			fmt.Sprintf("%s=%s", anthropicAuthEnv, agent.consoleToken),
			fmt.Sprintf("%s=%s/ext/ai/anthropic", anthropicBaseURLEnv, agent.consoleURL),
		)
	}

	env = append(env, fmt.Sprintf("%s=%s", anthropicAPIKeyEnv, claude.ApiKey))
	if claude.Endpoint != nil {
		env = append(env, fmt.Sprintf("%s=%s", anthropicBaseURLEnv, *claude.Endpoint))
	}

	return env
}
