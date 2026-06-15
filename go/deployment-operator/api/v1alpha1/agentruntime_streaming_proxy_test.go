package v1alpha1

import (
	"testing"

	"github.com/samber/lo"
)

func TestAgentRuntime_IsStreamingProxyEnabled(t *testing.T) {
	t.Run("requires aiProxy", func(t *testing.T) {
		runtime := &AgentRuntime{
			Spec: AgentRuntimeSpec{
				StreamingProxy: lo.ToPtr(true),
			},
		}
		if runtime.IsStreamingProxyEnabled() {
			t.Fatal("expected streaming proxy disabled without aiProxy")
		}
	})

	t.Run("enabled when both flags set", func(t *testing.T) {
		runtime := &AgentRuntime{
			Spec: AgentRuntimeSpec{
				AiProxy:        lo.ToPtr(true),
				StreamingProxy: lo.ToPtr(true),
			},
		}
		if !runtime.IsStreamingProxyEnabled() {
			t.Fatal("expected streaming proxy enabled")
		}
	})
}
