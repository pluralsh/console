package codex

import (
	"encoding/json"
	"fmt"

	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

// These names are the environment variables exchanged between the agent-run
// process and Codex's ACP adapter.
const (
	consoleTokenEnv       = "PLRL_CONSOLE_TOKEN"
	openAIAPIKeyEnv       = "OPENAI_API_KEY"
	codexAPIKeyEnv        = "CODEX_API_KEY"
	codexConfigEnv        = "CODEX_CONFIG"
	codexHomeEnv          = "CODEX_HOME"
	defaultAuthRequestEnv = "DEFAULT_AUTH_REQUEST"
	modelProviderEnv      = "MODEL_PROVIDER"
	noBrowserEnv          = "NO_BROWSER"
)

// These fixed bootstrap values let Codex authenticate with an API key without
// opening a browser in the agent-run pod.
const (
	defaultAuthRequest = `{"methodId":"api-key"}`
	noBrowserValue     = "1"
)

func (agent *Agent) env(config toolv1.Config, model, provider string) ([]string, error) {
	codex := config.Run.Runtime.Config.Codex
	credential := codex.ApiKey
	if config.Run.IsProxyEnabled() {
		credential = agent.consoleToken
	}

	configJSON, err := json.Marshal(map[string]string{"model": model})
	if err != nil {
		return nil, fmt.Errorf("marshal codex ACP config: %w", err)
	}

	env := []string{
		fmt.Sprintf("%s=%s", consoleTokenEnv, agent.consoleToken),
		fmt.Sprintf("%s=%s", codexHomeEnv, agent.codexHome(config)),
		fmt.Sprintf("%s=%s", codexAPIKeyEnv, credential),
		fmt.Sprintf("%s=%s", defaultAuthRequestEnv, defaultAuthRequest),
		fmt.Sprintf("%s=%s", noBrowserEnv, noBrowserValue),
		fmt.Sprintf("%s=%s", codexConfigEnv, configJSON),
	}

	if !config.Run.IsProxyEnabled() {
		env = append(env, fmt.Sprintf("%s=%s", openAIAPIKeyEnv, codex.ApiKey))
	}
	if provider != "" {
		env = append(env, fmt.Sprintf("%s=%s", modelProviderEnv, provider))
	}

	return env, nil
}
