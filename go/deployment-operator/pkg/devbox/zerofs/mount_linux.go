//go:build linux

package zerofs

import (
	"errors"
	"math"
	"os"
	"strconv"
	"syscall"
	"unsafe"

	"golang.org/x/sys/unix"
)

func mountExt4(dev, target, options string) error {
	return syscall.Mount(dev, target, "ext4", syscall.MS_NOATIME, options)
}

// fitrim is FITRIM, _IOWR('X', 121, struct fstrim_range), which x/sys/unix doesn't define.
const fitrim = 0xc0185879

type fstrimRange struct{ start, len, minlen uint64 }

func setOOMScoreAdj(pid, adj int) error {
	return os.WriteFile("/proc/"+strconv.Itoa(pid)+"/oom_score_adj", []byte(strconv.Itoa(adj)), 0)
}

// trim discards every free block of the filesystem mounted at target (fstrim), so the writer drops what it
// stores for them.
func trim(target string) error {
	fd, err := unix.Open(target, unix.O_RDONLY|unix.O_DIRECTORY|unix.O_CLOEXEC, 0)
	if err != nil {
		return err
	}
	defer unix.Close(fd)
	r := fstrimRange{len: math.MaxUint64}
	if _, _, errno := unix.Syscall(unix.SYS_IOCTL, uintptr(fd), fitrim, uintptr(unsafe.Pointer(&r))); errno != 0 {
		return errno
	}
	return nil
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

// unmount never falls back to a lazy unmount: the filesystem would live on after the device under it is
// disconnected and its writer stopped, losing whatever it still writes. A busy mount fails, for a retry.
func unmount(target string) error {
	err := syscall.Unmount(target, 0)
	if errors.Is(err, syscall.EINVAL) || errors.Is(err, syscall.ENOENT) {
		return nil
	}
	return err
}

// deviceBusy reports whether a mounted filesystem holds a block device, which an exclusive open refuses.
func deviceBusy(dev string) (bool, error) {
	fd, err := syscall.Open(dev, syscall.O_RDONLY|syscall.O_EXCL|syscall.O_CLOEXEC, 0)
	switch {
	case errors.Is(err, syscall.EBUSY):
		return true, nil
	case errors.Is(err, syscall.ENOENT) || errors.Is(err, syscall.ENXIO):
		return false, nil
	case err != nil:
		return false, err
	}
	return false, syscall.Close(fd)
}

func detach(target string) error {
	err := syscall.Unmount(target, syscall.MNT_DETACH)
	if errors.Is(err, syscall.EINVAL) || errors.Is(err, syscall.ENOENT) {
		return nil
	}
	return err
}
