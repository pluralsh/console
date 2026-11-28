//go:build !linux

package block

import "errors"

// BindMounter mounts with the mount system call, which only Linux has.
type BindMounter struct{}

var errNoBindMounts = errors.New("bind mounts need Linux")

func (BindMounter) Bind(string, string, bool) error { return errNoBindMounts }
func (BindMounter) Unmount(string) error            { return errNoBindMounts }
func (BindMounter) IsMounted(string) (bool, error)  { return false, errNoBindMounts }
func (BindMounter) Sync(string) error               { return errNoBindMounts }
