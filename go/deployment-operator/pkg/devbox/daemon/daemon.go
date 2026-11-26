// Package daemon is devbox-daemon, PID 1 in every DevBox sandbox (section 4.2). It wires the subsystems together
// and serves the devbox.v1.Daemon gRPC service and the HTTP endpoints (/readyz, /terminals/<id>/ws,
// /browser/vnc, /preview/<port>/*) on one h2c port.
package daemon

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"errors"
	"fmt"
	"log/slog"
	"maps"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/google/uuid"
	"google.golang.org/grpc"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/timestamppb"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/agents"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/authn"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/browser"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/creds"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/eventlog"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/files"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/harness"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/idle"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/internal/fsutil"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/proc"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/prs"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/terminal"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/transcript"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/trust"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/workspace"
)

// Health statuses.
const (
	StatusBooting   = "booting"
	StatusHydrating = "hydrating"
	StatusReady     = "ready"
	StatusDegraded  = "degraded"
)

const (
	idleInterval      = 10 * time.Second
	heartbeatInterval = 15 * time.Second
	restoreCheck      = 2 * time.Second
	// restoreSkew is how far the wall clock may run ahead of the monotonic clock before the daemon assumes the
	// sandbox was suspended and restored.
	restoreSkew = 20 * time.Second
	loginCheck  = 5 * time.Minute
)

// instanceFile persists Initialize so a restarted daemon resumes with the same configuration.
type instanceFile struct {
	Request         []byte `json:"request"`
	FirstThreadDone bool   `json:"firstThreadDone"`
}

// Daemon is the running daemon.
type Daemon struct {
	devboxv1.UnimplementedDaemonServer

	cfg     Config
	log     *slog.Logger
	bootID  string
	started time.Time
	image   *harness.ImageInfo
	trustOK bool

	events     *eventlog.Log
	transcript *transcript.Store
	sup        *proc.Supervisor
	harness    *harness.Config
	agents     *agents.Manager
	terms      *terminal.Manager
	files      *files.Service
	ws         *workspace.Manager
	prs        *prs.Preparer
	browser    *browser.Browser
	idle       *idle.Detector
	creds      *creds.Manager
	verifier   *authn.Verifier
	home       homeCheck

	ctx    context.Context
	cancel context.CancelFunc
	// bg tracks Serve's background loops so shutdown can wait for them before closing the event log.
	bg sync.WaitGroup

	initMu sync.Mutex
	mu     sync.Mutex
	req    *devboxv1.InitializeRequest
	inst   instanceFile
	status string
	// restored is set when a memory restore is detected and cleared by the next health probe.
	restored bool
	// scrubbed is set when PrepareSuspend removed credentials for a snapshot; the next probe refetches them.
	scrubbed   bool
	credURL    string
	credClient devboxv1.SandboxCredentialsClient
	credConn   *grpc.ClientConn
	catalog    []*devboxv1.AgentCatalogEntry

	subMu     sync.Mutex
	subCancel context.CancelFunc
}

