package gemini

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

func TestAgentPrepareWritesPromptAndSkills(t *testing.T) {
	useGeminiSystemTemplates(t)
	workDir := t.TempDir()
	run := geminiTestRun(console.AgentRunModeAnalyze, "", nil)
	run.Skills = []agentrunv1.AgentSkill{{Name: "repository", Contents: "Use the repository guidance."}}
	agent := NewAgent(toolv1.Config{Run: run})
	request := toolv1.FileSystemRequest{Phase: toolv1.ConfigurePhaseInitial, WorkDir: workDir, RepositoryDir: t.TempDir()}
	if err := agent.Prepare(context.Background(), request); err != nil {
		t.Fatalf("Prepare() error = %v", err)
	}
	prompt, err := os.ReadFile(filepath.Join(workDir, geminiHomeDir, toolv1.SystemPromptFile))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(string(prompt), "analyze") {
		t.Fatalf("prompt = %q", prompt)
	}
	if _, err := os.Stat(filepath.Join(workDir, geminiHomeDir, geminiSkillsDir, "repository", "SKILL.md")); err != nil {
		t.Fatalf("skill: %v", err)
	}
	request.Phase = toolv1.ConfigurePhaseBabysit
	if err := agent.Prepare(context.Background(), request); err != nil {
		t.Fatalf("Prepare(babysit) error = %v", err)
	}
	prompt, err = os.ReadFile(filepath.Join(workDir, geminiHomeDir, toolv1.SystemPromptFile))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(string(prompt), "babysit") {
		t.Fatalf("babysit prompt = %q", prompt)
	}
}

func TestAgentConfigureWritesSettings(t *testing.T) {
	workDir := t.TempDir()
	run := geminiTestRun(console.AgentRunModeReview, "", nil)
	agent := NewAgent(toolv1.Config{WorkDir: workDir, RepositoryDir: "/repo", Run: run})
	if err := agent.Configure(context.Background(), toolv1.ConfigureRequest{Phase: toolv1.ConfigurePhaseInitial}); err != nil {
		t.Fatalf("Configure() error = %v", err)
	}
	settings, err := os.ReadFile(filepath.Join(workDir, geminiHomeDir, SettingsFileName))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(settings), defaultModel) || strings.Contains(string(settings), "WriteFileTool") {
		t.Fatalf("settings = %s", settings)
	}
}

func TestAgentExportStagesChats(t *testing.T) {
	workDir := t.TempDir()
	chatDir := filepath.Join(workDir, geminiHomeDir, "tmp", "plural", geminiChatsDir)
	if err := os.MkdirAll(chatDir, 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(chatDir, "chat.json"), []byte("chat"), 0644); err != nil {
		t.Fatal(err)
	}
	agent := NewAgent(toolv1.Config{WorkDir: workDir, RepositoryDir: t.TempDir(), Run: geminiTestRun(console.AgentRunModeWrite, "", nil)})
	output := t.TempDir()
	result, err := agent.Export(context.Background(), toolv1.ExportRequest{SessionID: "session-1", OutputDir: output})
	if err != nil {
		t.Fatalf("Export() error = %v", err)
	}
	if result.SessionSource.Path != output || result.SessionSource.ArchivePath != geminiChatsDir {
		t.Fatalf("session source = %#v", result.SessionSource)
	}
	content, err := os.ReadFile(filepath.Join(output, "chat.json"))
	if err != nil || string(content) != "chat" {
		t.Fatalf("staged chat = %q, %v", content, err)
	}
}

func geminiTestRun(mode console.AgentRunMode, model string, endpoint *string) *agentrunv1.AgentRun {
	return &agentrunv1.AgentRun{Mode: mode, Runtime: &agentrunv1.AgentRuntime{Config: &agentrunv1.AgentRuntimeConfig{
		Gemini: &agentrunv1.GeminiConfig{APIKey: "api-key", Model: model, Timeout: time.Minute, InactivityTimeout: time.Second, Endpoint: endpoint},
	}}}
}

func useGeminiSystemTemplates(t *testing.T) {
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
