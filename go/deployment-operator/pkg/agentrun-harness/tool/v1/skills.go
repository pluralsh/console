package v1

import (
	"fmt"
	"os"
	"path"
	"path/filepath"

	console "github.com/pluralsh/console/go/client"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
)

const (
	bundledSkillsDir = "skills"
	skillFileName    = "SKILL.md"
)

var providerSkillsDirs = map[console.AgentRuntimeType][]string{
	console.AgentRuntimeTypeClaude:   {".claude/skills"},
	console.AgentRuntimeTypeCodex:    {".codex/skills"},
	console.AgentRuntimeTypeGemini:   {".gemini/skills"},
	console.AgentRuntimeTypeOpencode: {".opencode/skills"},
}

// repositorySkillsDirs are paths scanned from the cloned repository working directory.
var repositorySkillsDirs = []string{
	".claude/skills",
	".agents/skills",
	".opencode/skills",
}

// ConfigureSkills symlinks bundled skill directories into each provider's skills discovery path.
func (in DefaultTool) ConfigureSkills(runtime console.AgentRuntimeType) error {
	dirs, ok := providerSkillsDirs[runtime]
	if !ok {
		return fmt.Errorf("unsupported agent runtime %q for skills configuration", runtime)
	}

	skillsRoot := path.Join(in.Config.WorkDir, bundledSkillsDir)
	entries, err := os.ReadDir(skillsRoot)
	if err != nil {
		return fmt.Errorf("read bundled skills dir %q: %w", skillsRoot, err)
	}

	linked := 0
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		src := path.Join(skillsRoot, entry.Name())
		if _, err := os.Stat(path.Join(src, skillFileName)); err != nil {
			continue
		}

		for _, rel := range dirs {
			dst := path.Join(in.Config.WorkDir, rel, entry.Name())
			if err := linkSkillDir(dst, src); err != nil {
				return fmt.Errorf("link skill %q for %s: %w", entry.Name(), runtime, err)
			}
		}

		if err := in.linkRepositorySkills(entry.Name(), src); err != nil {
			return err
		}

		linked++
	}

	klog.V(log.LogLevelExtended).InfoS(
		"skills configured",
		"runtime", runtime,
		"count", linked,
		"workDir", in.Config.WorkDir,
		"repositoryDir", in.Config.RepositoryDir,
	)
	return nil
}

func (in DefaultTool) linkRepositorySkills(name, src string) error {
	if in.Config.RepositoryDir == "" || in.Config.RepositoryDir == in.Config.WorkDir {
		return nil
	}

	for _, rel := range repositorySkillsDirs {
		dst := path.Join(in.Config.RepositoryDir, rel, name)
		if err := linkSkillDir(dst, src); err != nil {
			return fmt.Errorf("link repository skill %q at %q: %w", name, dst, err)
		}
	}
	return nil
}

func linkSkillDir(dst, src string) error {
	if err := os.MkdirAll(path.Dir(dst), 0755); err != nil {
		return fmt.Errorf("create skills parent dir: %w", err)
	}

	_ = os.Remove(dst)

	srcAbs, err := filepath.Abs(src)
	if err != nil {
		return fmt.Errorf("resolve skill source %q: %w", src, err)
	}

	if err := os.Symlink(srcAbs, dst); err != nil {
		return fmt.Errorf("symlink %q -> %q: %w", dst, srcAbs, err)
	}
	return nil
}
