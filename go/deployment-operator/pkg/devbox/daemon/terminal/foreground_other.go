//go:build !linux

package terminal

// foregroundCommand reports a foreground job other than the shell. Off Linux the command line isn't read.
func (t *Terminal) foregroundCommand() string {
	if t.ptmx == nil || t.cmd.Process == nil {
		return ""
	}
	pgrp := foregroundPgrp(t)
	if pgrp <= 0 || pgrp == t.cmd.Process.Pid {
		return ""
	}
	return "job"
}
