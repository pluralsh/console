// Package terminal runs PTY sessions for the workbench terminal pane and `plural devbox ssh` (DBX-42). Output is
// kept in a bounded replay buffer addressed by absolute byte offsets, so a reconnecting client replays exactly
// what it missed.
package terminal

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"os"
	"os/exec"
	"sort"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/creack/pty"
	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/timestamppb"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/derr"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/internal/clock"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/proc"
)

// DefaultReplayBytes is the retained output per terminal.
const DefaultReplayBytes = 2 << 20

// exitedRetention is how long an exited terminal stays listable.
const exitedRetention = 10 * time.Minute

// Options configure a Manager.
type Options struct {
	Home string
	// Shell is the login shell (default $SHELL; /bin/bash when unset or missing).
	Shell string
	// Env returns the base environment of new terminals.
	Env         func() []string
	ReplayBytes int
	// InfoInterval is how often an attached terminal is checked for a new cwd or foreground command.
	InfoInterval time.Duration
	// Cwd returns a process's working directory (default: read from /proc).
	Cwd   func(pid int) string
	Clock clock.Clock
	Log   *slog.Logger
}

// Manager owns the instance's terminals.
type Manager struct {
	opts  Options
	mu    sync.Mutex
	terms map[string]*Terminal
}

// New returns a Manager.
func New(opts Options) *Manager {
	if opts.Shell == "" {
		opts.Shell = os.Getenv("SHELL")
	}
	if _, err := os.Stat(opts.Shell); opts.Shell == "" || err != nil {
		opts.Shell = "/bin/bash"
	}
	if opts.ReplayBytes <= 0 {
		opts.ReplayBytes = DefaultReplayBytes
	}
	if opts.InfoInterval <= 0 {
		opts.InfoInterval = 500 * time.Millisecond
	}
	if opts.Cwd == nil {
		opts.Cwd = procCwd
	}
	if opts.Clock == nil {
		opts.Clock = clock.Real{}
	}
	if opts.Log == nil {
		opts.Log = slog.Default()
	}
	if opts.Env == nil {
		opts.Env = os.Environ
	}
	return &Manager{opts: opts, terms: map[string]*Terminal{}}
}

// Terminal is one PTY session.
type Terminal struct {
	m    *Manager
	id   string
	cmd  *exec.Cmd
	ptmx *os.File

	mu        sync.Mutex
	info      *devboxv1.TerminalInfo
	buf       []byte
	base      uint64 // offset of buf[0]
	changed   chan struct{}
	exited    bool
	exit      *devboxv1.TerminalExit
	exitedAt  time.Time
	lastIO    time.Time
	attached  int
	closeOnce sync.Once
}

// Create starts a terminal. Repeating a caller-chosen terminal_id returns the existing terminal.
func (m *Manager) Create(req *devboxv1.CreateTerminalRequest) (*devboxv1.TerminalInfo, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.gcLocked()
	id := req.GetTerminalId()
	if id != "" {
		if t, ok := m.terms[id]; ok {
			return t.Info(), nil
		}
	} else {
		id = uuid.NewString()
	}
	cwd := req.GetCwd()
	switch {
	case cwd == "" || cwd == "~":
		cwd = m.opts.Home
	case strings.HasPrefix(cwd, "~/"):
		cwd = m.opts.Home + cwd[1:]
	}
	command, args := req.GetCommand(), req.GetArgs()
	if command == "" {
		command, args = m.opts.Shell, []string{"-l"}
	}
	cmd := exec.Command(command, args...)
	cmd.Dir = cwd
	// SHELL names the terminal's shell, which may differ from the agents' (tmux and `exec $SHELL` follow it)
	cmd.Env = append(m.opts.Env(), "SHELL="+m.opts.Shell, "TERM=xterm-256color", "COLORTERM=truecolor", "DEVBOX_TERMINAL_ID="+id)
	keys := make([]string, 0, len(req.GetEnv()))
	for k := range req.GetEnv() {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		cmd.Env = append(cmd.Env, k+"="+req.GetEnv()[k])
	}
	cols, rows := req.GetCols(), req.GetRows()
	if cols <= 0 {
		cols = 120
	}
	if rows <= 0 {
		rows = 32
	}
	var ptmx *os.File
	err := proc.Start(cmd, func() error {
		var err error
		ptmx, err = pty.StartWithSize(cmd, &pty.Winsize{Cols: uint16(cols), Rows: uint16(rows)})
		return err
	})
	if err != nil {
		return nil, derr.New(codes.InvalidArgument, devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED, fmt.Sprintf("start terminal: %v", err), nil)
	}
	now := m.opts.Clock.Now()
	t := &Terminal{
		m: m, id: id, cmd: cmd, ptmx: ptmx, changed: make(chan struct{}), lastIO: now,
		info: &devboxv1.TerminalInfo{
			TerminalId: id, Cwd: cwd, Command: strings.TrimSpace(command + " " + strings.Join(args, " ")), Cols: cols, Rows: rows,
			CreatedAt: timestamppb.New(now), CreatedBy: req.GetCreatedBy(),
		},
	}
	m.terms[id] = t
	go t.pump()
	return t.Info(), nil
}

