package v1

import (
	"os"
	"testing"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/internal/controller"
)

func TestAgentRun_IsStreamingProxyEnabled(t *testing.T) {
	t.Run("requires aiProxy", func(t *testing.T) {
		t.Setenv(controller.EnvStreamingProxy, "true")

		run := &AgentRun{
			Runtime: &AgentRuntime{
				StreamingProxy: true,
			},
		}
		if run.IsStreamingProxyEnabled() {
			t.Fatal("expected streaming proxy disabled without aiProxy")
		}
	})

	t.Run("enabled from pod env", func(t *testing.T) {
		t.Setenv(controller.EnvStreamingProxy, "true")

		aiProxy := true
		run := new(AgentRun).FromAgentRunFragment(&console.AgentRunFragment{
			Runtime: &console.AgentRuntimeFragment{
				AiProxy: &aiProxy,
			},
		})
		if !run.IsStreamingProxyEnabled() {
			t.Fatal("expected streaming proxy enabled")
		}
	})

	t.Run("disabled when env unset", func(t *testing.T) {
		_ = os.Unsetenv(controller.EnvStreamingProxy)

		aiProxy := true
		run := new(AgentRun).FromAgentRunFragment(&console.AgentRunFragment{
			Runtime: &console.AgentRuntimeFragment{
				AiProxy: &aiProxy,
			},
		})
		if run.IsStreamingProxyEnabled() {
			t.Fatal("expected streaming proxy disabled without env")
		}
	})
}
