package codex

import (
	"testing"
	"time"

	console "github.com/pluralsh/console/go/client"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

func TestResolveSettingsUsesDefaultAndProxyModel(t *testing.T) {
	run := codexTestRun(console.AgentRunModeReview, "", false)
	run.Runtime.Config.Codex.Timeout = 7 * time.Minute
	settings, err := NewAgent(toolv1.Config{Run: run}).ResolveSettings(run)
	if err != nil {
		t.Fatalf("ResolveSettings() error = %v", err)
	}
	if settings.Model.Provider == nil || *settings.Model.Provider != console.AiProviderOpenai {
		t.Fatalf("provider = %v, want openai", settings.Model.Provider)
	}
	if settings.Model.Name != defaultModel {
		t.Fatalf("model = %q, want %q", settings.Model.Name, defaultModel)
	}
	if settings.Model.Reasoning != defaultReasoning {
		t.Fatalf("reasoning = %q, want %q", settings.Model.Reasoning, defaultReasoning)
	}
	if settings.Timeout != 7*time.Minute || settings.Proxy {
		t.Fatalf("settings = %#v", settings)
	}
	capabilities := NewAgent(toolv1.Config{}).Capabilities()
	for _, mode := range []console.AgentRunMode{console.AgentRunModeAnalyze, console.AgentRunModeWrite, console.AgentRunModeReview} {
		if !capabilities.Supports(mode) {
			t.Fatalf("Codex capabilities do not include %s", mode)
		}
	}

	proxyRun := codexTestRun(console.AgentRunModeWrite, "gpt-5.4", true)
	proxySettings, err := NewAgent(toolv1.Config{Run: proxyRun}).ResolveSettings(proxyRun)
	if err != nil {
		t.Fatal(err)
	}
	if proxySettings.Model.Name != "openai/gpt-5.4" || !proxySettings.Proxy {
		t.Fatalf("proxy settings = %#v", proxySettings)
	}
}

func TestResolveSettingsPreservesExplicitModel(t *testing.T) {
	// This provider-qualified fixture verifies explicit model IDs pass through unchanged.
	const explicitModel = "vendor/gpt-5.6-luna-custom"
	run := codexTestRun(console.AgentRunModeWrite, explicitModel, false)
	settings, err := NewAgent(toolv1.Config{Run: run}).ResolveSettings(run)
	if err != nil {
		t.Fatalf("ResolveSettings() error = %v", err)
	}
	if settings.Model.Name != explicitModel {
		t.Fatalf("model = %q, want %q", settings.Model.Name, explicitModel)
	}
}

func TestCodexProfilesAndACPSettings(t *testing.T) {
	agent := NewAgent(toolv1.Config{Run: codexTestRun(console.AgentRunModeWrite, "gpt-5.4", false)})
	for _, test := range []struct {
		mode    console.AgentRunMode
		profile string
	}{
		{console.AgentRunModeAnalyze, analysisProfile},
		{console.AgentRunModeWrite, autonomousProfile},
		{console.AgentRunModeReview, reviewProfile},
	} {
		profile, ok := agent.profileForMode(test.mode)
		if !ok || profile != test.profile {
			t.Fatalf("profileForMode(%s) = %q, %v", test.mode, profile, ok)
		}
	}
	model, reasoning, modeID, err := agent.resolveACPSettings(toolv1.Settings{Mode: console.AgentRunModeReview, Model: toolv1.ModelSelection{Name: "gpt-5.4"}})
	if err != nil {
		t.Fatal(err)
	}
	if want := "gpt-5.4"; model != want {
		t.Fatalf("ACP model = %q, want %q", model, want)
	}
	if want := defaultReasoning; reasoning != want {
		t.Fatalf("ACP reasoning = %q, want %q", reasoning, want)
	}
	if want := acpModeID; modeID != want {
		t.Fatalf("ACP mode = %q, want %q", modeID, want)
	}
}

func TestCodexWireAPI(t *testing.T) {
	agent := NewAgent(toolv1.Config{})
	for _, test := range []struct {
		method string
		want   string
	}{
		{method: string(console.OpenAiMethodChat), want: chatWireAPI},
		{method: string(console.OpenAiMethodResponses), want: responsesWireAPI},
		{method: string(console.OpenAiMethodAuto), want: ""},
		{method: "", want: ""},
	} {
		if got := agent.wireAPI(test.method); got != test.want {
			t.Fatalf("wireAPI(%q) = %q, want %q", test.method, got, test.want)
		}
	}
}
