package v1

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"gopkg.in/yaml.v3"

	agentrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun/v1"
)

func TestConfigureSkillsWritesSkillFiles(t *testing.T) {
	description := `Use when "docs" change: keep examples runnable.`
	root := t.TempDir()
	run := &agentrunv1.AgentRun{
		ID: "run-123",
		Skills: []agentrunv1.AgentSkill{
			{
				Name:        "readme-helper",
				Description: &description,
				Contents:    "Always keep examples runnable.",
			},
			{
				Name:     "empty-contents",
				Contents: "   ",
			},
		},
	}

	tool := DefaultTool{Config: Config{Run: run}}
	if err := tool.ConfigureSkills(root); err != nil {
		t.Fatalf("ConfigureSkills() error = %v", err)
	}

	readmePath := filepath.Join(root, "readme-helper", skillFileName)
	readme, err := os.ReadFile(readmePath)
	if err != nil {
		t.Fatalf("expected skill file %q: %v", readmePath, err)
	}
	content := string(readme)
	if !strings.Contains(content, "name: readme-helper") {
		t.Fatalf("expected skill name in frontmatter, got:\n%s", content)
	}
	frontmatter := parseSkillFrontmatter(t, content)
	if frontmatter.Name != "readme-helper" {
		t.Fatalf("expected frontmatter name readme-helper, got %q", frontmatter.Name)
	}
	if frontmatter.Description != description {
		t.Fatalf("expected frontmatter description %q, got %q", description, frontmatter.Description)
	}
	if strings.Contains(content, "Plural workbench skill.") ||
		strings.Contains(content, "Original skill name:") ||
		strings.Contains(content, "Source: AgentRun") {
		t.Fatalf("expected no provenance comment, got:\n%s", content)
	}
	if !strings.Contains(content, "Always keep examples runnable.") {
		t.Fatalf("expected skill contents, got:\n%s", content)
	}

	if _, err := os.Stat(filepath.Join(root, "empty-contents", skillFileName)); !os.IsNotExist(err) {
		t.Fatalf("expected empty skill to be skipped, stat err = %v", err)
	}
}

func TestConfigureSkillsUsesFallbackDescription(t *testing.T) {
	root := t.TempDir()
	run := &agentrunv1.AgentRun{
		ID: "run--123",
		Skills: []agentrunv1.AgentSkill{
			{
				Name:     "safe-comment",
				Contents: "Instructions.",
			},
		},
	}

	tool := DefaultTool{Config: Config{Run: run}}
	if err := tool.ConfigureSkills(root); err != nil {
		t.Fatalf("ConfigureSkills() error = %v", err)
	}

	raw, err := os.ReadFile(filepath.Join(root, "safe-comment", skillFileName))
	if err != nil {
		t.Fatalf("expected skill file: %v", err)
	}
	content := string(raw)
	frontmatter := parseSkillFrontmatter(t, content)
	if frontmatter.Description != "Plural workbench skill from agent run run--123" {
		t.Fatalf("expected fallback description, got %q", frontmatter.Description)
	}
	if strings.Contains(content, "Source: AgentRun run--123") {
		t.Fatalf("expected no provenance comment, got:\n%s", content)
	}
}

func parseSkillFrontmatter(t *testing.T, content string) skillFrontmatter {
	t.Helper()

	parts := strings.SplitN(content, "---", 3)
	if len(parts) != 3 {
		t.Fatalf("expected YAML frontmatter, got:\n%s", content)
	}

	var frontmatter skillFrontmatter
	if err := yaml.Unmarshal([]byte(parts[1]), &frontmatter); err != nil {
		t.Fatalf("failed to parse frontmatter: %v\n%s", err, content)
	}

	return frontmatter
}
