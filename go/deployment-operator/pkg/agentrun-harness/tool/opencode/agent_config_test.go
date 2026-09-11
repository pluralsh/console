package opencode

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

func TestAgentConfigurePreservesNativeConfigForBabysit(t *testing.T) {
	useTestSystemTemplates(t)
	workDir := t.TempDir()
	config := toolv1.Config{
		WorkDir:       workDir,
		RepositoryDir: t.TempDir(),
		Run:           agentRun("anthropic", "claude-sonnet-4-5", false, false),
	}
	agent := NewAgent(config)
	initial := toolv1.FileSystemRequest{Phase: toolv1.ConfigurePhaseInitial, WorkDir: config.WorkDir, RepositoryDir: config.RepositoryDir}
	if err := agent.Prepare(context.Background(), initial); err != nil {
		t.Fatalf("Prepare(initial) error = %v", err)
	}
	settings, err := agent.ResolveSettings(config.Run)
	if err != nil {
		t.Fatalf("ResolveSettings() error = %v", err)
	}
	configure := toolv1.ConfigureRequest{
		Phase:        toolv1.ConfigurePhaseInitial,
		ConsoleURL:   "https://console.example",
		ConsoleToken: "console-token",
		Settings:     settings,
	}
	if err := agent.Configure(context.Background(), configure); err != nil {
		t.Fatalf("Configure(initial) error = %v", err)
	}
	configPath := filepath.Join(workDir, ".opencode", ConfigFileName)
	before, err := os.ReadFile(configPath)
	if err != nil {
		t.Fatalf("read native config: %v", err)
	}

	babysit := initial
	babysit.Phase = toolv1.ConfigurePhaseBabysit
	if err := agent.Prepare(context.Background(), babysit); err != nil {
		t.Fatalf("Prepare(babysit) error = %v", err)
	}
	configure.Phase = toolv1.ConfigurePhaseBabysit
	configure.ConsoleToken = ""
	if err := agent.Configure(context.Background(), configure); err != nil {
		t.Fatalf("Configure(babysit) error = %v", err)
	}
	after, err := os.ReadFile(configPath)
	if err != nil {
		t.Fatalf("read native config after babysit: %v", err)
	}
	if string(before) != string(after) {
		t.Fatal("babysit configuration unexpectedly rewrote native config")
	}

	var native map[string]any
	if err := json.Unmarshal(before, &native); err != nil {
		t.Fatalf("decode native config: %v", err)
	}
	if native["model"] != "anthropic/claude-sonnet-4-5" {
		t.Fatalf("native model = %v", native["model"])
	}
}
