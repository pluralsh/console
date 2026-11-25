//go:build !linux

package juicefs

import "errors"

var errUnsupported = errors.New("mounting JuiceFS volumes is only supported on linux")

func unmount(string) error { return errUnsupported }

func detach(string) error { return errUnsupported }
