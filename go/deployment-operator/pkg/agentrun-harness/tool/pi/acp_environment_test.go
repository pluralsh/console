package pi

import (
	"strings"
	"testing"

	console "github.com/pluralsh/console/go/client"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

func TestAgentEnvUsesSupportedProviderAPIKeys(t *testing.T) {
	for _, test := range []struct {
		provider string
		envName  string
	}{
		{provider: providerAnthropic, envName: anthropicAPIKeyEnv},
		{provider: providerAzure, envName: azureAPIKeyEnv},
		{provider: providerAmazonBedrock, envName: bedrockAPIKeyEnv},
		{provider: providerXAI, envName: xaiAPIKeyEnv},
	} {
		t.Run(test.provider, func(t *testing.T) {
			run := piTestRun(console.AgentRunModeWrite, test.provider, "model", nil, false)
			agent := NewAgent(toolv1.Config{WorkDir: t.TempDir(), RepositoryDir: t.TempDir(), Run: run})
			values := make(map[string]string)
			for _, item := range agent.env(agent.config) {
				key, value, ok := strings.Cut(item, "=")
				if ok {
					values[key] = value
				}
			}
			if values[test.envName] != "api-key" {
				t.Fatalf("%s environment = %q", test.envName, values[test.envName])
			}
		})
	}
}
