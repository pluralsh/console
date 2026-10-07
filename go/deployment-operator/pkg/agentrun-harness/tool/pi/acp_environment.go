package pi

import (
	"fmt"
	"strings"

	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

const (
	consoleTokenEnv    = "PLRL_CONSOLE_TOKEN"
	openAIAPIKeyEnv    = "OPENAI_API_KEY"
	anthropicAPIKeyEnv = "ANTHROPIC_API_KEY"
	azureAPIKeyEnv     = "AZURE_OPENAI_API_KEY"
	bedrockAPIKeyEnv   = "AWS_BEARER_TOKEN_BEDROCK"
	xaiAPIKeyEnv       = "XAI_API_KEY"
)

func (agent *Agent) env(config toolv1.Config) []string {
	pi, _ := agent.runConfig(config.Run)
	apiKey := ""
	if pi != nil {
		apiKey = pi.APIKey
	}
	if config.Run.IsProxyEnabled() {
		apiKey = agent.consoleToken
	}

	env := []string{
		fmt.Sprintf("PI_CODING_AGENT_DIR=%s", agent.piHome(config)),
		fmt.Sprintf("%s=%s", consoleTokenEnv, agent.consoleToken),
		fmt.Sprintf("%s=%s", openAIAPIKeyEnv, apiKey),
	}
	switch strings.ToLower(agent.resolvedProvider(config)) {
	case providerAnthropic:
		env = append(env, fmt.Sprintf("%s=%s", anthropicAPIKeyEnv, apiKey))
	case providerAzure:
		env = append(env, fmt.Sprintf("%s=%s", azureAPIKeyEnv, apiKey))
	case providerAmazonBedrock, providerBedrock:
		env = append(env, fmt.Sprintf("%s=%s", bedrockAPIKeyEnv, apiKey))
	case providerXAI:
		env = append(env, fmt.Sprintf("%s=%s", xaiAPIKeyEnv, apiKey))
	}
	return env
}
