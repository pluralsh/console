package codex

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
)

// Export preserves Codex's provider-owned session subtree under this relative
// path so resumed runs retain their native session files.
const codexSessionsDir = "sessions"

func (agent *Agent) copySessionDirectory(ctx context.Context, source, destination string) error {
	info, err := os.Stat(source)
	if os.IsNotExist(err) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("stat codex sessions: %w", err)
	}
	if !info.IsDir() {
		return fmt.Errorf("codex sessions path %q is not a directory", source)
	}

	if err := os.MkdirAll(destination, 0755); err != nil {
		return fmt.Errorf("create codex session export: %w", err)
	}

	return filepath.WalkDir(source, func(path string, entry os.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}

		if err := agent.contextError(ctx); err != nil {
			return err
		}

		rel, err := filepath.Rel(source, path)
		if err != nil {
			return err
		}
		target := filepath.Join(destination, rel)

		if entry.IsDir() {
			return os.MkdirAll(target, 0755)
		}
		if entry.Type()&os.ModeSymlink != 0 {
			link, err := os.Readlink(path)
			if err != nil {
				return err
			}
			return os.Symlink(link, target)
		}
		info, err := entry.Info()
		if err != nil {
			return err
		}
		if !info.Mode().IsRegular() {
			return nil
		}
		return agent.copySessionFile(path, target)
	})
}

func (agent *Agent) copySessionFile(source, destination string) error {
	if err := os.MkdirAll(filepath.Dir(destination), 0755); err != nil {
		return err
	}

	input, err := os.Open(source)
	if err != nil {
		return err
	}
	defer input.Close()

	info, err := input.Stat()
	if err != nil {
		return err
	}

	output, err := os.OpenFile(destination, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, info.Mode().Perm())
	if err != nil {
		return err
	}
	defer output.Close()
	if _, err := io.Copy(output, input); err != nil {
		return err
	}
	return nil
}