// New builds the daemon and restores its persisted state. Nothing runs until Run.
func New(cfg Config) (*Daemon, error) {
	cfg.defaults()
	d := &Daemon{cfg: cfg, log: cfg.Log, bootID: uuid.NewString(), started: cfg.Clock.Now(), status: StatusBooting}
	d.ctx, d.cancel = context.WithCancel(context.Background())
	if err := os.MkdirAll(cfg.StateDir, 0o700); err != nil {
		return nil, err
	}

	if cfg.TrustDir != "" {
		if err := os.MkdirAll(cfg.TrustDir, 0o755); err != nil {
			d.log.Warn("trust dir", "err", err)
		} else if n, err := trust.Build(cfg.TrustBundle(), cfg.SystemCABundle, cfg.EgressCAGlobs); err != nil {
			d.log.Warn("ca bundle", "err", err)
		} else {
			d.trustOK = true
			if n == 0 && len(cfg.EgressCAGlobs) > 0 {
				d.log.Warn("no egress CA found; TLS through egress interception will fail", "globs", cfg.EgressCAGlobs)
			}
		}
		if _, err := os.Stat(cfg.TrustBundle()); err == nil {
			d.trustOK = true
		}
	}

	img, err := harness.LoadImageInfo(cfg.ImageInfo)
	if err != nil {
		return nil, err
	}
	d.image = img

	ev, err := eventlog.Open(filepath.Join(cfg.StateDir, "events"))
	if err != nil {
		return nil, fmt.Errorf("event log: %w", err)
	}
	d.events = ev
	if d.transcript, err = transcript.Open(filepath.Join(cfg.StateDir, "transcripts")); err != nil {
		return nil, fmt.Errorf("transcript: %w", err)
	}
	d.sup = proc.NewSupervisor(d.log.With("component", "proc"))
	d.verifier = authn.NewVerifier(cfg.Clock.Now)

	d.ws, err = workspace.New(workspace.Options{Home: cfg.Home, StateDir: cfg.StateDir, SkelDir: cfg.SkelDir,
		Log: d.log.With("component", "workspace"), Condition: d.condition, OnChange: func() {
			d.writeGitAuth()
			if d.files != nil {
				d.files.ChangesCache.Warm(d.ctx, d.ws.Checkouts())
			}
			if d.agents != nil {
				d.agents.Flush()
			}
		}})
	if err != nil {
		return nil, err
	}
	// The skeleton is copied without clobbering, so it must land before anything else writes into the home.
	if err := d.ws.ApplySkel(); err != nil {
		d.log.Warn("home skeleton", "err", err)
	}

	d.harness = &harness.Config{Home: cfg.Home, StateDir: cfg.StateDir, Image: img, AgentAuthDir: cfg.AgentAuthDir,
		BaseEnv: d.baseEnv, Overrides: cfg.AgentOverrides}
	if err := d.harness.LinkInstructions(); err != nil {
		d.log.Warn("harness instruction links", "err", err)
	}
	d.files = &files.Service{Home: cfg.Home, Checkouts: d.ws,
		ChangesCache: files.NewChangesCache(d.log.With("component", "changes"))}
	d.terms = terminal.New(terminal.Options{Home: cfg.Home, Shell: cfg.Shell, Env: d.baseEnv, Clock: cfg.Clock,
		Log: d.log.With("component", "terminal")})
	d.browser = browser.New(browser.Options{Chromium: cfg.Chromium, Xvfb: cfg.Xvfb, X11VNC: cfg.X11VNC, Voxl: cfg.Voxl,
		Display: cfg.Display, CDPPort: cfg.CDPPort, VNCPort: cfg.VNCPort, VoxlPort: cfg.VoxlPort, ProfileDir: filepath.Join(cfg.StateDir, "browser"),
		IdleTimeout: cfg.BrowserIdle, Env: d.baseEnv, Supervisor: d.sup, Clock: cfg.Clock,
		Log: d.log.With("component", "browser")})
	d.creds = creds.New(creds.Options{Home: cfg.Home, IdentityDir: cfg.IdentityDir, AgentAuthDir: cfg.AgentAuthDir,
		Client: d.sandboxCredentials, InstanceID: d.instanceID, Clock: cfg.Clock,
		Log: d.log.With("component", "creds"), Condition: d.condition})
	d.agents = agents.New(agents.Options{Home: cfg.Home, StateDir: cfg.StateDir, Emitter: agents.EmitterFunc(d.emit),
		Head: d.events.Head, Transcript: d.transcript, Launcher: launcher{d}, Supervisor: d.sup, Clock: cfg.Clock, Log: d.log.With("component", "agents"),
		MaxRunning: cfg.MaxRunningThreads, Endpoints: d.endpoints, Worktrees: d.ws.Worktrees,
		Checkouts: d.ws.CheckoutInfo, ExtraMCPServers: d.extraMCPServers, ReviewClient: d.reviewClient()})
	d.prs = prs.New(prs.Options{
		Checkouts: func(ctx context.Context) []*devboxv1.Checkout { return d.ws.List(ctx, true).GetCheckouts() },
		Env:       d.baseEnv, Endpoints: d.endpoints, Client: d.reviewClient(), Harness: d.harness,
		RecentPrompts: d.agents.RecentPrompts, Log: d.log.With("component", "prs")})

	sampler := &cpuSampler{d: d, inner: &idle.ProcSampler{Root: "/proc"}}
	d.idle = idle.New(cfg.Clock, idle.PolicyOf(nil), idle.Sources{
		Agent:          d.agents.BusyReasons,
		TerminalJobs:   d.terminalJobs,
		StreamActivity: d.streamActivity,
		CPU:            sampler,
	}, idleEmitter{d})
	d.idle.SettledOffset = d.settle

	d.loadCatalog()
	if err := d.loadInstance(); err != nil {
		d.log.Warn("persisted instance", "err", err)
	}
	return d, nil
}

