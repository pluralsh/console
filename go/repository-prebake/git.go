package prebake

import (
	"bytes"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

func gitClone(cloneURL, dest, branch string, recurse, lfs bool) error {
	if err := os.MkdirAll(filepath.Dir(dest), 0o755); err != nil {
		return err
	}
	args := []string{"clone", "--quiet"}
	if recurse {
		args = append(args, "--recurse-submodules")
	}
	if branch != "" {
		args = append(args, "--branch", branch)
	}
	args = append(args, cloneURL, dest)
	return runGit(nil, args, gitEnv(lfs))
}

func gitSetOrigin(dest, originURL string) error {
	return runGit(nil, []string{"-C", dest, "remote", "set-url", "origin", originURL}, nil)
}

func gitUnsetExtraHeader(dest string) error {
	err := runGit(nil, []string{"-C", dest, "config", "--local", "--unset-all", "http.extraHeader"}, nil)
	if err == nil {
		return nil
	}
	var exitErr *exec.ExitError
	if errors.As(err, &exitErr) && exitErr.ExitCode() == 5 {
		return nil
	}
	return err
}

func gitHeadBranch(dest string) (string, error) {
	out, err := gitOutput(dest, "symbolic-ref", "--short", "HEAD")
	if err == nil {
		return out, nil
	}
	out, err = gitOutput(dest, "rev-parse", "--abbrev-ref", "HEAD")
	if err != nil {
		return "", fmt.Errorf("resolve HEAD branch in %s: %w", dest, err)
	}
	return out, nil
}

func isGitRepo(dir string) bool {
	info, err := os.Stat(filepath.Join(dir, ".git"))
	return err == nil && info != nil
}

func dirExists(path string) (bool, error) {
	info, err := os.Stat(path)
	if err != nil {
		if os.IsNotExist(err) {
			return false, nil
		}
		return false, err
	}
	return info.IsDir(), nil
}

func dirEmpty(path string) (bool, error) {
	entries, err := os.ReadDir(path)
	if err != nil {
		return false, err
	}
	return len(entries) == 0, nil
}

func gitEnv(lfs bool) []string {
	if lfs {
		return nil
	}
	return append(os.Environ(), "GIT_LFS_SKIP_SMUDGE=1")
}

func gitOutput(dir string, args ...string) (string, error) {
	var stdout bytes.Buffer
	cmdArgs := append([]string{"-C", dir}, args...)
	if err := runGit(&stdout, cmdArgs, nil); err != nil {
		return "", err
	}
	return strings.TrimSpace(stdout.String()), nil
}

func runGit(stdout *bytes.Buffer, args []string, env []string) error {
	cmd := exec.Command("git", args...)
	if stdout != nil {
		cmd.Stdout = stdout
	}
	cmd.Stderr = os.Stderr
	if env != nil {
		cmd.Env = env
	}
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("git %s: %w", strings.Join(args, " "), err)
	}
	return nil
}
