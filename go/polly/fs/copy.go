package fs

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// CopyDir recursively copies src to dst, preserving permissions and symlinks.
// dst must not already exist. Special files such as sockets and devices are skipped.
func CopyDir(src, dst string) error {
	src = filepath.Clean(src)
	dst = filepath.Clean(dst)

	info, err := os.Lstat(src)
	if err != nil {
		return fmt.Errorf("copy: stat source: %w", err)
	}
	if !info.IsDir() {
		return fmt.Errorf("copy: source is not a directory: %s", src)
	}
	if _, err := os.Lstat(dst); err == nil {
		return fmt.Errorf("copy: destination already exists: %s", dst)
	} else if !os.IsNotExist(err) {
		return err
	}

	return filepath.WalkDir(src, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}

		rel, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		if rel == ".." || strings.HasPrefix(rel, ".."+string(os.PathSeparator)) {
			return fmt.Errorf("copy: path %q escapes source", path)
		}

		target := filepath.Join(dst, rel)
		switch {
		case d.Type()&os.ModeSymlink != 0:
			link, err := os.Readlink(path)
			if err != nil {
				return err
			}
			if err := os.MkdirAll(filepath.Dir(target), 0755); err != nil {
				return err
			}
			return os.Symlink(link, target)
		case d.IsDir():
			dirInfo, err := d.Info()
			if err != nil {
				return err
			}
			return os.MkdirAll(target, dirInfo.Mode().Perm())
		case d.Type().IsRegular():
			fileInfo, err := d.Info()
			if err != nil {
				return err
			}
			return copyFile(path, target, fileInfo.Mode())
		default:
			return nil
		}
	})
}

func copyFile(src, dst string, mode os.FileMode) error {
	if err := os.MkdirAll(filepath.Dir(dst), 0755); err != nil {
		return err
	}

	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.OpenFile(dst, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, mode)
	if err != nil {
		return err
	}
	defer out.Close()

	if _, err := io.Copy(out, in); err != nil {
		return err
	}
	return out.Chmod(mode)
}