// Run serves until ctx ends, then shuts every subsystem down.
func (d *Daemon) Run(ctx context.Context) error {
	ln, err := net.Listen("tcp", d.cfg.ListenAddr)
	if err != nil {
		return err
	}
	return d.Serve(ctx, ln)
}

// Serve is Run on an existing listener.
func (d *Daemon) Serve(ctx context.Context, ln net.Listener) error {
	defer d.cancel()
	go func() {
		<-ctx.Done()
		d.cancel()
	}()
	if proc.IsPID1() {
		go proc.Reap(d.ctx, d.log.With("component", "reaper"))
	}
	if err := d.agents.Start(); err != nil {
		d.log.Error("agents start", "err", err)
	}
	d.bg.Go(func() { d.events.SyncEvery(d.ctx, time.Second) })
	d.bg.Go(func() { d.ws.Watch(d.ctx) })
	d.bg.Go(func() { d.files.ChangesCache.Run(d.ctx) })
	d.files.ChangesCache.Warm(d.ctx, d.ws.Checkouts())
	d.bg.Go(func() { d.browser.IdleLoop(d.ctx) })
	d.bg.Go(func() {
		if err := d.browser.ServeCDP(d.ctx); err != nil && d.ctx.Err() == nil {
			d.log.Warn("cdp listener", "err", err)
		}
	})
	d.bg.Go(func() { d.creds.WatchCodex(d.ctx) })
	d.bg.Go(func() { d.creds.RunOIDC(d.ctx) })
	d.bg.Go(func() { d.idleLoop(d.ctx) })
	d.bg.Go(func() { d.restoreLoop(d.ctx) })
	d.bg.Go(func() { d.homeLoop(d.ctx) })
	d.bg.Go(func() { d.loginLoop(d.ctx) })
	d.bg.Go(d.importJavaTrust)

	d.mu.Lock()
	req := d.req
	d.mu.Unlock()
	switch {
	case req != nil:
		d.bg.Go(func() { d.hydrate(req) })
	case d.needsGolden():
		// set before /readyz is served, so Substrate can't snapshot the golden boot before its work
		d.setStatus(StatusBootstrapping)
		d.bg.Go(func() { d.golden(d.cfg.Guest) })
	}

	var protocols http.Protocols
	protocols.SetHTTP1(true)
	protocols.SetUnencryptedHTTP2(true)
	srv := &http.Server{Handler: d.Handler(), Protocols: &protocols, ReadHeaderTimeout: 10 * time.Second,
		BaseContext: func(net.Listener) context.Context { return d.ctx }}
	errc := make(chan error, 1)
	var err error
	go func() { errc <- srv.Serve(ln) }()
	d.log.Info("devbox-daemon serving", "addr", ln.Addr().String(), "version", d.cfg.Version, "boot_id", d.bootID,
		"pid1", proc.IsPID1())

	select {
	case <-d.ctx.Done():
	case err = <-errc:
	}
	d.shutdown(srv)
	if errors.Is(err, http.ErrServerClosed) {
		err = nil
	}
	return err
}

func (d *Daemon) shutdown(srv *http.Server) {
	d.log.Info("shutting down")
	sctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	d.agents.SettleAll()
	_ = srv.Shutdown(sctx)
	d.agents.Stop(sctx)
	d.terms.CloseAll()
	d.browser.Stop()
	d.sup.StopAll(sctx, 5*time.Second)
	d.cancel()
	bgDone := make(chan struct{})
	go func() { d.bg.Wait(); close(bgDone) }()
	select {
	case <-bgDone:
	case <-sctx.Done():
		d.log.Warn("background tasks still running at shutdown")
	}
	d.mu.Lock()
	if d.credConn != nil {
		_ = d.credConn.Close()
	}
	d.mu.Unlock()
	if err := d.events.Close(); err != nil {
		d.log.Warn("event log close", "err", err)
	}
	if err := d.transcript.Close(); err != nil {
		d.log.Warn("transcript close", "err", err)
	}
}

