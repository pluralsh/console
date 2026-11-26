package daemon

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"
)

const (
	homeCheckInterval = 30 * time.Second
	// homeCheckStuck is how long a probe may run before the home counts as hung: NBD holds I/O to a dead ZeroFS
	// writer for its timeout rather than failing it, while a busy volume can take seconds to sync.
	homeCheckStuck = 2 * time.Minute
	// homeCheckFailures is how many probes in a row must fail before the home counts as failed.
	homeCheckFailures = 2
	homeProbeFile     = ".home-probe"
)

// homeCheck tracks whether the workspace volume takes writes. A ZeroFS home whose writer died fails (or hangs)
// every write until the instance is suspended and resumed, which remounts it; heartbeats tell the gateway.
type homeCheck struct {
	mu       sync.Mutex
	started  time.Time
	failures int
	err      string
}

// begin starts a probe unless one is in flight, in which case it checks whether that one hung. It returns
// whether to run the probe, and the home error when it changed.
func (h *homeCheck) begin(now time.Time) (run bool, report string, changed bool) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.started.IsZero() {
		h.started = now
		return true, "", false
	}
	if took := now.Sub(h.started); took > homeCheckStuck {
		report, changed = h.setLocked(fmt.Sprintf("a write to the home hasn't returned in %s", took.Round(time.Second)))
	}
	return false, report, changed
}

// finish records a probe's result and returns the home error when it changed.
func (h *homeCheck) finish(err error) (string, bool) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.started = time.Time{}
	if err == nil {
		h.failures = 0
		return h.setLocked("")
	}
	h.failures++
	if h.failures < homeCheckFailures {
		return "", false
	}
	return h.setLocked("writing to the home: " + err.Error())
}

// reset forgets past failures after a restore, which remounted the home; a probe still in flight gets a fresh
// deadline.
func (h *homeCheck) reset(now time.Time) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.failures, h.err = 0, ""
	if !h.started.IsZero() {
		h.started = now
	}
}

func (h *homeCheck) error() string {
	h.mu.Lock()
	defer h.mu.Unlock()
	return h.err
}

func (h *homeCheck) setLocked(err string) (string, bool) {
	if err == h.err {
		return err, false
	}
	h.err = err
	return err, true
}

func (d *Daemon) homeLoop(ctx context.Context) {
	t := d.cfg.Clock.NewTicker(homeCheckInterval)
	defer t.Stop()
	// Conditions go through the event log, which blocks when the home hangs; heartbeats carry the error
	// regardless, so only the latest condition is kept and the probe loop never waits on it.
	pending := make(chan string, 1)
	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case msg := <-pending:
				d.homeChanged(msg)
			}
		}
	}()
	report := func(msg string) {
		for {
			select {
			case pending <- msg:
				return
			case <-pending:
			}
		}
	}
	done := make(chan error, 1)
	for {
		select {
		case <-ctx.Done():
			return
		case err := <-done:
			if msg, changed := d.home.finish(err); changed {
				report(msg)
			}
		case <-t.C():
			run, msg, changed := d.home.begin(d.cfg.Clock.Now())
			if changed {
				report(msg)
			}
			if run {
				go func() { done <- probeHome(d.cfg.StateDir) }()
			}
		}
	}
}

func (d *Daemon) homeChanged(msg string) {
	if msg == "" {
		d.log.Info("the home takes writes again")
	} else {
		d.log.Error("the home stopped taking writes; the gateway remounts it", "err", msg)
	}
	d.condition("home_unavailable", "error", msg, msg != "")
}

// probeHome writes and syncs a file in dir, which must be on the workspace volume.
func probeHome(dir string) error {
	f, err := os.OpenFile(filepath.Join(dir, homeProbeFile), os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0o600)
	if err != nil {
		return err
	}
	_, werr := f.WriteString(time.Now().UTC().Format(time.RFC3339Nano))
	return errors.Join(werr, f.Sync(), f.Close())
}
