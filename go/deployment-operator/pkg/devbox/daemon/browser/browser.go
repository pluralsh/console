// Package browser runs the sandbox's visible Chromium (DBX-45): Xvfb, Chromium with a CDP port the agent's
// Playwright MCP drives, x11vnc on localhost bridged to the /browser/vnc WebSocket, and the /preview/:port/*
// reverse proxy. The browser starts on demand (StartBrowser, a VNC viewer, or the first CDP connection) and stops
// when idle.
package browser

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net"
	neturl "net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"syscall"
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/internal/clock"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/proc"
)

// Defaults.
const (
	DefaultDisplay     = ":99"
	DefaultCDPPort     = 9222
	DefaultVNCPort     = 5900
	DefaultIdleTimeout = 15 * time.Minute
	VNCPath            = "/browser/vnc"
	startTimeout       = 30 * time.Second
)

// Options configure a Browser.
type Options struct {
	Chromium string
	Xvfb     string
	X11VNC   string
	Display  string
	// CDPPort is the localhost port agents connect to; the daemon proxies it to Chromium's own port (CDPPort+1)
	// so the first connection can start the browser.
	CDPPort     int
	VNCPort     int
	ProfileDir  string
	ExtraFlags  []string
	IdleTimeout time.Duration
	Env         func() []string
	Supervisor  *proc.Supervisor
	Clock       clock.Clock
	Log         *slog.Logger
}

// Browser manages the browser stack.
type Browser struct {
	opts Options
	log  *slog.Logger

	mu       sync.Mutex
	running  bool
	starting chan struct{}
	procs    []*proc.Process
	started  time.Time
	width    int32
	height   int32
	startErr error

	streams      atomic.Int64
	lastActivity atomic.Int64
}

// New returns a Browser.
func New(opts Options) *Browser {
	if opts.Chromium == "" {
		opts.Chromium = firstExisting(os.Getenv("DEVBOX_CHROMIUM"), "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome")
	}
	if opts.Xvfb == "" {
		opts.Xvfb = "Xvfb"
	}
	if opts.X11VNC == "" {
		opts.X11VNC = "x11vnc"
	}
	if opts.Display == "" {
		opts.Display = DefaultDisplay
	}
	if opts.CDPPort == 0 {
		opts.CDPPort = DefaultCDPPort
	}
	if opts.VNCPort == 0 {
		opts.VNCPort = DefaultVNCPort
	}
	if opts.IdleTimeout == 0 {
		opts.IdleTimeout = DefaultIdleTimeout
	}
	if opts.Env == nil {
		opts.Env = os.Environ
	}
	if opts.Clock == nil {
		opts.Clock = clock.Real{}
	}
	if opts.Log == nil {
		opts.Log = slog.Default()
	}
	if opts.Supervisor == nil {
		opts.Supervisor = proc.NewSupervisor(opts.Log)
	}
	b := &Browser{opts: opts, log: opts.Log.With("component", "browser")}
	b.touch()
	return b
}

func firstExisting(paths ...string) string {
	for _, p := range paths {
		if p == "" {
			continue
		}
		if _, err := os.Stat(p); err == nil {
			return p
		}
	}
	return "chromium"
}

// Available reports whether Chromium, Xvfb and x11vnc are installed.
func (b *Browser) Available() bool {
	for _, bin := range []string{b.opts.Chromium, b.opts.Xvfb, b.opts.X11VNC} {
		if _, err := exec.LookPath(bin); err != nil {
			return false
		}
	}
	return true
}

func (b *Browser) touch() { b.lastActivity.Store(b.opts.Clock.Now().UnixNano()) }

// LastActivity is the last time a stream carried bytes or the browser was started.
func (b *Browser) LastActivity() time.Time { return time.Unix(0, b.lastActivity.Load()) }

// Streams is the number of open VNC/CDP/preview streams.
func (b *Browser) Streams() int { return int(b.streams.Load()) }

func (b *Browser) internalCDPPort() int { return b.opts.CDPPort + 1 }

// Info returns the browser state.
func (b *Browser) Info() *devboxv1.BrowserInfo {
	b.mu.Lock()
	defer b.mu.Unlock()
	info := &devboxv1.BrowserInfo{Running: b.running, VncPath: VNCPath, CdpPort: int32(b.opts.CDPPort), Width: b.width, Height: b.height}
	if b.running {
		info.StartedAt = timestamppb.New(b.started)
	}
	return info
}

