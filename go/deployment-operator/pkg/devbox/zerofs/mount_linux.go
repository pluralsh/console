//go:build linux

package zerofs

import (
	"errors"
	"os"
	"syscall"
)

func mountExt4(dev, target, options string) error {
	return syscall.Mount(dev, target, "ext4", syscall.MS_NOATIME, options)
}

func bindMount(source, target string, readOnly bool) error {
	if err := os.MkdirAll(target, 0o750); err != nil {
		return err
	}
	if err := syscall.Mount(source, target, "", syscall.MS_BIND, ""); err != nil {
		return err
	}
	if !readOnly {
		return nil
	}
	if err := syscall.Mount("", target, "", syscall.MS_BIND|syscall.MS_REMOUNT|syscall.MS_RDONLY, ""); err != nil {
		return errors.Join(err, detach(target))
	}
	return nil
}

// unmount falls back to a lazy unmount when something still holds the mount, so a stuck reader can't keep a
// volume attached to a node it has left.
func unmount(target string) error {
	err := syscall.Unmount(target, 0)
	if errors.Is(err, syscall.EBUSY) {
		err = syscall.Unmount(target, syscall.MNT_DETACH)
	}
	if errors.Is(err, syscall.EINVAL) || errors.Is(err, syscall.ENOENT) {
		return nil
	}
	return err
}

func detach(target string) error {
	err := syscall.Unmount(target, syscall.MNT_DETACH)
	if errors.Is(err, syscall.EINVAL) || errors.Is(err, syscall.ENOENT) {
		return nil
	}
	return err
}