func (m *Manager) gcLocked() {
	now := m.opts.Clock.Now()
	for id, t := range m.terms {
		t.mu.Lock()
		gone := t.exited && t.attached == 0 && now.Sub(t.exitedAt) > exitedRetention
		t.mu.Unlock()
		if gone {
			delete(m.terms, id)
		}
	}
}

// Get returns a terminal.
func (m *Manager) Get(id string) (*Terminal, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	t, ok := m.terms[id]
	if !ok {
		return nil, derr.New(codes.NotFound, devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED, "terminal not found", map[string]string{"terminal_id": id})
	}
	return t, nil
}

// List returns every terminal.
func (m *Manager) List() []*devboxv1.TerminalInfo {
	m.mu.Lock()
	m.gcLocked()
	ts := make([]*Terminal, 0, len(m.terms))
	for _, t := range m.terms {
		ts = append(ts, t)
	}
	m.mu.Unlock()
	out := make([]*devboxv1.TerminalInfo, 0, len(ts))
	for _, t := range ts {
		out = append(out, t.Info())
	}
	sort.Slice(out, func(i, j int) bool { return out[i].GetCreatedAt().AsTime().Before(out[j].GetCreatedAt().AsTime()) })
	return out
}

// Resize resizes a terminal.
func (m *Manager) Resize(id string, cols, rows int32) (*devboxv1.TerminalInfo, error) {
	t, err := m.Get(id)
	if err != nil {
		return nil, err
	}
	if err := t.Resize(cols, rows); err != nil {
		return nil, err
	}
	return t.Info(), nil
}

// Close signals a terminal's process group (default SIGHUP) and closes the PTY.
func (m *Manager) Close(id, signal string) (*devboxv1.TerminalInfo, error) {
	t, err := m.Get(id)
	if err != nil {
		return nil, err
	}
	sig := syscall.SIGHUP
	if signal != "" {
		s, ok := signals[strings.TrimPrefix(strings.ToUpper(signal), "SIG")]
		if !ok {
			return nil, derr.New(codes.InvalidArgument, devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED, "unknown signal "+signal, nil)
		}
		sig = s
	}
	t.signal(sig)
	go func() {
		select {
		case <-t.waitExit():
		case <-time.After(5 * time.Second):
			t.signal(syscall.SIGKILL)
		}
	}()
	return t.Info(), nil
}

// CloseAll hangs up every terminal (daemon shutdown).
func (m *Manager) CloseAll() {
	m.mu.Lock()
	ts := make([]*Terminal, 0, len(m.terms))
	for _, t := range m.terms {
		ts = append(ts, t)
	}
	m.mu.Unlock()
	for _, t := range ts {
		t.signal(syscall.SIGHUP)
	}
}

