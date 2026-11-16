//go:build linux

package proc

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"
)

// Reap collects orphaned zombies until ctx ends. It reacts to SIGCHLD and also sweeps periodically, because
// SIGCHLD coalesces.
func Reap(ctx context.Context, log *slog.Logger) {
	sigs := make(chan os.Signal, 16)
	signal.Notify(sigs, syscall.SIGCHLD)
	defer signal.Stop(sigs)
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-sigs:
		case <-ticker.C:
		}
		if n := reapOnce(); n > 0 {
			log.Debug("reaped orphaned processes", "count", n)
		}
	}
}

func reapOnce() int {
	startMu.Lock()
	defer startMu.Unlock()
	self := os.Getpid()
	entries, err := os.ReadDir("/proc")
	if err != nil {
		return 0
	}
	reaped := 0
	for _, e := range entries {
		pid, err := strconv.Atoi(e.Name())
		if err != nil || isTracked(pid) {
			continue
		}
		state, ppid, ok := statOf(pid)
		if !ok || ppid != self || state != 'Z' {
			continue
		}
		var ws syscall.WaitStatus
		if got, _ := syscall.Wait4(pid, &ws, syscall.WNOHANG, nil); got == pid {
			reaped++
		}
	}
	return reaped
}

// statOf parses state and ppid from /proc/<pid>/stat. The comm field may contain spaces and parentheses, so
// parsing starts after the last ')'.
func statOf(pid int) (byte, int, bool) {
	data, err := os.ReadFile("/proc/" + strconv.Itoa(pid) + "/stat")
	if err != nil {
		return 0, 0, false
	}
	s := string(data)
	i := strings.LastIndexByte(s, ')')
	if i < 0 || i+2 >= len(s) {
		return 0, 0, false
	}
	fields := strings.Fields(s[i+2:])
	if len(fields) < 2 {
		return 0, 0, false
	}
	ppid, err := strconv.Atoi(fields[1])
	if err != nil {
		return 0, 0, false
	}
	return fields[0][0], ppid, true
}
