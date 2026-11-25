//go:build linux

package juicefs

import (
	"errors"
	"syscall"
)

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
