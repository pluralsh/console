package artifacts

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
)

// StageSessionDirectory copies a provider-native session directory into a
// disposable artifact staging directory. It preserves directories, symlinks,
// and regular-file permissions, while ignoring special files such as FIFOs.
func StageSessionDirectory(ctx context.Context, source, destination string) (bool, error) {
	info, err := os.Stat(source)
	if os.IsNotExist(err) {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("stat session directory %q: %w", source, err)
	}
	if !info.IsDir() {
		return false, fmt.Errorf("session directory %q is not a directory", source)
	}

	if err := os.MkdirAll(destination, 0755); err != nil {
		return false, fmt.Errorf("create session staging directory %q: %w", destination, err)
	}

	err = filepath.WalkDir(source, func(path string, entry os.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if ctx != nil {
			if err := ctx.Err(); err != nil {
				return err
			}
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
			return stageSessionSymlink(path, target)
		}

		entryInfo, err := entry.Info()
		if err != nil {
			return err
		}
		if !entryInfo.Mode().IsRegular() {
			return nil
		}

		return stageSessionFile(path, target, entryInfo.Mode().Perm())
	})
	if err != nil {
		return false, fmt.Errorf("stage session directory %q: %w", source, err)
	}

	return true, nil
}

func stageSessionSymlink(source, destination string) error {
	link, err := os.Readlink(source)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(destination), 0755); err != nil {
		return err
	}
	return os.Symlink(link, destination)
}

func stageSessionFile(source, destination string, mode os.FileMode) error {
	if err := os.MkdirAll(filepath.Dir(destination), 0755); err != nil {
		return err
	}

	input, err := os.Open(source)
	if err != nil {
		return err
	}
	defer input.Close()

	output, err := os.OpenFile(destination, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, mode)
	if err != nil {
		return err
	}
	defer func() { _ = output.Close() }()

	if _, err := io.Copy(output, input); err != nil {
		return err
	}
	if err := output.Chmod(mode); err != nil {
		return err
	}
	return output.Close()
}
