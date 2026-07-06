package opencode

import (
	"testing"

	console "github.com/pluralsh/console/go/client"
	agentrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun/v1"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

func TestOpencodeArgs(t *testing.T) {
	oc := &Opencode{
		DefaultTool: toolv1.DefaultTool{Config: toolv1.Config{
			Run: &agentrunv1.AgentRun{Mode: console.AgentRunModeWrite, Prompt: "initial"},
		}},
		provider: "anthropic",
		model:    "claude-sonnet-4-6",
	}

	args := oc.args("fix bug", false)
	want := []string{
		"run",
		"--format", "json",
		"--agent", defaultWriteAgent,
		"--model", "anthropic/claude-sonnet-4-6",
		"fix bug",
	}
	assertArgsEqual(t, want, args)
}

func TestOpencodeArgsResume(t *testing.T) {
	sessionID := "ses_2132323b6ffeuRlYHhPcU8DaZ6"
	oc := &Opencode{
		DefaultTool: toolv1.DefaultTool{Config: toolv1.Config{
			Run: &agentrunv1.AgentRun{Mode: console.AgentRunModeAnalyze, Prompt: "initial"},
		}},
		provider:  "anthropic",
		model:     "claude-sonnet-4-6",
		sessionID: sessionID,
	}

	args := oc.args("continue analysis", true)
	want := []string{
		"run",
		"--format", "json",
		"--agent", defaultAnalysisAgent,
		"--model", "anthropic/claude-sonnet-4-6",
		"--session", sessionID,
		"continue analysis",
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
