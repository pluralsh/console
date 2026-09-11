package opencode

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

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

func TestAgentPreparePhases(t *testing.T) {
	useTestSystemTemplates(t)
	workDir := t.TempDir()
	repositoryDir := t.TempDir()
	run := agentRun("anthropic", "claude-sonnet-4-5", false, false)
	run.Prompt = "initial prompt"
	run.Skills = []agentrunv1.AgentSkill{{Name: "review-guide", Contents: "check the diff"}}
	agent := NewAgent(toolv1.Config{Run: run})

	request := toolv1.FileSystemRequest{
		Phase:         toolv1.ConfigurePhaseInitial,
		WorkDir:       workDir,
		RepositoryDir: repositoryDir,
	}
	if err := agent.Prepare(context.Background(), request); err != nil {
		t.Fatalf("Prepare(initial) error = %v", err)
	}
	promptPath := filepath.Join(workDir, ".opencode", "prompts", toolv1.SystemPromptFile)
	prompt, err := os.ReadFile(promptPath)
	if err != nil {
		t.Fatalf("read initial prompt: %v", err)
	}
	if !strings.Contains(string(prompt), "initial prompt") {
		t.Fatalf("initial prompt does not contain run prompt: %s", prompt)
	}
	if _, err := os.Stat(filepath.Join(workDir, ".opencode", "skills", "review-guide", "SKILL.md")); err != nil {
		t.Fatalf("skill file was not prepared: %v", err)
	}

	request.Phase = toolv1.ConfigurePhaseBabysit
	if err := agent.Prepare(context.Background(), request); err != nil {
		t.Fatalf("Prepare(babysit) error = %v", err)
	}
	babysitPrompt, err := os.ReadFile(promptPath)
	if err != nil {
		t.Fatalf("read babysit prompt: %v", err)
	}
	if string(babysitPrompt) == string(prompt) {
		t.Fatal("babysit preparation did not replace the system prompt")
	}
}

func useTestSystemTemplates(t *testing.T) {
	t.Helper()
	root := t.TempDir()
	systemDir := filepath.Join(root, "system")
	if err := os.Mkdir(systemDir, 0755); err != nil {
		t.Fatalf("create system template directory: %v", err)
	}
	for _, name := range []string{"analyze", "write", "review", "babysit"} {
		path := filepath.Join(systemDir, name+".md.tmpl")
		if err := os.WriteFile(path, []byte(name+" {{.Prompt}}"), 0644); err != nil {
			t.Fatalf("write %s template: %v", name, err)
		}
	}
	t.Chdir(root)
}
