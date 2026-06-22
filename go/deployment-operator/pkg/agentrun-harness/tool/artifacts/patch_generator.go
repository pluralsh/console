package artifacts

import (
	"errors"
	"fmt"
	"os"
	stdexec "os/exec"
	"strings"

	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/environment"
)

type GitPatchGenerator struct {
	RepositoryDir string
	BaseCommit    string
}

func NewGitPatchGenerator(repositoryDir string) *GitPatchGenerator {
	generator := &GitPatchGenerator{RepositoryDir: repositoryDir}
	generator.BaseCommit = generator.baseCommitFromEnvironment()
	return generator
}

func (in *GitPatchGenerator) Write(path string) (bool, error) {
	if in.RepositoryDir == "" {
		return false, fmt.Errorf("repository directory is not set")
	}

	patch, err := in.BuildPatch()
	if err != nil {
		return false, err
	}
	if patch == "" {
		return false, nil
	}

	return true, os.WriteFile(path, []byte(patch), 0644)
}

func (in *GitPatchGenerator) BuildPatch() (string, error) {
	var builder strings.Builder

	tracked, err := in.trackedDiff()
	if err != nil {
		return "", err
	}
	builder.Write(tracked)

	untracked, err := in.untrackedDiff()
	if err != nil {
		return "", err
	}
	builder.Write(untracked)

	return builder.String(), nil
}

func (in *GitPatchGenerator) trackedDiff() ([]byte, error) {
	out, err := in.trackedDiffFromBase()
	if err == nil {
		return out, nil
	}

	hasChanges, statusErr := in.hasChanges()
	if statusErr == nil && !hasChanges {
		return nil, nil
	}

	return nil, err
}

func (in *GitPatchGenerator) trackedDiffFromBase() ([]byte, error) {
	if in.BaseCommit != "" {
		out, err := in.output("diff", "--binary", in.BaseCommit, "--")
		if err == nil {
			return out, nil
		}
	}

	hasHead, err := in.hasRevision("HEAD")
	if err != nil {
		return nil, fmt.Errorf("git check HEAD revision: %w", err)
	}
	if !hasHead {
		return nil, nil
	}

	out, err := in.output("diff", "--binary", "HEAD", "--")
	if err != nil {
		return nil, fmt.Errorf("git diff tracked changes: %w", err)
	}
	return out, nil
}

func (in *GitPatchGenerator) untrackedDiff() ([]byte, error) {
	files, err := in.untrackedFiles()
	if err != nil {
		return nil, err
	}

	var builder strings.Builder
	for _, file := range files {
		out, err := in.diffNoIndex("/dev/null", file)
		if err != nil {
			return nil, fmt.Errorf("git diff untracked file %q: %w", file, err)
		}
		builder.Write(out)
	}

	return []byte(builder.String()), nil
}

func (in *GitPatchGenerator) untrackedFiles() ([]string, error) {
	out, err := in.output("ls-files", "--others", "--exclude-standard", "-z")
	if err != nil {
		return nil, fmt.Errorf("git list untracked files: %w", err)
	}

	var files []string
	for _, file := range strings.Split(string(out), "\x00") {
		if file != "" {
			files = append(files, file)
		}
	}
	return files, nil
}

func (in *GitPatchGenerator) hasChanges() (bool, error) {
	out, err := in.output("status", "--porcelain", "-z", "--untracked-files=normal")
	if err != nil {
		return false, fmt.Errorf("git status changes: %w", err)
	}
	return len(out) > 0, nil
}

func (in *GitPatchGenerator) hasRevision(revision string) (bool, error) {
	cmd := in.command("rev-parse", "--verify", revision+"^{commit}")
	if err := cmd.Run(); err != nil {
		if _, ok := errors.AsType[*stdexec.ExitError](err); ok {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

func (in *GitPatchGenerator) diffNoIndex(oldPath, newPath string) ([]byte, error) {
	cmd := in.command("diff", "--no-index", "--binary", "--", oldPath, newPath)
	out, err := cmd.Output()
	if err == nil {
		return out, nil
	}
	if exitErr, ok := errors.AsType[*stdexec.ExitError](err); ok && exitErr.ExitCode() == 1 {
		return out, nil
	}
	return nil, err
}

func (in *GitPatchGenerator) output(args ...string) ([]byte, error) {
	return in.command(args...).Output()
}

func (in *GitPatchGenerator) command(args ...string) *stdexec.Cmd {
	return stdexec.Command("git", append([]string{"-C", in.RepositoryDir}, args...)...)
}

func (in *GitPatchGenerator) baseCommitFromEnvironment() string {
	config, err := environment.Load()
	if err != nil {
		return ""
	}
	return strings.TrimSpace(config.BaseCommit)
}
