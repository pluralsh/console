package claude

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

func TestAgentPrepareConfigureAndExport(t *testing.T) {
	useClaudeSystemTemplates(t)
	workDir, repositoryDir := t.TempDir(), t.TempDir()
	run := claudeTestRun(console.AgentRunModeWrite, "", true)
	run.Prompt = "initial prompt"
	run.Skills = []agentrunv1.AgentSkill{{Name: "guide", Contents: "inspect changes"}}
	agent := NewAgent(toolv1.Config{WorkDir: workDir, RepositoryDir: repositoryDir, Run: run})
	request := toolv1.FileSystemRequest{Phase: toolv1.ConfigurePhaseInitial, WorkDir: workDir, RepositoryDir: repositoryDir}

	if err := agent.Prepare(context.Background(), request); err != nil {
		t.Fatal(err)
	}
	for _, promptPath := range []string{
		filepath.Join(workDir, claudeConfigDir, "prompts", toolv1.SystemPromptFile),
		filepath.Join(workDir, claudeConfigDir, claudePromptFile),
	} {
		prompt, err := os.ReadFile(promptPath)
		if err != nil {
			t.Fatal(err)
		}
		if !strings.Contains(string(prompt), "initial prompt") {
			t.Fatalf("prompt %q = %q", promptPath, prompt)
		}
	}

	if _, err := os.Stat(filepath.Join(workDir, claudeConfigDir, claudeSkillsDir, "guide", "SKILL.md")); err != nil {
		t.Fatal(err)
	}

	settings, err := agent.ResolveSettings(run)
	if err != nil {
		t.Fatal(err)
	}
	if err := agent.Configure(context.Background(), toolv1.ConfigureRequest{Phase: toolv1.ConfigurePhaseInitial, ConsoleURL: "https://console.example", ConsoleToken: "console-token", Settings: settings}); err != nil {
		t.Fatal(err)
	}

	native, err := os.ReadFile(filepath.Join(workDir, claudeConfigDir, "settings.json"))
	if err != nil {
		t.Fatal(err)
	}

	for _, want := range []string{`"model": "claude-sonnet-5"`, `"availableModels": [`, `"Write"`, `"BASH_DEFAULT_TIMEOUT_MS"`} {
		if !strings.Contains(string(native), want) {
			t.Fatalf("native settings missing %q: %s", want, native)
		}
	}

	if _, err := os.Stat(filepath.Join(workDir, ".mcp.json")); err != nil {
		t.Fatal(err)
	}
	request.Phase = toolv1.ConfigurePhaseBabysit
	if err := agent.Prepare(context.Background(), request); err != nil {
		t.Fatal(err)
	}
	if err := agent.Configure(context.Background(), toolv1.ConfigureRequest{Phase: toolv1.ConfigurePhaseBabysit}); err != nil {
		t.Fatal(err)
	}

	afterBabysit, err := os.ReadFile(filepath.Join(workDir, claudeConfigDir, "settings.json"))
	if err != nil {
		t.Fatal(err)
	}
	if string(native) != string(afterBabysit) {
		t.Fatal("babysit configuration unexpectedly rewrote native settings")
	}

	projectDir := filepath.Join(workDir, claudeConfigDir, claudeProjectsDir, "project")
	if err := os.MkdirAll(projectDir, 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(projectDir, "session.jsonl"), []byte("state"), 0644); err != nil {
		t.Fatal(err)
	}

	outputDir := t.TempDir()
	result, err := agent.Export(context.Background(), toolv1.ExportRequest{SessionID: "session", OutputDir: outputDir})
	if err != nil {
		t.Fatal(err)
	}
	if result.SessionSource.Path != outputDir || result.SessionSource.ArchivePath != claudeProjectsDir {
		t.Fatalf("session source = %#v", result.SessionSource)
	}

	if content, err := os.ReadFile(filepath.Join(outputDir, "project", "session.jsonl")); err != nil || string(content) != "state" {
		t.Fatalf("staged session = %q, %v", content, err)
	}
}

func TestAgentConfigureReadOnlyPermissions(t *testing.T) {
	useClaudeSystemTemplates(t)
	config := toolv1.Config{WorkDir: t.TempDir(), RepositoryDir: t.TempDir(), Run: claudeTestRun(console.AgentRunModeReview, "claude-sonnet-4-6", false)}
	agent := NewAgent(config)
	if err := agent.Configure(context.Background(), toolv1.ConfigureRequest{Phase: toolv1.ConfigurePhaseInitial}); err != nil {
		t.Fatal(err)
	}
	settings, err := os.ReadFile(filepath.Join(config.WorkDir, claudeConfigDir, "settings.json"))
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{`"model": "claude-sonnet-4-6"`, `"availableModels": ["claude-sonnet-4-6"]`, `"Edit"`, `"Write"`, `"Bash(rm:*)"`} {
		if !strings.Contains(string(settings), want) {
			t.Fatalf("settings missing deny %q", want)
		}
	}
}

func claudeTestRun(mode console.AgentRunMode, model string, proxy bool) *agentrunv1.AgentRun {
	return &agentrunv1.AgentRun{ID: "run-1", Mode: mode, Runtime: &agentrunv1.AgentRuntime{AiProxy: proxy, Config: &agentrunv1.AgentRuntimeConfig{Claude: &agentrunv1.ClaudeConfig{ApiKey: "api-key", Model: model, Timeout: 9 * time.Minute, BashTimeout: time.Minute, BashMaxTimeout: 2 * time.Minute}}}}
}

func useClaudeSystemTemplates(t *testing.T) {
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
