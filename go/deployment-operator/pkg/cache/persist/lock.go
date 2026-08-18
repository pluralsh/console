package persist

import (
	"os"
	"path/filepath"

	"golang.org/x/sys/unix"
)

func tryExclusiveLock(dir string) (*os.File, error) {
	f, err := os.OpenFile(filepath.Join(dir, lockFileName), os.O_CREATE|os.O_RDWR, 0o600)
	if err != nil {
		return nil, err
	}

	if err := unix.Flock(int(f.Fd()), unix.LOCK_EX|unix.LOCK_NB); err != nil {
		_ = f.Close()
		return nil, err
	}

	return f, nil
}

func releaseLock(f *os.File) error {
	if f == nil {
		return nil
	}

	_ = unix.Flock(int(f.Fd()), unix.LOCK_UN)
	return f.Close()
}
