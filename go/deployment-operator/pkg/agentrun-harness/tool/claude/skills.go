package claude

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/deployment-operator/pkg/harness/exec"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
)

const bundledSkillsDir = "skills"

func (in *Claude) ensureBundledSkills() error {
	src := filepath.Join(in.Config.WorkDir, bundledSkillsDir)
	dst := filepath.Join(in.configPath(), "skills")

	if _, err := os.Stat(src); err != nil {
		return fmt.Errorf("bundled skills source %q is missing: %w", src, err)
	}

	script := fmt.Sprintf(
		`mkdir -p %q && for skill in %q/*/; do name="$(basename "$skill")"; [ -f "$skill/SKILL.md" ] || continue; rm -rf %q/"$name"; cp -a "$skill" %q/"$name"; done`,
		dst, src, dst, dst,
	)
	if err := exec.NewExecutable("sh", exec.WithArgs([]string{"-c", script})).Run(context.Background()); err != nil {
		return fmt.Errorf("failed to install bundled skills into %q: %w", dst, err)
	}

	klog.V(log.LogLevelExtended).InfoS("claude bundled skills installed", "src", src, "dst", dst)
	return nil
}