// Forward relays a signal to every supervised child (PID 1 duty).
func (d *Daemon) Forward(sig syscall.Signal) { d.sup.Forward(sig) }

// ---- event emission ----

func (d *Daemon) emit(ev *devboxv1.DaemonEvent) {
	if _, err := d.events.Append(ev); err != nil && !errors.Is(err, eventlog.ErrClosed) {
		d.log.Error("event log append", "err", err)
	}
}

func (d *Daemon) condition(typ, severity, msg string, active bool) {
	d.log.Info("condition", "type", typ, "severity", severity, "message", msg, "active", active)
	d.emit(&devboxv1.DaemonEvent{Event: &devboxv1.DaemonEvent_Condition{Condition: &devboxv1.DaemonCondition{
		Type: typ, Severity: severity, Message: msg, Active: active}}})
}

type idleEmitter struct{ d *Daemon }

func (e idleEmitter) IdleState(s *devboxv1.IdleState) {
	e.d.emit(&devboxv1.DaemonEvent{Event: &devboxv1.DaemonEvent_IdleState{IdleState: proto.Clone(s).(*devboxv1.IdleState)}})
}

func (e idleEmitter) SuspendRequested(s *devboxv1.SuspendRequested) {
	e.d.emit(&devboxv1.DaemonEvent{Event: &devboxv1.DaemonEvent_SuspendRequested{SuspendRequested: s}})
}

// settle settles every in-flight entity and returns the offset through which the log is settled.
func (d *Daemon) settle() uint64 {
	d.agents.SettleAll()
	d.agents.Flush()
	if err := d.events.Sync(); err != nil {
		d.log.Warn("event log sync", "err", err)
	}
	return d.events.Head()
}

// ---- configuration accessors ----

func (d *Daemon) instanceID() string {
	d.mu.Lock()
	defer d.mu.Unlock()
	return d.req.GetInstanceId()
}

func (d *Daemon) endpoints() *devboxv1.HarnessEndpoints {
	d.mu.Lock()
	defer d.mu.Unlock()
	return d.req.GetEndpoints()
}

// reviewClient is the agent reviewer's client for the AI proxy, which it reaches through the egress proxy's TLS
// interception like the harnesses do.
func (d *Daemon) reviewClient() *http.Client {
	tr := http.DefaultTransport.(*http.Transport).Clone()
	if d.trustOK {
		if pem, err := os.ReadFile(d.cfg.TrustBundle()); err == nil {
			pool, _ := x509.SystemCertPool()
			if pool == nil {
				pool = x509.NewCertPool()
			}
			pool.AppendCertsFromPEM(pem)
			tr.TLSClientConfig = &tls.Config{MinVersion: tls.VersionTLS12, RootCAs: pool}
		}
	}
	return &http.Client{Transport: tr}
}

func (d *Daemon) sandboxCredentials() devboxv1.SandboxCredentialsClient {
	d.mu.Lock()
	defer d.mu.Unlock()
	return d.credClient
}

// baseEnv is the environment of every child: the daemon's own, the runner's secret env, plus CA trust, identity
// variables and DISPLAY, which win over both.
func (d *Daemon) baseEnv() []string {
	d.mu.Lock()
	set := maps.Clone(d.req.GetEnv())
	owner := d.req.GetOwner()
	d.mu.Unlock()
	if set == nil {
		set = map[string]string{}
	}
	for k, v := range gitIdentityEnv(owner, filepath.Join(d.cfg.Home, ".gitconfig")) {
		if _, ok := set[k]; !ok {
			set[k] = v
		}
	}
	set["HOME"], set["DISPLAY"] = d.cfg.Home, d.cfg.Display
	for _, k := range scmTokenEnv {
		set[k] = harness.PlaceholderKey
	}
	if d.trustOK {
		for _, k := range trust.EnvVars {
			set[k] = d.cfg.TrustBundle()
		}
	}
	for _, kv := range d.creds.Env() {
		if k, v, ok := strings.Cut(kv, "="); ok {
			set[k] = v
		}
	}
	var env []string
	for _, kv := range os.Environ() {
		k, _, _ := strings.Cut(kv, "=")
		if _, ok := set[k]; ok {
			continue
		}
		env = append(env, kv)
	}
	for k, v := range set {
		env = append(env, k+"="+v)
	}
	return env
}

