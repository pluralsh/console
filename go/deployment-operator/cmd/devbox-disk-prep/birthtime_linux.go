package main

import (
	"time"

	"golang.org/x/sys/unix"
)

func fsBirthTime(path string) (time.Time, error) {
	var stx unix.Statx_t
	if err := unix.Statx(unix.AT_FDCWD, path, 0, unix.STATX_BTIME, &stx); err != nil {
		return time.Time{}, err
	}
	if stx.Mask&unix.STATX_BTIME == 0 {
		return time.Time{}, unix.ENOTSUP
	}
	return time.Unix(stx.Btime.Sec, int64(stx.Btime.Nsec)), nil
}
