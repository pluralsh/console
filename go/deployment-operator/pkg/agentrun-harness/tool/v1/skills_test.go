package v1

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	console "github.com/pluralsh/console/go/client"
	agentrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun/v1"
)

func TestNormalizeSkillName(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		want string
	}{
		{name: "Code Review", want: "code-review"},
		{name: "  Release   QA  ", want: "release-qa"},
		{name: "GitHub/PR Reviewer!", want: "github-pr-reviewer"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if got := normalizeSkillName(tt.name); got != tt.want {
				t.Fatalf("normalizeSkillName() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestConfigureSkillsWritesRuntimeGlobalSkills(t *testing.T) {
	t.Parallel()

	description := "Use when reviewing pull requests."
	workDir := t.TempDir()
	tool := DefaultTool{Config: Config{
		WorkDir: workDir,
		Run: &agentrunv1.AgentRun{
			Skills: []*console.AgentSkill{{
				Name:        "Code Review",
				Description: &description,
				Contents:    "Review the diff and call out correctness risks.",
			}},
		},
	}}

	if err := tool.ConfigureSkills(console.AgentRuntimeTypeClaude); err != nil {
		t.Fatalf("ConfigureSkills() error = %v", err)
	}

	content := readSkill(t, workDir, ".claude", "skills", "code-review")
	if !strings.Contains(content, "name: code-review") {
		t.Fatalf("expected normalized skill name in frontmatter, got:\n%s", content)
	}
	if !strings.Contains(content, `description: "Use when reviewing pull requests."`) {
		t.Fatalf("expected skill description in frontmatter, got:\n%s", content)
	}
	if !strings.Contains(content, "Review the diff") {
		t.Fatalf("expected skill body, got:\n%s", content)
	}
}

func TestConfigureSkillsNormalizesExistingFrontmatterName(t *testing.T) {
	t.Parallel()

	workDir := t.TempDir()
	contents := "---\nname: Custom Name\ndescription: Custom description.\n---\n\nBody"
	tool := DefaultTool{Config: Config{
		WorkDir: workDir,
		Run: &agentrunv1.AgentRun{
			Skills: []*console.AgentSkill{{Name: "Custom Name", Contents: contents}},
		},
	}}

	if err := tool.ConfigureSkills(console.AgentRuntimeTypeCodex); err != nil {
		t.Fatalf("ConfigureSkills() error = %v", err)
	}

	got := readSkill(t, workDir, ".codex", "skills", "custom-name")
	if strings.Count(got, "---") != 2 {
		t.Fatalf("expected existing frontmatter to be preserved, got:\n%s", got)
	}
	if !strings.Contains(got, "name: custom-name") {
		t.Fatalf("expected normalized frontmatter name, got:\n%s", got)
	}
	if !strings.Contains(got, "description: Custom description.") {
		t.Fatalf("expected existing frontmatter description, got:\n%s", got)
	}
}

func readSkill(t *testing.T, parts ...string) string {
	t.Helper()

	path := filepath.Join(append(parts, skillFileName)...)
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("failed to read skill %q: %v", path, err)
	}
	return string(content)
}
