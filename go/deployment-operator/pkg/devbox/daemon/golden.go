package daemon

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/internal/fsutil"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/proc"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/guest"
)

// Golden boot statuses. Substrate snapshots the golden boot once /readyz answers 200, so /readyz holds off while
// the golden boot works and for good when it fails, which times the wakeup probe out and fails the revision.
const (
	StatusBootstrapping   = "bootstrapping"
	StatusBootstrapFailed = "bootstrap_failed"
)

// goldenFile marks a home the golden boot finished, so instances booting from it (or a restarted golden boot)
// don't redo the work.
type goldenFile struct {
	CompletedAt time.Time `json:"completedAt"`
}

func (d *Daemon) goldenPath() string    { return filepath.Join(d.cfg.StateDir, "golden.json") }
func (d *Daemon) goldenLogPath() string { return filepath.Join(d.cfg.StateDir, "golden.log") }

// needsGolden reports whether this boot is a golden boot with work left: the runner's template has repositories,
// mise or a bootstrap script, no instance was ever initialized here, and no golden boot finished in this home.
func (d *Daemon) needsGolden() bool {
	if !d.cfg.Guest.HasWork() {
		return false
	}
	d.mu.Lock()
	initialized := d.req != nil
	d.mu.Unlock()
	if initialized {
		return false
	}
	_, err := os.Stat(d.goldenPath())
	return errors.Is(err, os.ErrNotExist)
}

// golden runs the golden boot: clone the runner's repositories with the box's SCM credentials, install mise's
// tools, then run the bootstrap script, all in the home the snapshot carries to every instance.
func (d *Daemon) golden(cfg *guest.Config) {
	d.setStatus(StatusBootstrapping)
	start := time.Now()
	if err := d.runGolden(d.ctx, cfg); err != nil {
		d.log.Error("golden boot failed; the revision fails when its wakeup probe times out", "err", err,
			"log", d.goldenLogPath())
		d.condition("golden_boot_failed", "error", err.Error(), true)
		d.setStatus(StatusBootstrapFailed)
		return
	}
	d.log.Info("golden boot finished", "took", time.Since(start).Round(time.Second).String())
	d.setStatus(StatusBooting)
}

func (d *Daemon) runGolden(ctx context.Context, cfg *guest.Config) error {
	logf, err := os.OpenFile(d.goldenLogPath(), os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o600)
	if err != nil {
		return fmt.Errorf("golden boot log: %w", err)
	}
	defer logf.Close()

	if len(cfg.Repositories) > 0 {
		specs := make([]*devboxv1.RepositorySpec, 0, len(cfg.Repositories))
		urls := make([]string, 0, len(cfg.Repositories))
		for _, r := range cfg.Repositories {
			specs = append(specs, &devboxv1.RepositorySpec{Url: r.URL, Branch: r.Branch, Description: r.Description})
			urls = append(urls, r.URL)
		}
		d.writeGitAuth(urls...)
		d.log.Info("golden boot: cloning repositories", "count", len(specs))
		if err := d.ws.Preclone(ctx, specs); err != nil {
			return err
		}
	}
	if cfg.Mise != "" {
		path := filepath.Join(d.cfg.Home, ".config", "mise", "config.toml")
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			return err
		}
		if err := fsutil.WriteFileAtomic(path, []byte(cfg.Mise), 0o644); err != nil {
			return fmt.Errorf("writing %s: %w", path, err)
		}
		d.log.Info("golden boot: installing mise tools")
		if err := d.goldenCommand(ctx, logf, "mise", "install"); err != nil {
			return fmt.Errorf("mise install: %w", err)
		}
	}
	if cfg.BootstrapScript != "" {
		script := filepath.Join(d.cfg.StateDir, "bootstrap.sh")
		if err := os.WriteFile(script, []byte(cfg.BootstrapScript), 0o700); err != nil {
			return err
		}
		d.log.Info("golden boot: running the bootstrap script")
		args := []string{"bash", "-e", script}
		if strings.HasPrefix(cfg.BootstrapScript, "#!") {
			args = []string{script}
		}
		if err := d.goldenCommand(ctx, logf, args[0], args[1:]...); err != nil {
			return fmt.Errorf("bootstrap script: %w", err)
		}
	}
	return fsutil.WriteJSON(d.goldenPath(), goldenFile{CompletedAt: time.Now()}, 0o600)
}

// goldenCommand runs a golden boot step from the home with the box's environment, appending its output to the
// golden boot log and the daemon's own.
func (d *Daemon) goldenCommand(ctx context.Context, logf io.Writer, name string, args ...string) error {
	cmd := exec.CommandContext(ctx, name, args...)
	cmd.Dir = d.cfg.Home
	cmd.Env = d.baseEnv()
	pr, pw := io.Pipe()
	cmd.Stdout, cmd.Stderr = pw, pw
	var tail tailBuffer
	done := make(chan struct{})
	go func() {
		defer close(done)
		sc := bufio.NewScanner(pr)
		sc.Buffer(make([]byte, 64<<10), 1<<20)
		for sc.Scan() {
			line := sc.Text()
			_, _ = fmt.Fprintln(logf, line)
			tail.add(line)
			d.log.Info("golden boot output", "step", name, "line", line)
		}
		_, _ = io.Copy(io.Discard, pr)
	}()
	err := proc.Run(cmd)
	_ = pw.Close()
	<-done
	if err != nil {
		if t := tail.String(); t != "" {
			return fmt.Errorf("%w; last output:\n%s", err, t)
		}
		return err
	}
	return nil
}

// tailBuffer keeps a command's last lines for its error.
type tailBuffer struct{ lines []string }

const tailLines = 20

func (t *tailBuffer) add(line string) {
	t.lines = append(t.lines, line)
	if len(t.lines) > tailLines {
		t.lines = t.lines[len(t.lines)-tailLines:]
	}
}

func (t *tailBuffer) String() string { return strings.Join(t.lines, "\n") }
