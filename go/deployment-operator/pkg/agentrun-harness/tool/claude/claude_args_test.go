package claude

import "testing"

func TestClaudeRunArgs(t *testing.T) {
	args := claudeRunArgs("/repo", "/plural/.claude/prompts/AGENTS.md", "autonomous", Sonnet46, "fix tests", "")
	want := []string{
		"--add-dir", "/repo",
		"--agents", "autonomous",
		"--system-prompt-file", "/plural/.claude/prompts/AGENTS.md",
		"--model", string(Sonnet46),
		"-p", "fix tests",
		"--output-format", "stream-json",
		"--verbose",
	}
	assertArgsEqual(t, want, args)
}

func TestClaudeRunArgsResume(t *testing.T) {
	sessionID := "550e8400-e29b-41d4-a716-446655440000"
	args := claudeRunArgs("/repo", "/plural/.claude/prompts/AGENTS.md", "autonomous", Sonnet46, "add tests", sessionID)
	want := []string{
		"--add-dir", "/repo",
		"--agents", "autonomous",
		"--system-prompt-file", "/plural/.claude/prompts/AGENTS.md",
		"--model", string(Sonnet46),
		"--resume", sessionID,
		"-p", "add tests",
		"--output-format", "stream-json",
		"--verbose",
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
