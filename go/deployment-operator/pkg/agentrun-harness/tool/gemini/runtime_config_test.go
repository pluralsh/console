package gemini

import (
	"testing"
	"time"

	console "github.com/pluralsh/console/go/client"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

func TestResolveSettingsUsesDefaultModel(t *testing.T) {
	run := geminiTestRun(console.AgentRunModeReview, "", nil)
	run.Runtime.Config.Gemini.Timeout = 7 * time.Minute
	settings, err := NewAgent(toolv1.Config{Run: run}).ResolveSettings(run)
	if err != nil {
		t.Fatalf("ResolveSettings() error = %v", err)
	}
	if settings.Model.Provider != nil {
		t.Fatalf("provider = %v, want nil", settings.Model.Provider)
	}
	if settings.Model.Name != defaultModel || settings.Timeout != 7*time.Minute || settings.Proxy {
		t.Fatalf("settings = %#v", settings)
	}
}

func TestValidateMode(t *testing.T) {
	agent := NewAgent(toolv1.Config{})
	for _, mode := range []console.AgentRunMode{console.AgentRunModeAnalyze, console.AgentRunModeWrite, console.AgentRunModeReview} {
		if err := agent.validateMode(mode); err != nil {
			t.Fatalf("validateMode(%q) error = %v", mode, err)
		}
	}
	if err := agent.validateMode("unsupported"); err == nil {
		t.Fatal("validateMode() error = nil")
	}
}
