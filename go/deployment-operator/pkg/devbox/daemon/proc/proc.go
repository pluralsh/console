// Package proc runs and supervises the daemon's child processes and, when the daemon is PID 1, reaps orphaned
// zombies without racing exec.Cmd.Wait for the children the daemon started itself.
//
// Every child the daemon starts must go through Start (or Run/Output), which registers its PID while holding
// the reaper's lock. The reaper only collects zombies whose PIDs aren't registered, so os/exec keeps receiving
// the exit status of its own children.
package proc

import (
	"bytes"
	"context"
	"fmt"
	"os/exec"
	"sync"
	"syscall"
)

var (
	// startMu is held for reading while a child starts and registers, and for writing while the reaper scans,
	// so the reaper never sees a just-started, not-yet-registered child.
	startMu sync.RWMutex
	trackMu sync.Mutex
	tracked = map[int]struct{}{}
)

// Start starts cmd (through start when non-nil, e.g. pty.StartWithSize) and registers its PID with the reaper.
// Callers must call Wait, not cmd.Wait.
func Start(cmd *exec.Cmd, start func() error) error {
	startMu.RLock()
	defer startMu.RUnlock()
	if start == nil {
		start = cmd.Start
	}
	if err := start(); err != nil {
		return err
	}
	trackMu.Lock()
	tracked[cmd.Process.Pid] = struct{}{}
	trackMu.Unlock()
	return nil
}

// Wait waits for a child started with Start and unregisters it.
func Wait(cmd *exec.Cmd) error {
	err := cmd.Wait()
	if cmd.Process != nil {
		trackMu.Lock()
		delete(tracked, cmd.Process.Pid)
		trackMu.Unlock()
	}
	return err
}

// Run is cmd.Run through Start and Wait.
func Run(cmd *exec.Cmd) error {
	if err := Start(cmd, nil); err != nil {
		return err
	}
	return Wait(cmd)
}

// Output is cmd.Output through Start and Wait. Stderr is included in the error.
func Output(cmd *exec.Cmd) ([]byte, error) {
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	if cmd.Stderr == nil {
		cmd.Stderr = &stderr
	}
	err := Run(cmd)
	if err != nil && stderr.Len() > 0 {
		err = fmt.Errorf("%w: %s", err, bytes.TrimSpace(stderr.Bytes()))
	}
	return stdout.Bytes(), err
}

// CommandContext is exec.CommandContext with the child in its own process group, so signals reach the whole
// job and the daemon's terminal signals don't.
func CommandContext(ctx context.Context, name string, args ...string) *exec.Cmd {
	cmd := exec.CommandContext(ctx, name, args...)
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	cmd.Cancel = func() error {
		if cmd.Process == nil {
			return nil
		}
		return syscall.Kill(-cmd.Process.Pid, syscall.SIGKILL)
	}
	return cmd
}

func isTracked(pid int) bool {
	trackMu.Lock()
	defer trackMu.Unlock()
	_, ok := tracked[pid]
	return ok
}
