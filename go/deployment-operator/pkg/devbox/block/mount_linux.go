package block

import (
	"bufio"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"golang.org/x/sys/unix"
)

// BindMounter mounts with the mount system call.
type BindMounter struct{}

func (BindMounter) Bind(source, target string, readonly bool) error {
	if err := unix.Mount(source, target, "", unix.MS_BIND, ""); err != nil {
		return fmt.Errorf("bind-mounting %s at %s: %w", source, target, err)
	}
	if !readonly {
		return nil
	}
	if err := unix.Mount("", target, "", unix.MS_BIND|unix.MS_REMOUNT|unix.MS_RDONLY, ""); err != nil {
		_ = unix.Unmount(target, 0)
		return fmt.Errorf("remounting %s read-only: %w", target, err)
	}
	return nil
}

func (m BindMounter) Unmount(target string) error {
	mounted, err := m.IsMounted(target)
	if err != nil || !mounted {
		return err
	}
	if err := unix.Unmount(target, 0); err != nil && !errors.Is(err, unix.EINVAL) && !errors.Is(err, unix.ENOENT) {
		return fmt.Errorf("unmounting %s: %w", target, err)
	}
	return nil
}

func (BindMounter) Sync(path string) error {
	fd, err := unix.Open(path, unix.O_RDONLY|unix.O_DIRECTORY|unix.O_CLOEXEC, 0)
	if err != nil {
		return fmt.Errorf("opening %s: %w", path, err)
	}
	defer unix.Close(fd)
	if err := unix.Syncfs(fd); err != nil {
		return fmt.Errorf("syncing the filesystem of %s: %w", path, err)
	}
	return nil
}

// IsMounted reports whether path is a mount point, by /proc/self/mountinfo.
func (BindMounter) IsMounted(path string) (bool, error) {
	path = filepath.Clean(path)
	f, err := os.Open("/proc/self/mountinfo")
	if err != nil {
		return false, err
	}
	defer f.Close()
	s := bufio.NewScanner(f)
	s.Buffer(make([]byte, 0, 64*1024), 1024*1024)
	for s.Scan() {
		fields := strings.Fields(s.Text())
		if len(fields) > 4 && unescapeMountPath(fields[4]) == path {
			return true, nil
		}
	}
	return false, s.Err()
}

// unescapeMountPath undoes mountinfo's octal escapes of spaces, tabs, newlines and backslashes.
func unescapeMountPath(p string) string {
	if !strings.Contains(p, `\`) {
		return p
	}
	var b strings.Builder
	for i := 0; i < len(p); i++ {
		if p[i] == '\\' && i+4 <= len(p) {
			if n, err := strconv.ParseUint(p[i+1:i+4], 8, 8); err == nil {
				b.WriteByte(byte(n))
				i += 3
				continue
			}
		}
		b.WriteByte(p[i])
	}
	return b.String()
}