var signals = map[string]syscall.Signal{
	"HUP": syscall.SIGHUP, "INT": syscall.SIGINT, "QUIT": syscall.SIGQUIT, "KILL": syscall.SIGKILL, "TERM": syscall.SIGTERM,
	"USR1": syscall.SIGUSR1, "USR2": syscall.SIGUSR2,
}

func (t *Terminal) signal(sig syscall.Signal) {
	if t.cmd.Process == nil {
		return
	}
	// The shell is a session leader with its own process group (pty.Start sets Setsid).
	_ = syscall.Kill(-t.cmd.Process.Pid, sig)
	_ = t.cmd.Process.Signal(sig)
}

// pump copies PTY output into the replay buffer until the PTY closes, then records the exit.
func (t *Terminal) pump() {
	b := make([]byte, 32<<10)
	for {
		n, err := t.ptmx.Read(b)
		if n > 0 {
			t.append(b[:n])
		}
		if err != nil {
			break
		}
	}
	err := proc.Wait(t.cmd)
	ex := &devboxv1.TerminalExit{}
	var ee *exec.ExitError
	switch {
	case err == nil:
		ex.ExitCode = proto.Int32(0)
	case errors.As(err, &ee):
		if ws, ok := ee.Sys().(syscall.WaitStatus); ok && ws.Signaled() {
			ex.Signal = ws.Signal().String()
		} else {
			ex.ExitCode = proto.Int32(int32(ee.ExitCode()))
		}
	}
	_ = t.ptmx.Close()
	t.mu.Lock()
	t.exited = true
	t.exit = ex
	t.exitedAt = t.m.opts.Clock.Now()
	t.info.Exited = true
	t.info.ExitCode = ex.ExitCode
	t.broadcastLocked()
	t.mu.Unlock()
}

func (t *Terminal) append(p []byte) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.buf = append(t.buf, p...)
	if over := len(t.buf) - t.m.opts.ReplayBytes; over > 0 {
		t.buf = append([]byte(nil), t.buf[over:]...)
		t.base += uint64(over)
	}
	t.lastIO = t.m.opts.Clock.Now()
	t.broadcastLocked()
}

func (t *Terminal) broadcastLocked() {
	close(t.changed)
	t.changed = make(chan struct{})
}

func (t *Terminal) waitExit() <-chan struct{} {
	ch := make(chan struct{})
	go func() {
		for {
			t.mu.Lock()
			done, wait := t.exited, t.changed
			t.mu.Unlock()
			if done {
				close(ch)
				return
			}
			<-wait
		}
	}()
	return ch
}

// Info returns the terminal's current info.
func (t *Terminal) Info() *devboxv1.TerminalInfo {
	t.mu.Lock()
	defer t.mu.Unlock()
	out := proto.Clone(t.info).(*devboxv1.TerminalInfo)
	out.OutputOffset = t.base + uint64(len(t.buf))
	if !t.exited {
		out.ForegroundCommand = t.foregroundCommand()
		if t.cmd.Process != nil {
			if cwd := t.m.opts.Cwd(t.cmd.Process.Pid); cwd != "" {
				out.Cwd = cwd
			}
		}
	}
	return out
}

// Write sends input to the PTY.
func (t *Terminal) Write(p []byte) error {
	t.mu.Lock()
	exited := t.exited
	t.lastIO = t.m.opts.Clock.Now()
	t.mu.Unlock()
	if exited {
		return io.ErrClosedPipe
	}
	_, err := t.ptmx.Write(p)
	return err
}

// Resize resizes the PTY.
func (t *Terminal) Resize(cols, rows int32) error {
	if cols <= 0 || rows <= 0 {
		return derr.New(codes.InvalidArgument, devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED, "cols and rows must be positive", nil)
	}
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.exited {
		return nil
	}
	if err := pty.Setsize(t.ptmx, &pty.Winsize{Cols: uint16(cols), Rows: uint16(rows)}); err != nil {
		return err
	}
	t.info.Cols, t.info.Rows = cols, rows
	return nil
}

