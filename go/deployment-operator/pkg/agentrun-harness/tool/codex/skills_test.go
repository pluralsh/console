package codex

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/pelletier/go-toml/v2"
)

func TestBundledSkillConfigs(t *testing.T) {
	skillsDir := t.TempDir()
	for _, name := range []string{"plural-services", "plural-git-repository"} {
		dir := filepath.Join(skillsDir, name)
		if err := os.MkdirAll(dir, 0755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(filepath.Join(dir, "SKILL.md"), []byte("---\nname: "+name+"\n---\n"), 0644); err != nil {
			t.Fatal(err)
		}
	}

	configs, err := bundledSkillConfigs(skillsDir)
	if err != nil {
		t.Fatalf("bundledSkillConfigs: %v", err)
	}
	if len(configs) != 2 {
		t.Fatalf("expected 2 skills, got %d", len(configs))
	}
	if configs[0].Path != filepath.Join(skillsDir, "plural-git-repository", "SKILL.md") {
		t.Fatalf("unexpected first skill path: %s", configs[0].Path)
	}
	if !configs[0].Enabled {
		t.Fatal("expected skills to be enabled")
	}
}

func TestCodexConfigSkillsConfigTOML(t *testing.T) {
	cfg := &CodexConfig{
		Features: &CodexGlobalFeatures{Skills: true},
		Skills: &SkillsSettings{
			Config: []SkillConfigEntry{{
				Path:    "/plural/skills/plural-git-repository/SKILL.md",
				Enabled: true,
			}},
		},
	}

	data, err := toml.Marshal(cfg)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	out := string(data)
	if !strings.Contains(out, "[[skills.config]]") {
		t.Fatalf("expected [[skills.config]] in config, got:\n%s", out)
	}
	if !strings.Contains(out, "/plural/skills/plural-git-repository/SKILL.md") {
		t.Fatalf("expected skill path in config, got:\n%s", out)
	}
	if !strings.Contains(out, "enabled = true") {
		t.Fatalf("expected enabled = true in config, got:\n%s", out)
	}
}
