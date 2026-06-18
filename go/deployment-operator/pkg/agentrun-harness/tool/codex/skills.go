package codex

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

const bundledSkillsDirName = "skills"

func bundledSkillsDir(workDir string) string {
	return filepath.Join(workDir, bundledSkillsDirName)
}

func bundledSkillConfigs(skillsDir string) ([]SkillConfigEntry, error) {
	entries, err := os.ReadDir(skillsDir)
	if err != nil {
		return nil, fmt.Errorf("read bundled skills dir %q: %w", skillsDir, err)
	}

	var configs []SkillConfigEntry
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		skillPath := filepath.Join(skillsDir, entry.Name(), "SKILL.md")
		if _, err := os.Stat(skillPath); err != nil {
			if os.IsNotExist(err) {
				continue
			}
			return nil, fmt.Errorf("stat skill %q: %w", skillPath, err)
		}

		configs = append(configs, SkillConfigEntry{
			Path:    skillPath,
			Enabled: true,
		})
	}

	sort.Slice(configs, func(i, j int) bool {
		return strings.ToLower(configs[i].Path) < strings.ToLower(configs[j].Path)
	})

	return configs, nil
}