// Start starts Xvfb, x11vnc and Chromium if they aren't running.
func (b *Browser) Start(ctx context.Context, width, height int32, url string) (*devboxv1.BrowserInfo, error) {
	if width <= 0 {
		width = 1280
	}
	if height <= 0 {
		height = 800
	}
	for {
		b.mu.Lock()
		if b.running {
			b.mu.Unlock()
			if url != "" {
				b.open(ctx, url)
			}
			return b.Info(), nil
		}
		if wait := b.starting; wait != nil {
			b.mu.Unlock()
			select {
			case <-wait:
				b.mu.Lock()
				err := b.startErr
				b.mu.Unlock()
				if err != nil {
					return nil, err
				}
				continue
			case <-ctx.Done():
				return nil, ctx.Err()
			}
		}
		b.starting = make(chan struct{})
		b.mu.Unlock()
		err := b.start(width, height, url)
		b.mu.Lock()
		b.startErr = err
		close(b.starting)
		b.starting = nil
		b.mu.Unlock()
		if err != nil {
			return nil, err
		}
		b.touch()
		return b.Info(), nil
	}
}

func (b *Browser) spawn(name string, args ...string) (*proc.Process, error) {
	cmd := exec.Command(args[0], args[1:]...)
	cmd.Env = append(b.opts.Env(), "DISPLAY="+b.opts.Display)
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	cmd.Stdout, cmd.Stderr = io.Discard, io.Discard
	// Browser processes don't count as user activity on their own; stream bytes do.
	return b.opts.Supervisor.Spawn(name, cmd, cmd.Start, true)
}

func (b *Browser) start(width, height int32, url string) error {
	var procs []*proc.Process
	fail := func(err error) error {
		for i := len(procs) - 1; i >= 0; i-- {
			_ = b.opts.Supervisor.Stop(procs[i], 2*time.Second)
		}
		return err
	}
	display := strings.TrimPrefix(b.opts.Display, ":")
	sock := filepath.Join("/tmp/.X11-unix", "X"+display)
	if _, err := os.Stat(sock); err != nil {
		p, err := b.spawn("xvfb", b.opts.Xvfb, b.opts.Display, "-screen", "0", fmt.Sprintf("%dx%dx24", width, height), "-nolisten", "tcp", "-ac")
		if err != nil {
			return fail(fmt.Errorf("start Xvfb: %w", err))
		}
		procs = append(procs, p)
		if err := waitFor(func() bool { _, err := os.Stat(sock); return err == nil }, startTimeout); err != nil {
			return fail(errors.New("xvfb didn't start"))
		}
	}
	p, err := b.spawn("x11vnc", b.opts.X11VNC, "-display", b.opts.Display, "-rfbport", strconv.Itoa(b.opts.VNCPort), "-localhost",
		"-forever", "-shared", "-nopw", "-quiet", "-noxdamage")
	if err != nil {
		return fail(fmt.Errorf("start x11vnc: %w", err))
	}
	procs = append(procs, p)
	profile := b.opts.ProfileDir
	if profile == "" {
		profile = filepath.Join(os.TempDir(), "devbox-chromium")
	}
	_ = os.MkdirAll(profile, 0o700)
	_ = os.Remove(filepath.Join(profile, "SingletonLock"))
	args := make([]string, 0, 13+len(b.opts.ExtraFlags))
	args = append(args, b.opts.Chromium,
		"--no-first-run", "--no-default-browser-check", "--disable-dev-shm-usage", "--disable-background-networking",
		"--remote-debugging-address=127.0.0.1", "--remote-debugging-port="+strconv.Itoa(b.internalCDPPort()),
		"--user-data-dir="+profile, fmt.Sprintf("--window-size=%d,%d", width, height), "--window-position=0,0", "--start-maximized",
	)
	args = append(args, b.opts.ExtraFlags...)
	if url == "" {
		url = "about:blank"
	}
	args = append(args, url)
	p, err = b.spawn("chromium", args...)
	if err != nil {
		return fail(fmt.Errorf("start chromium: %w", err))
	}
	procs = append(procs, p)
	if err := waitFor(func() bool { return dialable(b.internalCDPPort()) && dialable(b.opts.VNCPort) }, startTimeout); err != nil {
		return fail(errors.New("chromium or x11vnc didn't come up"))
	}
	b.mu.Lock()
	b.running, b.procs, b.started, b.width, b.height = true, procs, b.opts.Clock.Now(), width, height
	b.mu.Unlock()
	for _, p := range procs {
		go b.watch(p)
	}
	b.log.Info("browser started", "display", b.opts.Display, "cdp", b.opts.CDPPort, "vnc", b.opts.VNCPort)
	return nil
}

