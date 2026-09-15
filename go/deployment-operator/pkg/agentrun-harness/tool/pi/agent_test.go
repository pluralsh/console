package pi

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	console "github.com/pluralsh/console/go/client"
	agentrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun/v1"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

func TestAgentCapabilities(t *testing.T) {
	capabilities := NewAgent(toolv1.Config{}).Capabilities()
	for _, mode := range []console.AgentRunMode{
		console.AgentRunModeAnalyze,
		console.AgentRunModeWrite,
		console.AgentRunModeReview,
	} {
		if !capabilities.Supports(mode) {
			t.Fatalf("Capabilities() does not support %q", mode)
		}
	}
}

func TestAgentPrepare(t *testing.T) {
	usePiSystemTemplates(t)
	workDir := t.TempDir()
	repositoryDir := t.TempDir()
	run := piTestRun(console.AgentRunModeWrite, "", "gpt-5.4", nil, true)
	run.Prompt = "initial prompt"
	run.Skills = []agentrunv1.AgentSkill{{Name: "guide", Contents: "inspect changes"}}
	agent := NewAgent(toolv1.Config{WorkDir: workDir, RepositoryDir: repositoryDir, Run: run})
	request := toolv1.FileSystemRequest{
		Phase:         toolv1.ConfigurePhaseInitial,
		WorkDir:       workDir,
		RepositoryDir: repositoryDir,
	}

	if err := agent.Prepare(context.Background(), request); err != nil {
		t.Fatalf("Prepare(initial) error = %v", err)
	}
	prompt, err := os.ReadFile(filepath.Join(workDir, ".pi", "agent", toolv1.SystemPromptFile))
	if err != nil {
		t.Fatalf("read system prompt: %v", err)
	}
	if !strings.Contains(string(prompt), "initial prompt") {
		t.Fatalf("prompt does not contain run prompt: %s", prompt)
	}
	if _, err := os.Stat(filepath.Join(workDir, ".pi", "agent", "skills", "guide", "SKILL.md")); err != nil {
		t.Fatalf("skill file was not prepared: %v", err)
	}

	request.Phase = toolv1.ConfigurePhaseBabysit
	if err := agent.Prepare(context.Background(), request); err != nil {
		t.Fatalf("Prepare(babysit) error = %v", err)
	}
}

func TestAgentExportStagesNativeSession(t *testing.T) {
	config := toolv1.Config{
		WorkDir:       t.TempDir(),
		RepositoryDir: t.TempDir(),
		Run:           piTestRun(console.AgentRunModeWrite, "", "gpt-5.4", nil, false),
	}
	agent := NewAgent(config)
	if err := os.MkdirAll(agent.sessionsPath(config), 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(agent.sessionsPath(config), "session.jsonl"), []byte("session"), 0644); err != nil {
		t.Fatal(err)
	}
	outputDir := t.TempDir()
	result, err := agent.Export(context.Background(), toolv1.ExportRequest{SessionID: "session-1", OutputDir: outputDir})
	if err != nil {
		t.Fatalf("Export() error = %v", err)
	}
	if result.SessionSource.Path != outputDir || result.SessionSource.ArchivePath != piSessionsDir {
		t.Fatalf("session source = %#v", result.SessionSource)
	}
}

func piTestRun(mode console.AgentRunMode, provider, model string, endpoint *string, proxy bool) *agentrunv1.AgentRun {
	return &agentrunv1.AgentRun{
		ID:   "run-1",
		Mode: mode,
		Runtime: &agentrunv1.AgentRuntime{
			AiProxy: proxy,
			Config: &agentrunv1.AgentRuntimeConfig{Pi: &agentrunv1.PiConfig{
				APIKey:   "api-key",
				Provider: provider,
				Model:    model,
				Endpoint: endpoint,
				Timeout:  9 * time.Minute,
			}},
		},
	}
}

func usePiSystemTemplates(t *testing.T) {
	t.Helper()
	root := t.TempDir()
	if err := os.Mkdir(filepath.Join(root, "system"), 0755); err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{"analyze", "write", "review", "babysit"} {
		if err := os.WriteFile(filepath.Join(root, "system", name+".md.tmpl"), []byte(name+" {{.Prompt}}"), 0644); err != nil {
			t.Fatal(err)
		}
	}
	t.Chdir(root)
}
