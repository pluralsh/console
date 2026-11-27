package daemon

import (
	"context"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"time"

	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/proc"
)

const (
	bootScriptCondition = "boot_script_failed"
	bootScriptLog       = "boot.log"
)

// runBootScript runs the user's boot script, ~/.config/devbox/boot.sh, when the daemon of an existing instance
// starts: after the instance was moved to another template revision, restored with filesystem fidelity, or its
// daemon restarted. All of these start from the image's root filesystem with only the home volume kept, so
// this is where a user reinstalls what they had put outside their home. It doesn't run on the golden boot or a
// first start (there is no instance yet), nor on a memory restore (the daemon doesn't start, it continues).
//
// It runs with sh as the dev user like everything else here, in the home directory, with the daemon's base
// environment. The runner's secret env isn't there yet: the gateway delivers it with Initialize, after the
// daemon serves. A failing or slow script never keeps the instance from starting; it raises a condition. The
// condition names the log but doesn't quote it: conditions are visible to everyone who can see the instance,
// and a script's output can hold whatever its author echoed.
func (d *Daemon) runBootScript(ctx context.Context) {
	script := d.cfg.BootScript
	if info, err := os.Stat(script); err != nil || !info.Mode().IsRegular() {
		if err != nil && !errors.Is(err, fs.ErrNotExist) {
			d.log.Warn("boot script", "path", script, "err", err)
		}
		return
	}
	logPath := filepath.Join(d.cfg.StateDir, bootScriptLog)
	out, err := os.OpenFile(logPath, os.O_CREATE|os.O_TRUNC|os.O_RDWR, 0o600)
	if err != nil {
		d.log.Warn("boot script log", "path", logPath, "err", err)
		return
	}
	defer out.Close()

	ctx, cancel := context.WithTimeout(ctx, d.cfg.BootScriptTimeout)
	defer cancel()
	cmd := proc.CommandContext(ctx, "sh", script)
	cmd.Dir = d.cfg.Home
	cmd.Env = d.baseEnv()
	cmd.Stdout, cmd.Stderr = out, out
	// Its children may keep the output open after it was killed.
	cmd.WaitDelay = 5 * time.Second

	start := d.cfg.Clock.Now()
	d.log.Info("running boot script", "path", script)
	err = cmd.Run()
	took := d.cfg.Clock.Now().Sub(start)
	if err == nil {
		d.log.Info("boot script finished", "path", script, "took", took.String())
		d.condition(bootScriptCondition, "warning", "", false)
		return
	}
	if ctx.Err() != nil && d.ctx.Err() != nil {
		return // shutting down
	}
	if errors.Is(ctx.Err(), context.DeadlineExceeded) {
		err = fmt.Errorf("timed out after %s", d.cfg.BootScriptTimeout)
	}
	msg := fmt.Sprintf("%s failed: %v; its output is in %s", script, err, logPath)
	d.log.Warn("boot script failed", "path", script, "took", took.String(), "err", err, "log", logPath)
	d.condition(bootScriptCondition, "warning", msg, true)
}