// watch tears the stack down when one of its processes dies.
func (b *Browser) watch(p *proc.Process) {
	<-p.Done()
	b.mu.Lock()
	mine := false
	for _, q := range b.procs {
		mine = mine || q == p
	}
	b.mu.Unlock()
	if mine {
		b.log.Warn("browser process exited", "name", p.Name)
		b.Stop()
	}
}

// open asks Chromium to open a URL in a new tab.
func (b *Browser) open(ctx context.Context, target string) {
	c, err := net.DialTimeout("tcp", fmt.Sprintf("127.0.0.1:%d", b.internalCDPPort()), 2*time.Second)
	if err != nil {
		return
	}
	defer c.Close()
	req := fmt.Sprintf("PUT /json/new?%s HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n", neturl.QueryEscape(target))
	_, _ = c.Write([]byte(req))
	_, _ = io.Copy(io.Discard, io.LimitReader(c, 64<<10))
}

// Stop stops the browser stack.
func (b *Browser) Stop() *devboxv1.BrowserInfo {
	b.mu.Lock()
	procs := b.procs
	b.procs, b.running = nil, false
	b.mu.Unlock()
	for i := len(procs) - 1; i >= 0; i-- {
		_ = b.opts.Supervisor.Stop(procs[i], 3*time.Second)
	}
	return b.Info()
}

// IdleLoop stops the browser after IdleTimeout without streams or stream bytes.
func (b *Browser) IdleLoop(ctx context.Context) {
	t := b.opts.Clock.NewTicker(time.Minute)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C():
			b.mu.Lock()
			running := b.running
			b.mu.Unlock()
			if running && b.Streams() == 0 && b.opts.Clock.Since(b.LastActivity()) >= b.opts.IdleTimeout {
				b.log.Info("stopping idle browser")
				b.Stop()
			}
		}
	}
}

// ServeCDP accepts agent CDP connections on 127.0.0.1:CDPPort, starting the browser on first use.
func (b *Browser) ServeCDP(ctx context.Context) error {
	ln, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", b.opts.CDPPort))
	if err != nil {
		return err
	}
	go func() {
		<-ctx.Done()
		_ = ln.Close()
	}()
	for {
		c, err := ln.Accept()
		if err != nil {
			if ctx.Err() != nil {
				return nil
			}
			return err
		}
		go func() {
			defer c.Close()
			if _, err := b.Start(ctx, 0, 0, ""); err != nil {
				b.log.Warn("start browser for CDP", "err", err)
				return
			}
			up, err := net.DialTimeout("tcp", fmt.Sprintf("127.0.0.1:%d", b.internalCDPPort()), 5*time.Second)
			if err != nil {
				return
			}
			defer up.Close()
			b.Pipe(c, up)
		}()
	}
}

// Pipe copies bytes both ways, counting the stream and its activity.
func (b *Browser) Pipe(a, c io.ReadWriteCloser) {
	b.streams.Add(1)
	defer b.streams.Add(-1)
	done := make(chan struct{}, 2)
	cp := func(dst io.Writer, src io.Reader) {
		_, _ = io.Copy(&activityWriter{w: dst, b: b}, src)
		done <- struct{}{}
	}
	go cp(a, c)
	go cp(c, a)
	<-done
	_ = a.Close()
	_ = c.Close()
	<-done
}

type activityWriter struct {
	w io.Writer
	b *Browser
}

func (a *activityWriter) Write(p []byte) (int, error) {
	a.b.touch()
	return a.w.Write(p)
}

func dialable(port int) bool {
	c, err := net.DialTimeout("tcp", fmt.Sprintf("127.0.0.1:%d", port), 200*time.Millisecond)
	if err != nil {
		return false
	}
	_ = c.Close()
	return true
}

func waitFor(cond func() bool, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if cond() {
			return nil
		}
		time.Sleep(100 * time.Millisecond)
	}
	return errors.New("timed out")
}

// PlaywrightMCP is the stdio MCP server entry that drives this browser, added to every session when the image
// ships playwright-mcp.
func (b *Browser) PlaywrightMCP(command string) map[string]any {
	return map[string]any{
		"name":    "playwright",
		"command": command,
		"args":    []any{"--cdp-endpoint", fmt.Sprintf("http://127.0.0.1:%d", b.opts.CDPPort)},
		"env":     []any{},
	}
}
