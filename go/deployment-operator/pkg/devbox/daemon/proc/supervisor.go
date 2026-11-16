package proc

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"sort"
	"sync"
	"syscall"
	"time"
)

// Process is a long-running child the supervisor knows about (harness, Xvfb, Chromium, VNC, ...).
type Process struct {
	Name string
	Cmd  *exec.Cmd
	// ExcludeFromIdle keeps the process's CPU out of idle detection (e.g. the browser stack, whose activity is
	// measured on its streams instead).
	ExcludeFromIdle bool
	StartedAt       time.Time

	done     chan struct{}
	exitErr  error
	stopping bool
}

// Done is closed when the process exits.
func (p *Process) Done() <-chan struct{} { return p.done }

// Err is the exit error once Done is closed.
func (p *Process) Err() error { return p.exitErr }

// Pid is the process ID.
func (p *Process) Pid() int {
	if p.Cmd.Process == nil {
		return 0
	}
	return p.Cmd.Process.Pid
}

// ProcessInfo is a snapshot of a supervised process.
type ProcessInfo struct {
	Name            string
	Pid             int
	StartedAt       time.Time
	ExcludeFromIdle bool
}

// Supervisor tracks long-running children so signals can be forwarded to them and they can be stopped together.
type Supervisor struct {
	log   *slog.Logger
	mu    sync.Mutex
	procs map[*Process]struct{}
}

// NewSupervisor returns an empty supervisor.
func NewSupervisor(log *slog.Logger) *Supervisor {
	return &Supervisor{log: log, procs: map[*Process]struct{}{}}
}

// Spawn starts cmd under supervision. start may be nil (cmd.Start) or a custom starter (pty).
func (s *Supervisor) Spawn(name string, cmd *exec.Cmd, start func() error, excludeFromIdle bool) (*Process, error) {
	if cmd.SysProcAttr == nil {
		cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	}
	p := &Process{Name: name, Cmd: cmd, ExcludeFromIdle: excludeFromIdle, StartedAt: time.Now(), done: make(chan struct{})}
	if err := Start(cmd, start); err != nil {
		return nil, fmt.Errorf("start %s: %w", name, err)
	}
	s.mu.Lock()
	s.procs[p] = struct{}{}
	s.mu.Unlock()
	s.log.Info("process started", "name", name, "pid", p.Pid())
	go func() {
		p.exitErr = Wait(cmd)
		s.mu.Lock()
		delete(s.procs, p)
		stopping := p.stopping
		s.mu.Unlock()
		if stopping {
			s.log.Info("process stopped", "name", name, "pid", p.Pid())
		} else {
			s.log.Warn("process exited", "name", name, "pid", p.Pid(), "err", p.exitErr)
		}
		close(p.done)
	}()
	return p, nil
}

// Stop sends SIGTERM to the process group, then SIGKILL after grace.
func (s *Supervisor) Stop(p *Process, grace time.Duration) error {
	if p == nil {
		return nil
	}
	s.mu.Lock()
	p.stopping = true
	s.mu.Unlock()
	pid := p.Pid()
	if pid == 0 {
		return nil
	}
	select {
	case <-p.done:
		return nil
	default:
	}
	_ = syscall.Kill(-pid, syscall.SIGTERM)
	select {
	case <-p.done:
		return nil
	case <-time.After(grace):
	}
	_ = syscall.Kill(-pid, syscall.SIGKILL)
	select {
	case <-p.done:
		return nil
	case <-time.After(5 * time.Second):
		return errors.New("process did not exit after SIGKILL")
	}
}

// Forward sends sig to every supervised process group.
func (s *Supervisor) Forward(sig syscall.Signal) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for p := range s.procs {
		if pid := p.Pid(); pid > 0 {
			_ = syscall.Kill(-pid, sig)
		}
	}
}

// List returns the supervised processes, sorted by name.
func (s *Supervisor) List() []ProcessInfo {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]ProcessInfo, 0, len(s.procs))
	for p := range s.procs {
		out = append(out, ProcessInfo{Name: p.Name, Pid: p.Pid(), StartedAt: p.StartedAt, ExcludeFromIdle: p.ExcludeFromIdle})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })
	return out
}

// ExcludedPids returns PIDs (process-group leaders) whose CPU idle detection should ignore.
func (s *Supervisor) ExcludedPids() map[int]bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := map[int]bool{}
	for p := range s.procs {
		if p.ExcludeFromIdle {
			out[p.Pid()] = true
		}
	}
	return out
}

// StopAll stops every supervised process.
func (s *Supervisor) StopAll(ctx context.Context, grace time.Duration) {
	s.mu.Lock()
	procs := make([]*Process, 0, len(s.procs))
	for p := range s.procs {
		procs = append(procs, p)
	}
	s.mu.Unlock()
	var wg sync.WaitGroup
	for _, p := range procs {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_ = s.Stop(p, grace)
		}()
	}
	done := make(chan struct{})
	go func() { wg.Wait(); close(done) }()
	select {
	case <-done:
	case <-ctx.Done():
	}
}

// IsPID1 reports whether the daemon runs as init.
func IsPID1() bool { return os.Getpid() == 1 }
