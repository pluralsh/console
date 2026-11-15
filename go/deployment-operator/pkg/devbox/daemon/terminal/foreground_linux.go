package terminal

import (
	"fmt"
	"os"
	"strings"
)

// foregroundCommand returns the PTY's foreground process group's command line when it isn't the shell.
func (t *Terminal) foregroundCommand() string {
	if t.ptmx == nil || t.cmd.Process == nil {
		return ""
	}
	pgrp := foregroundPgrp(t)
	if pgrp <= 0 || pgrp == t.cmd.Process.Pid {
		return ""
	}
	raw, err := os.ReadFile(fmt.Sprintf("/proc/%d/cmdline", pgrp))
	if err != nil || len(raw) == 0 {
		return ""
	}
	return strings.TrimSpace(strings.ReplaceAll(string(raw), "\x00", " "))
}
