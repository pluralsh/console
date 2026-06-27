package v1

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	console "github.com/pluralsh/console/go/client"
)

const (
	skillFileName = "SKILL.md"
)

var skillNameInvalidChars = regexp.MustCompile(`[^a-z0-9-]+`)

func (in DefaultTool) ConfigureSkills(runtime console.AgentRuntimeType) error {
	if in.Config.Run == nil || len(in.Config.Run.Skills) == 0 {
		return nil
	}

	baseDir := in.skillsDir(runtime)
	if baseDir == "" {
		return nil
	}

	seen := map[string]int{}
	for _, skill := range in.Config.Run.Skills {
		if skill == nil || strings.TrimSpace(skill.Name) == "" {
			continue
		}

		name := normalizeSkillName(skill.Name)
		if name == "" {
			continue
		}

		seen[name]++
		dirName := name
		if seen[name] > 1 {
			dirName = fmt.Sprintf("%s-%d", name, seen[name])
		}

		if err := writeSkill(baseDir, dirName, skill); err != nil {
			return err
		}
	}

	return nil
}

func (in DefaultTool) skillsDir(runtime console.AgentRuntimeType) string {
	switch runtime {
	case console.AgentRuntimeTypeClaude:
		return filepath.Join(in.Config.WorkDir, ".claude", "skills")
	case console.AgentRuntimeTypeCodex:
		return filepath.Join(in.Config.WorkDir, ".codex", "skills")
	case console.AgentRuntimeTypeOpencode:
		return filepath.Join(in.Config.WorkDir, ".config", "opencode", "skills")
	default:
		return ""
	}
}

func writeSkill(baseDir, dirName string, skill *console.AgentSkill) error {
	skillDir := filepath.Join(baseDir, dirName)
	if err := os.MkdirAll(skillDir, 0755); err != nil {
		return fmt.Errorf("failed to create skill directory %q: %w", skillDir, err)
	}

	content := skillContents(dirName, skill)
	if err := os.WriteFile(filepath.Join(skillDir, skillFileName), []byte(content), 0644); err != nil {
		return fmt.Errorf("failed to write skill %q: %w", dirName, err)
	}

	return nil
}

func normalizeSkillName(name string) string {
	name = strings.ToLower(strings.TrimSpace(name))
	name = strings.ReplaceAll(name, " ", "-")
	name = skillNameInvalidChars.ReplaceAllString(name, "-")
	name = strings.Trim(name, "-")
	for strings.Contains(name, "--") {
		name = strings.ReplaceAll(name, "--", "-")
	}
	return name
}

func skillContents(name string, skill *console.AgentSkill) string {
	contents := strings.TrimSpace(skill.Contents)
	description := strings.TrimSpace(stringValue(skill.Description))
	if hasFrontmatter(contents) {
		return normalizeSkillFrontmatter(contents, name, description)
	}

	if description == "" {
		description = fmt.Sprintf("Use this skill for %s workflows.", name)
	}

	return fmt.Sprintf("---\nname: %s\ndescription: %s\n---\n\n%s\n", name, yamlQuote(description), contents)
}

func hasFrontmatter(contents string) bool {
	contents = strings.TrimSpace(contents)
	if !strings.HasPrefix(contents, "---\n") {
		return false
	}

	return strings.Contains(contents[4:], "\n---")
}

func normalizeSkillFrontmatter(contents, name, description string) string {
	rest := strings.TrimSpace(contents)[len("---\n"):]
	closing := strings.Index(rest, "\n---")
	if closing == -1 {
		return contents + "\n"
	}

	frontmatter := rest[:closing]
	body := rest[closing+len("\n---"):]
	lines := strings.Split(frontmatter, "\n")
	hasName := false
	hasDescription := false
	for i, line := range lines {
		key := strings.TrimSpace(line)
		switch {
		case strings.HasPrefix(key, "name:"):
			lines[i] = "name: " + name
			hasName = true
		case strings.HasPrefix(key, "description:"):
			hasDescription = true
		}
	}
	if !hasName {
		lines = append([]string{"name: " + name}, lines...)
	}
	if !hasDescription && description != "" {
		lines = append(lines, "description: "+yamlQuote(description))
	}

	return fmt.Sprintf("---\n%s\n---%s\n", strings.Join(lines, "\n"), body)
}

func stringValue(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func yamlQuote(value string) string {
	value = strings.ReplaceAll(value, "\\", "\\\\")
	value = strings.ReplaceAll(value, `"`, `\"`)
	return `"` + value + `"`
}
