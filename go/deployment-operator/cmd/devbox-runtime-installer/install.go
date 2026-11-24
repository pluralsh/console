package main

import (
	"bytes"
	"crypto/sha256"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
)

const (
	// readyMarker holds the digest of the runtime the devbox container may exec.
	readyMarker = "ready"
	tmpSuffix   = ".tmp"
)

// result describes what install did, for the log line.
type result struct {
	// Action is "installed" or "kept".
	Action  string
	Dir     string
	Bytes   int64
	Removed []string
}

// installDirName is the directory a runtime digest installs into ("sha256:abc" becomes "sha256-abc"). The
// operator's wait-and-exec command uses the same name.
func installDirName(digest string) string {
	return strings.ReplaceAll(digest, ":", "-")
}

// install makes <dst>/<digest dir> hold the payload and <dst>/ready name the digest.
//
// An installed runtime is immutable: when every payload file is already there with the same content and mode it
// is left alone, because the devbox container starts first and may already be running it under a marker that is
// still valid. Anything else is replaced, and the marker is withdrawn first so the devbox container can't exec
// a runtime that is missing or half written. Other versions are pruned afterwards.
func install(src, dst, digest string) (result, error) {
	if digest == "" || strings.ContainsAny(digest, "/\\ \t\n") || strings.HasPrefix(digest, ".") {
		return result{}, fmt.Errorf("invalid runtime digest %q", digest)
	}
	name := installDirName(digest)
	final := filepath.Join(dst, name)
	marker := filepath.Join(dst, readyMarker)
	res := result{Action: "kept", Dir: final}

	// The home volume is the sandbox user's, who can replace the install root with a link to somewhere else in
	// this container's filesystem. Nothing is installed through one.
	if info, err := os.Lstat(dst); err == nil && !info.IsDir() {
		if err := os.Remove(dst); err != nil {
			return res, fmt.Errorf("removing %s, which is not a directory: %w", dst, err)
		}
	}
	if err := os.MkdirAll(dst, 0o755); err != nil {
		return res, fmt.Errorf("creating %s: %w", dst, err)
	}
	same, err := treesEqual(src, final)
	if err != nil {
		return res, fmt.Errorf("reading the runtime payload: %w", err)
	}
	if !same {
		res.Action = "installed"
		if err := os.Remove(marker); err != nil && !errors.Is(err, fs.ErrNotExist) {
			return res, fmt.Errorf("withdrawing the ready marker: %w", err)
		}
		tmp := final + tmpSuffix
		if err := os.RemoveAll(tmp); err != nil {
			return res, fmt.Errorf("clearing %s: %w", tmp, err)
		}
		if res.Bytes, err = copyTree(src, tmp); err != nil {
			return res, fmt.Errorf("copying the runtime: %w", err)
		}
		if err := os.RemoveAll(final); err != nil {
			return res, fmt.Errorf("removing the mismatching runtime: %w", err)
		}
		if err := os.Rename(tmp, final); err != nil {
			return res, fmt.Errorf("publishing the runtime: %w", err)
		}
	}

	entries, err := os.ReadDir(dst)
	if err != nil {
		return res, fmt.Errorf("listing %s: %w", dst, err)
	}
	for _, e := range entries {
		if e.Name() == name || e.Name() == readyMarker {
			continue
		}
		if err := os.RemoveAll(filepath.Join(dst, e.Name())); err == nil {
			res.Removed = append(res.Removed, e.Name())
		}
	}

	if cur, _ := os.ReadFile(marker); strings.TrimSpace(string(cur)) != digest {
		// Renamed into place, so the devbox container never reads a partial marker.
		tmp := marker + tmpSuffix
		if err := os.RemoveAll(tmp); err != nil {
			return res, fmt.Errorf("clearing %s: %w", tmp, err)
		}
		if err := os.WriteFile(tmp, []byte(digest+"\n"), 0o644); err != nil {
			return res, fmt.Errorf("writing the ready marker: %w", err)
		}
		if err := os.Rename(tmp, marker); err != nil {
			return res, fmt.Errorf("publishing the ready marker: %w", err)
		}
	}
	return res, nil
}

// copyTree copies the regular files and directories under src to dst, keeping only the executable bit.
func copyTree(src, dst string) (int64, error) {
	var total int64
	err := filepath.WalkDir(src, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		target := filepath.Join(dst, rel)
		if d.IsDir() {
			return os.MkdirAll(target, 0o755)
		}
		if !d.Type().IsRegular() {
			return fmt.Errorf("%s is not a regular file", path)
		}
		info, err := d.Info()
		if err != nil {
			return err
		}
		n, err := copyFile(path, target, fileMode(info))
		total += n
		return err
	})
	return total, err
}

func copyFile(src, dst string, mode os.FileMode) (int64, error) {
	in, err := os.Open(src)
	if err != nil {
		return 0, err
	}
	defer in.Close()
	out, err := os.OpenFile(dst, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, mode)
	if err != nil {
		return 0, err
	}
	n, err := io.Copy(out, in)
	if cerr := out.Close(); err == nil {
		err = cerr
	}
	if err != nil {
		return n, err
	}
	// The umask may have narrowed the mode, and the dev user must be able to read and run the runtime.
	return n, os.Chmod(dst, mode)
}

func fileMode(info fs.FileInfo) os.FileMode {
	if info.Mode()&0o111 != 0 {
		return 0o755
	}
	return 0o644
}

// treesEqual reports whether every file under src is under dst with the same content and mode. A missing or
// unreadable dst file is a mismatch, not an error.
func treesEqual(src, dst string) (bool, error) {
	equal := true
	err := filepath.WalkDir(src, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() || !equal {
			return nil
		}
		rel, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		if !d.Type().IsRegular() {
			return fmt.Errorf("%s is not a regular file", path)
		}
		info, err := d.Info()
		if err != nil {
			return err
		}
		want, err := fileSum(path)
		if err != nil {
			return err
		}
		target := filepath.Join(dst, rel)
		got, gerr := fileSum(target)
		tinfo, serr := os.Lstat(target)
		if gerr != nil || serr != nil || !bytes.Equal(want, got) || !tinfo.Mode().IsRegular() || tinfo.Mode().Perm() != fileMode(info) {
			equal = false
		}
		return nil
	})
	return equal, err
}

func fileSum(path string) ([]byte, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return nil, err
	}
	return h.Sum(nil), nil
}
