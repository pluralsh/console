package gemini

import (
	"testing"

	console "github.com/pluralsh/console/go/client"
	agentrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/prebake"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

func TestGeminiArgs(t *testing.T) {
	prebakeDir := t.TempDir()
	t.Setenv(prebake.EnvDir, prebakeDir)
	g := &Gemini{
		DefaultTool: toolv1.DefaultTool{Config: toolv1.Config{
			RepositoryDir: "/repo",
			Run:           &agentrunv1.AgentRun{Mode: console.AgentRunModeAnalyze, Prompt: "initial"},
		}},
	}

	args := g.args("analyze repo", false)
	want := []string{
		"--output-format", "stream-json",
		"--include-directories", "/repo",
		"--include-directories", prebakeDir,
		"--prompt", "analyze repo",
	}
	assertArgsEqual(t, want, args)
}

func TestGeminiArgsWriteMode(t *testing.T) {
	prebakeDir := t.TempDir()
	t.Setenv(prebake.EnvDir, prebakeDir)
	g := &Gemini{
		DefaultTool: toolv1.DefaultTool{Config: toolv1.Config{
			Run: &agentrunv1.AgentRun{Mode: console.AgentRunModeWrite, Prompt: "initial"},
		}},
	}

	args := g.args("implement feature", false)
	want := []string{
		"--approval-mode", "yolo",
		"--output-format", "stream-json",
		"--include-directories", prebakeDir,
		"--prompt", "implement feature",
	}
	assertArgsEqual(t, want, args)
}

func TestGeminiArgsResume(t *testing.T) {
	prebakeDir := t.TempDir()
	t.Setenv(prebake.EnvDir, prebakeDir)
	sessionID := "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
	g := &Gemini{
		DefaultTool: toolv1.DefaultTool{Config: toolv1.Config{
			Run: &agentrunv1.AgentRun{Mode: console.AgentRunModeWrite, Prompt: "initial"},
		}},
		sessionID: sessionID,
	}

	args := g.args("follow up", true)
	want := []string{
		"--approval-mode", "yolo",
		"--output-format", "stream-json",
		"--include-directories", prebakeDir,
		"--resume", sessionID,
		"--prompt", "follow up",
	}
	assertArgsEqual(t, want, args)
}

func TestGeminiArgsDeduplicateIncludeDirectories(t *testing.T) {
	prebakeDir := t.TempDir()
	t.Setenv(prebake.EnvDir, prebakeDir)
	g := &Gemini{
		DefaultTool: toolv1.DefaultTool{Config: toolv1.Config{
			RepositoryDir: prebakeDir,
			Run:           &agentrunv1.AgentRun{Mode: console.AgentRunModeAnalyze, Prompt: "initial"},
		}},
	}

	args := g.args("", false)
	want := []string{
		"--output-format", "stream-json",
		"--include-directories", prebakeDir,
		"--prompt", "initial",
	}
	assertArgsEqual(t, want, args)
}

func assertArgsEqual(t *testing.T, want, got []string) {
	t.Helper()
	if len(got) != len(want) {
		t.Fatalf("expected %d args, got %d: %v", len(want), len(got), got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("arg[%d]: expected %q, got %q (full: %v)", i, want[i], got[i], got)
		}
	}
}
