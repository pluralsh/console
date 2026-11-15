package terminal

import "golang.org/x/sys/unix"

// foregroundPgrp is tcgetpgrp on the PTY master, without switching the file to blocking mode (os.File.Fd would).
func foregroundPgrp(t *Terminal) int {
	rc, err := t.ptmx.SyscallConn()
	if err != nil {
		return 0
	}
	pgrp := 0
	_ = rc.Control(func(fd uintptr) {
		v, err := unix.IoctlGetInt(int(fd), unix.TIOCGPGRP)
		if err == nil {
			pgrp = v
		}
	})
	return pgrp
}
