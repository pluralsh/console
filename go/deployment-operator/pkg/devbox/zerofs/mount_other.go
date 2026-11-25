//go:build !linux

package zerofs

import "errors"

var errUnsupported = errors.New("serving ZeroFS volumes is only supported on linux")

func mountExt4(string, string, string) error { return errUnsupported }

func bindMount(string, string, bool) error { return errUnsupported }

func unmount(string) error { return errUnsupported }

func detach(string) error { return errUnsupported }
