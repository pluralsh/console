package v1

import (
	"os"
	"path/filepath"
	"testing"

	console "github.com/pluralsh/console/go/client"
)

func TestConfigureSkills_LinksBundledSkills(t *testing.T) {
	workDir := t.TempDir()
	repoDir := filepath.Join(workDir, "repo")
	if err := os.MkdirAll(repoDir, 0755); err != nil {
		t.Fatalf("mkdir repo: %v", err)
	}

	skillsSrc := filepath.Join(workDir, bundledSkillsDir, "plural-git-repository")
	if err := os.MkdirAll(skillsSrc, 0755); err != nil {
		t.Fatalf("mkdir skills source: %v", err)
	}
	if err := os.WriteFile(filepath.Join(skillsSrc, skillFileName), []byte("---\nname: plural-git-repository\ndescription: test\n---\n# test\n"), 0644); err != nil {
		t.Fatalf("write SKILL.md: %v", err)
	}

	tool := DefaultTool{Config: Config{WorkDir: workDir, RepositoryDir: repoDir}}
	for _, runtime := range []console.AgentRuntimeType{
		console.AgentRuntimeTypeClaude,
		console.AgentRuntimeTypeCodex,
		console.AgentRuntimeTypeGemini,
		console.AgentRuntimeTypeOpencode,
	} {
		t.Run(string(runtime), func(t *testing.T) {
			if err := tool.ConfigureSkills(runtime); err != nil {
				t.Fatalf("ConfigureSkills() failed: %v", err)
			}

			for _, rel := range providerSkillsDirs[runtime] {
				link := filepath.Join(workDir, rel, "plural-git-repository", skillFileName)
				if _, err := os.Stat(link); err != nil {
					t.Fatalf("expected skill link at %q: %v", link, err)
				}
			}

			for _, rel := range repositorySkillsDirs {
				link := filepath.Join(repoDir, rel, "plural-git-repository", skillFileName)
				if _, err := os.Stat(link); err != nil {
					t.Fatalf("expected repository skill link at %q: %v", link, err)
				}
			}
		})
	}
}

func TestConfigureSkills_IgnoresNonSkillEntries(t *testing.T) {
	workDir := t.TempDir()
	skillsRoot := filepath.Join(workDir, bundledSkillsDir)
	if err := os.MkdirAll(skillsRoot, 0755); err != nil {
		t.Fatalf("mkdir skills root: %v", err)
	}
	if err := os.WriteFile(filepath.Join(skillsRoot, "README.md"), []byte("# index"), 0644); err != nil {
		t.Fatalf("write README: %v", err)
	}

	tool := DefaultTool{Config: Config{WorkDir: workDir, RepositoryDir: workDir}}
	if err := tool.ConfigureSkills(console.AgentRuntimeTypeClaude); err != nil {
		t.Fatalf("ConfigureSkills() failed: %v", err)
	}

	claudeSkills := filepath.Join(workDir, ".claude", "skills")
	if entries, err := os.ReadDir(claudeSkills); err == nil && len(entries) > 0 {
		t.Fatalf("expected no skill links, found %d", len(entries))
	}
}