// Read returns output at or after offset, blocking until some is available, the terminal exits or ctx ends.
// Offsets older than the retained buffer start at the oldest retained byte. The returned offset is that of
// data[0].
func (t *Terminal) Read(ctx context.Context, offset uint64) ([]byte, uint64, *devboxv1.TerminalExit, error) {
	for {
		t.mu.Lock()
		end := t.base + uint64(len(t.buf))
		if offset < t.base {
			offset = t.base
		}
		if offset < end {
			data := append([]byte(nil), t.buf[offset-t.base:]...)
			t.mu.Unlock()
			return data, offset, nil, nil
		}
		if t.exited {
			ex := t.exit
			t.mu.Unlock()
			return nil, end, ex, nil
		}
		wait := t.changed
		t.mu.Unlock()
		select {
		case <-wait:
		case <-ctx.Done():
			return nil, offset, nil, ctx.Err()
		}
	}
}

// Busy reports a foreground job (a process group other than the shell's) for idle detection.
func (t *Terminal) Busy() (string, bool) {
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.exited {
		return "", false
	}
	cmd := t.foregroundCommand()
	return cmd, cmd != ""
}

// LastIO is the time of the last input or output.
func (t *Terminal) LastIO() time.Time {
	t.mu.Lock()
	defer t.mu.Unlock()
	return t.lastIO
}

// Attached reports whether a client is attached.
func (t *Terminal) Attached() bool {
	t.mu.Lock()
	defer t.mu.Unlock()
	return t.attached > 0
}

// Pid returns the shell's PID.
func (t *Terminal) Pid() int {
	if t.cmd.Process == nil {
		return 0
	}
	return t.cmd.Process.Pid
}

// BusyReasons lists terminals with foreground jobs.
func (m *Manager) BusyReasons() []*devboxv1.BusyReason {
	m.mu.Lock()
	ts := make([]*Terminal, 0, len(m.terms))
	for _, t := range m.terms {
		ts = append(ts, t)
	}
	m.mu.Unlock()
	var out []*devboxv1.BusyReason
	for _, t := range ts {
		if cmd, busy := t.Busy(); busy {
			out = append(out, &devboxv1.BusyReason{Kind: devboxv1.BusyReasonKind_BUSY_REASON_KIND_TERMINAL_JOB, Detail: cmd, TerminalId: t.id})
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].GetTerminalId() < out[j].GetTerminalId() })
	return out
}

// Job is a terminal's foreground job.
type Job struct {
	TerminalID string
	Command    string
	Pgid       int
}

// Jobs lists foreground jobs (process groups other than the login shell's).
func (m *Manager) Jobs() []Job {
	m.mu.Lock()
	ts := make([]*Terminal, 0, len(m.terms))
	for _, t := range m.terms {
		ts = append(ts, t)
	}
	m.mu.Unlock()
	var out []Job
	for _, t := range ts {
		t.mu.Lock()
		exited := t.exited
		t.mu.Unlock()
		if exited || t.cmd.Process == nil {
			continue
		}
		pg := foregroundPgrp(t)
		if pg <= 0 || pg == t.cmd.Process.Pid {
			continue
		}
		cmd, _ := t.Busy()
		out = append(out, Job{TerminalID: t.id, Command: cmd, Pgid: pg})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].TerminalID < out[j].TerminalID })
	return out
}

// LastAttachedIO is the latest input/output time across attached terminals.
func (m *Manager) LastAttachedIO() time.Time {
	m.mu.Lock()
	defer m.mu.Unlock()
	var last time.Time
	for _, t := range m.terms {
		t.mu.Lock()
		if t.attached > 0 && t.lastIO.After(last) {
			last = t.lastIO
		}
		t.mu.Unlock()
	}
	return last
}

// AttachedCount is the number of attached terminal clients (interactive streams).
func (m *Manager) AttachedCount() int {
	m.mu.Lock()
	defer m.mu.Unlock()
	n := 0
	for _, t := range m.terms {
		t.mu.Lock()
		n += t.attached
		t.mu.Unlock()
	}
	return n
}
