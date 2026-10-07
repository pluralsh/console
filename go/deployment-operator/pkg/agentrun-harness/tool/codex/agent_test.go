package codex

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	console "github.com/pluralsh/console/go/client"
	agentrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun/v1"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

func TestAgentExportStagesCodexSessions(t *testing.T) {
	workDir := t.TempDir()
	sessionDir := filepath.Join(workDir, codexHomeDir, codexSessionsDir, "2026", "09", "04")
	if err := os.MkdirAll(sessionDir, 0755); err != nil {
		t.Fatal(err)
	}
	sessionPath := filepath.Join(sessionDir, "rollout-thread-1.jsonl")
	if err := os.WriteFile(sessionPath, []byte(`{"type":"thread.started","thread_id":"thread-1"}`), 0644); err != nil {
		t.Fatal(err)
	}
	agent := NewAgent(toolv1.Config{WorkDir: workDir, RepositoryDir: t.TempDir(), Run: codexTestRun(console.AgentRunModeWrite, "", false)})
	outputDir := t.TempDir()
	result, err := agent.Export(context.Background(), toolv1.ExportRequest{SessionID: "thread-1", OutputDir: outputDir})
	if err != nil {
		t.Fatalf("Export() error = %v", err)
	}
	if result.SessionSource.Path != outputDir || result.SessionSource.ArchivePath != codexSessionsDir {
		t.Fatalf("session source = %#v", result.SessionSource)
	}
	staged, err := os.ReadFile(filepath.Join(outputDir, "2026", "09", "04", "rollout-thread-1.jsonl"))
	if err != nil {
		t.Fatalf("read staged session: %v", err)
	}
	if string(staged) != `{"type":"thread.started","thread_id":"thread-1"}` {
		t.Fatalf("staged session = %q", staged)
	}
	if _, err := os.Stat(sessionPath); err != nil {
		t.Fatalf("live session was removed: %v", err)
	}
}

func TestAgentExportWithoutSessionsReturnsNoSource(t *testing.T) {
	agent := NewAgent(toolv1.Config{WorkDir: t.TempDir(), RepositoryDir: t.TempDir(), Run: codexTestRun(console.AgentRunModeWrite, "", false)})
	result, err := agent.Export(context.Background(), toolv1.ExportRequest{SessionID: "thread-1", OutputDir: t.TempDir()})
	if err != nil {
		t.Fatalf("Export() error = %v", err)
	}
	if result.SessionSource.Path != "" || result.SessionSource.ArchivePath != "" {
		t.Fatalf("session source = %#v, want empty", result.SessionSource)
	}
}

func codexTestRun(mode console.AgentRunMode, model string, proxy bool) *agentrunv1.AgentRun {
	return &agentrunv1.AgentRun{
		ID: "run-1", Mode: mode,
		Runtime: &agentrunv1.AgentRuntime{
			AiProxy: proxy,
			Config: &agentrunv1.AgentRuntimeConfig{Codex: &agentrunv1.CodexConfig{
				Model: model, ApiKey: "api-key", Timeout: 9 * time.Minute,
			}},
		},
	}
}

func useCodexSystemTemplates(t *testing.T) {
	t.Helper()
	root := t.TempDir()
	if err := os.Mkdir(filepath.Join(root, "system"), 0755); err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{"analyze", "write", "review", "babysit"} {
		path := filepath.Join(root, "system", name+".md.tmpl")
		if err := os.WriteFile(path, []byte(name+" {{.Prompt}}"), 0644); err != nil {
			t.Fatal(err)
		}
	}
	t.Chdir(root)
}