func (d *Daemon) playwrightCommand() string {
	if d.cfg.PlaywrightMCP != "" {
		return d.cfg.PlaywrightMCP
	}
	return d.image.PlaywrightMCP
}

func (d *Daemon) extraMCPServers() []any {
	cmd := d.playwrightCommand()
	if cmd == "" || !d.browser.Available() {
		return nil
	}
	if _, err := exec.LookPath(strings.Fields(cmd)[0]); err != nil {
		return nil
	}
	return []any{d.browser.PlaywrightMCP(cmd)}
}

// launcher fetches subscription credentials before a harness starts.
type launcher struct{ d *Daemon }

func (l launcher) Spec(launch *devboxv1.AgentLaunch, ep *devboxv1.HarnessEndpoints, bootModel string) (*harness.Spec, error) {
	if isCodexSubscription(launch.GetAgent(), launch.GetBilling()) && !l.d.creds.CodexInstalled() {
		ctx, cancel := context.WithTimeout(l.d.ctx, 30*time.Second)
		defer cancel()
		if err := l.d.creds.FetchCodex(ctx); err != nil {
			return nil, &agents.AgentCallError{Op: "codex credentials", Err: &devboxv1.AgentError{
				Message: "could not fetch the Codex subscription credential: " + err.Error(),
				Detail:  &devboxv1.ErrorDetail{Reason: devboxv1.ErrorReason_ERROR_REASON_AGENT_AUTH_FAILED}}}
		}
	}
	return l.d.harness.Spec(launch, ep, bootModel)
}

func isCodexSubscription(t devboxv1.AgentType, b devboxv1.BillingMode) bool {
	return t == devboxv1.AgentType_AGENT_TYPE_CODEX && b == devboxv1.BillingMode_BILLING_MODE_SUBSCRIPTION
}

func (d *Daemon) usesCodexSubscription() bool {
	l := d.agents.Launch(devboxv1.AgentType_AGENT_TYPE_CODEX)
	return isCodexSubscription(l.GetAgent(), l.GetBilling())
}

// ---- idle ----

func (d *Daemon) terminalJobs() []idle.TerminalJob {
	jobs := d.terms.Jobs()
	out := make([]idle.TerminalJob, 0, len(jobs))
	for _, j := range jobs {
		out = append(out, idle.TerminalJob{TerminalID: j.TerminalID, Command: j.Command, Pgid: j.Pgid})
	}
	return out
}

func (d *Daemon) streamActivity() map[string]time.Time {
	return map[string]time.Time{"terminal": d.terms.LastAttachedIO(), "browser": d.browser.LastActivity()}
}

// cpuSampler excludes the daemon and the processes it marks ExcludeFromIdle (the browser stack).
type cpuSampler struct {
	d     *Daemon
	inner *idle.ProcSampler
}

func (s *cpuSampler) Sample(now time.Time) (float64, map[int]float64) {
	ex := s.d.sup.ExcludedPids()
	self := os.Getpid()
	s.inner.Exclude = func(pid, pgid int) bool { return pid == self || ex[pid] || ex[pgid] }
	return s.inner.Sample(now)
}

func (d *Daemon) idleLoop(ctx context.Context) {
	t := d.cfg.Clock.NewTicker(idleInterval)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C():
			d.idle.Evaluate()
		}
	}
}

// restoreLoop detects memory restores: the wall clock jumps while the monotonic clock doesn't.
func (d *Daemon) restoreLoop(ctx context.Context) {
	prev := time.Now()
	t := time.NewTicker(restoreCheck)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case now := <-t.C:
			skew := now.Round(0).Sub(prev.Round(0)) - now.Sub(prev)
			prev = now
			if skew > restoreSkew {
				d.onRestore(skew)
			}
		}
	}
}

