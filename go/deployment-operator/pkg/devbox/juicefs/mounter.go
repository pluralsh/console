package juicefs

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/go-logr/logr"
)

const (
	mountPollInterval = 100 * time.Millisecond
	exitGrace         = 10 * time.Second
)

// ProcessMounter serves each mount with its own foreground `juicefs mount` process, so a mount's cache and
// lifetime belong to one volume. The processes live in this plugin's container: restarting the plugin ends them
// and with them every home it served on the node.
type ProcessMounter struct {
	Binary    string
	MetaURL   string
	CacheRoot string
	// Options are extra `juicefs mount` flags, such as cache sizes and metadata cache lifetimes.
	Options   []string
	Mountinfo string
	Log       logr.Logger

	mu    sync.Mutex
	procs map[string]*mountProc
}

type mountProc struct {
	cmd      *exec.Cmd
	cacheDir string
	done     chan struct{}
	err      error
	stopping bool
}

func (m *ProcessMounter) Mount(ctx context.Context, volumeID, target string, readOnly bool) error {
	cacheDir := filepath.Join(m.CacheRoot, volumeID)
	if err := os.MkdirAll(cacheDir, 0o700); err != nil {
		return fmt.Errorf("creating the cache directory: %w", err)
	}
	if err := os.MkdirAll(target, 0o750); err != nil {
		return fmt.Errorf("creating the mount point: %w", err)
	}
	args := []string{
		"mount", m.MetaURL, target,
		"--subdir", HomePath(volumeID),
		"--cache-dir", cacheDir,
		"--no-bgjob", "--no-usage-report", "--no-syslog",
	}
	args = append(args, m.Options...)
	if readOnly {
		args = append(args, "--read-only")
	}
	// The process outlives this call, so it can't be bound to the request's context.
	cmd := exec.Command(m.Binary, args...)
	cmd.Stdout, cmd.Stderr = os.Stderr, os.Stderr
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("starting juicefs mount: %w", err)
	}
	p := &mountProc{cmd: cmd, cacheDir: cacheDir, done: make(chan struct{})}
	m.mu.Lock()
	if m.procs == nil {
		m.procs = map[string]*mountProc{}
	}
	m.procs[target] = p
	m.mu.Unlock()
	go m.wait(volumeID, target, p)

	tick := time.NewTicker(mountPollInterval)
	defer tick.Stop()
	for {
		select {
		case <-p.done:
			return fmt.Errorf("juicefs mount exited before mounting: %w", p.err)
		case <-ctx.Done():
			m.stop(p)
			return ctx.Err()
		case <-tick.C:
			if ok, err := m.Mounted(target); err != nil {
				m.stop(p)
				return err
			} else if ok {
				return nil
			}
		}
	}
}

func (m *ProcessMounter) wait(volumeID, target string, p *mountProc) {
	p.err = p.cmd.Wait()
	m.mu.Lock()
	stopping := p.stopping
	if m.procs[target] == p {
		delete(m.procs, target)
	}
	m.mu.Unlock()
	close(p.done)
	if !stopping {
		m.Log.Error(p.err, "juicefs mount exited while serving a volume", "volume", volumeID, "target", target)
	}
}

// Unmount is idempotent: a target that isn't mounted, or a mount this process didn't start, is still cleaned up.
func (m *ProcessMounter) Unmount(ctx context.Context, target string) error {
	m.mu.Lock()
	p := m.procs[target]
	if p != nil {
		p.stopping = true
	}
	m.mu.Unlock()

	if ok, err := m.Mounted(target); err != nil {
		return err
	} else if ok {
		if err := unmount(target); err != nil {
			return err
		}
	}
	if p == nil {
		return nil
	}
	select {
	case <-p.done:
	case <-time.After(exitGrace):
		m.stop(p)
	case <-ctx.Done():
		m.stop(p)
	}
	if err := os.RemoveAll(p.cacheDir); err != nil {
		m.Log.Error(err, "removing a mount's cache", "dir", p.cacheDir)
	}
	return nil
}

// stop ends a mount process, politely first so it unmounts itself.
func (m *ProcessMounter) stop(p *mountProc) {
	m.mu.Lock()
	p.stopping = true
	m.mu.Unlock()
	_ = p.cmd.Process.Signal(syscall.SIGTERM)
	select {
	case <-p.done:
	case <-time.After(exitGrace):
		_ = p.cmd.Process.Kill()
		<-p.done
	}
}

func (m *ProcessMounter) Mounted(target string) (bool, error) {
	return MountedAt(m.Mountinfo, target)
}

// MountedAt reports whether the mountinfo file lists a JuiceFS mount at target.
func MountedAt(mountinfo, target string) (bool, error) {
	entries, err := readMountinfo(mountinfo)
	if err != nil {
		return false, err
	}
	for _, e := range entries {
		if e.point == target && e.fsType == FSType {
			return true, nil
		}
	}
	return false, nil
}

// DetachStale lazily unmounts the JuiceFS mounts under root that an earlier run of the plugin left behind. Their
// processes died with it, so they only answer "transport endpoint is not connected".
func (m *ProcessMounter) DetachStale(root string) error {
	entries, err := readMountinfo(m.Mountinfo)
	if err != nil {
		return err
	}
	prefix := filepath.Clean(root) + string(filepath.Separator)
	var errs []error
	for _, e := range entries {
		if e.fsType != FSType || !strings.HasPrefix(e.point, prefix) {
			continue
		}
		m.Log.Info("detaching a stale mount", "target", e.point)
		if err := detach(e.point); err != nil {
			errs = append(errs, fmt.Errorf("detaching %s: %w", e.point, err))
		}
	}
	return errors.Join(errs...)
}
