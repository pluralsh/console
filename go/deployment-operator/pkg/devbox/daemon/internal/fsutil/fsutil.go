// Package fsutil holds small filesystem helpers shared by the daemon's packages.
package fsutil

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
)

// WriteFileAtomic writes data to a temporary file next to path and renames it into place. It doesn't fsync: on
// the home's ext4, auto_da_alloc commits the data with the rename, and every fsync there is a ZeroFS flush that
// freezes a new L0 SST, so per-write syncs from frequently saved state outpace compaction.
func WriteFileAtomic(path string, data []byte, perm os.FileMode) error {
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}
	tmp, err := os.CreateTemp(dir, "."+filepath.Base(path)+".tmp-*")
	if err != nil {
		return err
	}
	name := tmp.Name()
	defer func() { _ = os.Remove(name) }()
	if _, err := tmp.Write(data); err != nil {
		_ = tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	if err := os.Chmod(name, perm); err != nil {
		return err
	}
	return os.Rename(name, path)
}

// WriteJSON atomically writes v as indented JSON.
func WriteJSON(path string, v any, perm os.FileMode) error {
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return err
	}
	return WriteFileAtomic(path, append(data, '\n'), perm)
}

// ReadJSON reads path into v. It returns false when the file does not exist.
func ReadJSON(path string, v any) (bool, error) {
	data, err := os.ReadFile(path)
	if errors.Is(err, fs.ErrNotExist) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	if err := json.Unmarshal(data, v); err != nil {
		return true, fmt.Errorf("decode %s: %w", path, err)
	}
	return true, nil
}

// Within reports whether path is root or below it. Both must be clean absolute paths.
func Within(root, path string) bool {
	if path == root {
		return true
	}
	return strings.HasPrefix(path, strings.TrimSuffix(root, string(filepath.Separator))+string(filepath.Separator))
}

// ResolveWithin resolves p (absolute, or relative to root; a leading "~" means root) and rejects results that
// escape root, following symlinks on the longest existing prefix.
func ResolveWithin(root, p string) (string, error) {
	root = filepath.Clean(root)
	switch {
	case p == "" || p == "~":
		p = root
	case strings.HasPrefix(p, "~/"):
		p = filepath.Join(root, p[2:])
	case !filepath.IsAbs(p):
		p = filepath.Join(root, p)
	}
	p = filepath.Clean(p)
	if !Within(root, p) {
		return "", fmt.Errorf("path %q is outside %s", p, root)
	}
	realRoot, err := filepath.EvalSymlinks(root)
	if err != nil {
		return "", err
	}
	// Walk up to the deepest existing ancestor and check where it really points.
	existing := p
	var rest []string
	for {
		if _, err := os.Lstat(existing); err == nil {
			break
		}
		parent := filepath.Dir(existing)
		if parent == existing {
			break
		}
		rest = append([]string{filepath.Base(existing)}, rest...)
		existing = parent
	}
	real, err := filepath.EvalSymlinks(existing)
	if err != nil {
		return "", err
	}
	real = filepath.Join(append([]string{real}, rest...)...)
	if !Within(realRoot, real) {
		return "", fmt.Errorf("path %q resolves outside %s", p, root)
	}
	return p, nil
}

// CopyTreeNoClobber copies src into dst, creating directories and files that don't exist yet and leaving existing
// ones untouched. Symlinks are recreated as symlinks.
func CopyTreeNoClobber(src, dst string) (int, error) {
	copied := 0
	err := filepath.WalkDir(src, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		target := filepath.Join(dst, rel)
		info, err := os.Lstat(path)
		if err != nil {
			return err
		}
		if d.IsDir() {
			return os.MkdirAll(target, info.Mode().Perm()|0o700)
		}
		if _, err := os.Lstat(target); err == nil {
			return nil
		}
		if info.Mode()&os.ModeSymlink != 0 {
			link, err := os.Readlink(path)
			if err != nil {
				return err
			}
			copied++
			return os.Symlink(link, target)
		}
		if !info.Mode().IsRegular() {
			return nil
		}
		in, err := os.Open(path)
		if err != nil {
			return err
		}
		defer in.Close()
		out, err := os.OpenFile(target, os.O_WRONLY|os.O_CREATE|os.O_EXCL, info.Mode().Perm())
		if err != nil {
			return err
		}
		if _, err := io.Copy(out, in); err != nil {
			_ = out.Close()
			return err
		}
		copied++
		return out.Close()
	})
	return copied, err
}

// RemoveIfExists removes path (recursively) and ignores a missing path. It returns whether something was removed.
func RemoveIfExists(path string) (bool, error) {
	if _, err := os.Lstat(path); errors.Is(err, fs.ErrNotExist) {
		return false, nil
	}
	if err := os.RemoveAll(path); err != nil {
		return false, err
	}
	return true, nil
}