func (d *Daemon) onRestore(skew time.Duration) {
	d.log.Info("memory restore detected", "skew", skew.String())
	d.idle.Reset()
	d.home.reset(d.cfg.Clock.Now())
	d.mu.Lock()
	d.restored = true
	d.mu.Unlock()
	d.restoreCredentials()
}

func (d *Daemon) restoreCredentials() {
	codex := d.usesCodexSubscription()
	go func() {
		ctx, cancel := context.WithTimeout(d.ctx, time.Minute)
		defer cancel()
		if err := d.creds.Restore(ctx, codex); err != nil {
			d.log.Warn("credential restore", "err", err)
		}
	}()
}

// importJavaTrust adds the egress CA(s) to the JDK truststore when the image ships a JDK.
func (d *Daemon) importJavaTrust() {
	keytool := trust.Keytool()
	if keytool == "" || d.cfg.TrustDir == "" {
		return
	}
	store := d.cfg.JavaTrustStore()
	if _, err := os.Stat(store); err != nil {
		d.log.Warn("JDK present but no writable truststore; Java TLS through egress will fail", "store", store)
		return
	}
	n, err := trust.ImportJava(d.ctx, keytool, store, trust.Certificates(d.cfg.EgressCAGlobs))
	if err != nil {
		d.log.Warn("java truststore", "err", err)
		return
	}
	if n > 0 {
		d.log.Info("imported egress CA into java truststore", "certs", n, "store", store)
	}
}

func (d *Daemon) loginLoop(ctx context.Context) {
	t := time.NewTicker(loginCheck)
	defer t.Stop()
	for {
		d.creds.DetectInBoxLogins()
		select {
		case <-ctx.Done():
			return
		case <-t.C:
		}
	}
}

// ---- persisted state ----

func (d *Daemon) instancePath() string { return filepath.Join(d.cfg.StateDir, "instance.json") }
func (d *Daemon) catalogPath() string  { return filepath.Join(d.cfg.StateDir, "catalog.json") }

func (d *Daemon) loadInstance() error {
	var f instanceFile
	ok, err := fsutil.ReadJSON(d.instancePath(), &f)
	if err != nil || !ok {
		return err
	}
	req := &devboxv1.InitializeRequest{}
	if err := protojson.Unmarshal(f.Request, req); err != nil {
		return err
	}
	d.inst = f
	d.apply(req)
	return nil
}

func (d *Daemon) saveInstanceLocked() error {
	req := proto.Clone(d.req).(*devboxv1.InitializeRequest)
	req.Env = nil
	raw, err := protojson.Marshal(req)
	if err != nil {
		return err
	}
	d.inst.Request = raw
	return fsutil.WriteJSON(d.instancePath(), d.inst, 0o600)
}

func (d *Daemon) loadCatalog() {
	data, err := os.ReadFile(d.catalogPath())
	if err != nil {
		return
	}
	resp := &devboxv1.ProbeAgentsResponse{}
	if protojson.Unmarshal(data, resp) == nil {
		d.catalog = resp.GetAgents()
	}
}

func (d *Daemon) saveCatalog(entries []*devboxv1.AgentCatalogEntry) {
	data, err := protojson.Marshal(&devboxv1.ProbeAgentsResponse{Agents: entries})
	if err == nil {
		err = fsutil.WriteFileAtomic(d.catalogPath(), data, 0o600)
	}
	if err != nil {
		d.log.Warn("persist catalog", "err", err)
	}
}

