package codex

import (
	"strings"
	"testing"

	console "github.com/pluralsh/console/go/client"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
)

func TestBuildACPEnvironmentUsesSidecarPlaceholder(t *testing.T) {
	for _, test := range []struct {
		name      string
		streaming bool
	}{
		{name: "proxy"},
		{name: "streaming proxy", streaming: true},
	} {
		t.Run(test.name, func(t *testing.T) {
			token := "console-token"
			run := codexTestRun(console.AgentRunModeWrite, "gpt-5.4", true)
			run.Runtime.StreamingProxy = test.streaming
			run.PluralCreds = &console.PluralCredsFragment{Token: &token}
			config := toolv1.Config{WorkDir: t.TempDir(), RepositoryDir: t.TempDir(), Run: run}
			env, err := NewAgent(config).env(config, "openai/gpt-5.4", pluralProvider)
			if err != nil {
				t.Fatalf("buildACPEnvironment() failed: %v", err)
			}
			values := testEnvValues(env)
			if values[codexAPIKeyEnv] != common.AgentAIProxyAPIKey {
				t.Fatal("proxy environment did not use the sidecar placeholder")
			}
			for key, value := range values {
				if strings.Contains(value, token) {
					t.Fatalf("proxy environment leaked the Plural token in %s", key)
				}
			}
			if _, ok := values[openAIAPIKeyEnv]; ok {
				t.Fatal("proxy environment included the direct API key variable")
			}
			if values[modelProviderEnv] != pluralProvider || values[codexConfigEnv] != `{"model":"openai/gpt-5.4"}` {
				t.Fatal("proxy environment lost provider or model configuration")
			}
		})
	}
}

func testEnvValues(env []string) map[string]string {
	values := make(map[string]string, len(env))
	for _, item := range env {
		key, value, ok := strings.Cut(item, "=")
		if ok {
			values[key] = value
		}
	}
	return values
}