// apply configures every subsystem from an Initialize request (also on restart from the persisted one).
func (d *Daemon) apply(req *devboxv1.InitializeRequest) {
	d.mu.Lock()
	d.req = req
	url := req.GetEndpoints().GetSandboxCredentialsUrl()
	if url != d.credURL {
		if d.credConn != nil {
			_ = d.credConn.Close()
		}
		d.credURL, d.credClient, d.credConn = url, nil, nil
		if url != "" {
			bundle := ""
			if d.trustOK {
				bundle = d.cfg.TrustBundle()
			}
			c, conn, err := creds.Dial(url, bundle)
			if err != nil {
				d.log.Error("sandbox credentials endpoint", "url", url, "err", err)
			} else {
				d.credClient, d.credConn = c, conn
			}
		}
	}
	d.mu.Unlock()

	if jwks := req.GetRequestTokenJwks(); len(jwks) > 0 {
		if err := d.verifier.SetJWKS(jwks, req.GetInstanceId()); err != nil {
			d.log.Error("request token jwks", "err", err)
		}
	}
	d.agents.Configure(req.GetInstanceId(), req.GetAgent(), req.GetModel(), req.GetConfigOptions(), req.GetAgents(),
		int(req.GetMaxRunningThreads()))
	d.agents.SetAutonomy(req.GetAutonomy())
	d.agents.SetDecisionReview(req.GetDecisionReview())
	d.idle.SetPolicy(idle.PolicyOf(req.GetIdlePolicy()))
	d.idle.SetLeases(req.GetLeases(), req.GetLeaseGeneration())
	if err := d.creds.SetIdentities(req.GetCloudIdentities()); err != nil {
		d.log.Error("cloud identities", "err", err)
	}
}

// hydrate clones the workspace and opens the first thread. It is idempotent: a restarted daemon re-runs it and
// skips what is done.
func (d *Daemon) hydrate(req *devboxv1.InitializeRequest) {
	d.setStatus(StatusHydrating)
	ctx := d.ctx
	status := StatusReady
	d.writeGitAuth()
	if err := d.ws.Hydrate(ctx, req.GetRepositories()); err != nil {
		d.log.Error("hydration", "err", err)
		status = StatusDegraded
	}
	d.mu.Lock()
	needThread := req.GetFirstThreadId() != "" && !d.inst.FirstThreadDone
	d.mu.Unlock()
	if needThread {
		_, err := d.agents.CreateThread(ctx, &devboxv1.CreateThreadRequest{InstanceId: req.GetInstanceId(),
			ThreadId: req.GetFirstThreadId(), Title: req.GetFirstThreadTitle(), Agent: req.GetAgent(),
			Model: req.GetModel(), ConfigOptions: req.GetConfigOptions(), CreatedBy: req.GetOwner()})
		if err != nil {
			d.log.Error("first thread", "err", err)
			d.condition("first_thread_failed", "error", err.Error(), true)
			status = StatusDegraded
		} else {
			d.mu.Lock()
			d.inst.FirstThreadDone = true
			if err := d.saveInstanceLocked(); err != nil {
				d.log.Warn("persist instance", "err", err)
			}
			d.mu.Unlock()
		}
	}
	d.setStatus(status)
}

func (d *Daemon) setStatus(s string) {
	d.mu.Lock()
	d.status = s
	d.mu.Unlock()
}

// health reports readiness, clearing the restore flag and refetching credentials scrubbed for a snapshot.
func (d *Daemon) health() *devboxv1.HealthResponse {
	d.mu.Lock()
	resp := &devboxv1.HealthResponse{Status: d.status, Version: d.cfg.Version, BootId: d.bootID,
		Restored: d.restored, WorkspaceHydrated: d.ws.Hydrated()}
	resp.Ready = d.status == StatusReady || d.status == StatusDegraded
	d.restored = false
	scrubbed := d.scrubbed
	d.scrubbed = false
	d.mu.Unlock()
	if scrubbed {
		d.restoreCredentials()
	}
	return resp
}

func (d *Daemon) info() *devboxv1.DaemonInfo {
	d.mu.Lock()
	catalog := d.catalog
	instance := d.req.GetInstanceId()
	d.mu.Unlock()
	contract := d.cfg.Contract
	if contract == "" {
		contract = d.image.Contract
	}
	if contract == "" {
		contract = "v1"
	}
	return &devboxv1.DaemonInfo{Version: d.cfg.Version, ContractVersion: contract, BootId: d.bootID,
		StartedAt: timestamppb.New(d.started), InstanceId: instance, Agents: catalog,
		Connections: d.agents.Connections(), HeadOffset: d.events.Head(), AckedOffset: d.events.Acked()}
}
