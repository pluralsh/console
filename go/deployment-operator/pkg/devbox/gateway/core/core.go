// Package core is the devbox gateway proper (sections 4.6 to 4.6b): it serves devbox.v1.Gateway through the KAS
// tunnel, drives instance lifecycles on Substrate, forwards daemon events to console, proxies history reads to the
// box that holds the transcript, executes suspends and backstops, and resolves actors for the egress package.
package core

import (
	"context"
	"errors"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/go-logr/logr"
	"google.golang.org/grpc"
	"google.golang.org/protobuf/types/known/durationpb"
	"google.golang.org/protobuf/types/known/timestamppb"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/actors"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/egress"
)

// Router reaches daemons through atenet-router (see package router).
type Router interface {
	Daemon(actor string) devboxv1.DaemonClient
	NewRequest(ctx context.Context, actor, method, pathAndQuery string) (*http.Request, error)
	RoundTrip(req *http.Request) (*http.Response, error)
}

// Egress is what the core needs from the egress package.
type Egress interface {
	Invalidate(instanceID string)
}

// CredentialService verifies sandbox callers and serves cached OIDC credentials (egress.Service).
type CredentialService interface {
	VerifyActorJWT(ctx context.Context, raw string) (*egress.Caller, error)
	InstanceCredential(ctx context.Context, instanceID string, sel *devboxv1.CredentialSelector) (*devboxv1.InstanceCredential, error)
}

// Config tunes the core. Zero values take the defaults below.
type Config struct {
	GatewayID        string
	Version          string
	SubstrateVersion string
	// ClusterID is the console cluster, used until RegisterGateway reports it.
	ClusterID string
	// CredentialProviderRegistered and EgressAuthzRegistered are reported on registration.
	CredentialProviderRegistered bool
	EgressAuthzRegistered        bool

	// Harness endpoints handed to daemons in Initialize.
	ConsoleURL string
	AIProxyURL string
	// WorkbenchMCPURL is the base of console's workbench MCP; each instance gets <base>/<workbench-id>.
	WorkbenchMCPURL string
	// GatewayURL is where sandboxes reach the gateway's devbox MCP (GatewayURL + /mcp) and SandboxCredentials
	// (GatewayURL), through egress which injects the actor JWT.
	GatewayURL string
	// RequestTokenJWKS is passed to daemons to validate devbox-request-token. Empty disables validation.
	RequestTokenJWKS []byte

	HeartbeatInterval   time.Duration
	ReadyTimeout        time.Duration
	PrepareTimeout      time.Duration
	DrainTimeout        time.Duration
	SnapshotTimeout     time.Duration
	FlushInterval       time.Duration
	MaxBatch            int
	DeltaInterval       time.Duration
	MaxDeltaBatch       int
	BackstopInterval    time.Duration
	EvictionInterval    time.Duration
	UnresponsiveAfter   time.Duration
	StreamTokenTTL      time.Duration
	RegistrationBackoff time.Duration
}

func (c *Config) defaults() {
	set := func(d *time.Duration, v time.Duration) {
		if *d <= 0 {
			*d = v
		}
	}
	set(&c.HeartbeatInterval, 30*time.Second)
	set(&c.ReadyTimeout, 5*time.Minute)
	set(&c.PrepareTimeout, 30*time.Second)
	set(&c.DrainTimeout, 30*time.Second)
	set(&c.SnapshotTimeout, 30*time.Minute)
	set(&c.FlushInterval, 250*time.Millisecond)
	set(&c.DeltaInterval, 50*time.Millisecond)
	set(&c.BackstopInterval, 30*time.Second)
	set(&c.EvictionInterval, 15*time.Second)
	set(&c.UnresponsiveAfter, 5*time.Minute)
	set(&c.StreamTokenTTL, time.Minute)
	set(&c.RegistrationBackoff, 2*time.Second)
	if c.MaxBatch <= 0 {
		c.MaxBatch = 256
	}
	if c.MaxDeltaBatch <= 0 {
		c.MaxDeltaBatch = 128
	}
	if c.GatewayID == "" {
		c.GatewayID = "devbox-gateway"
	}
}

// Deps are the core's collaborators.
type Deps struct {
	Ingest  devboxv1.IngestClient
	Actors  *actors.Client
	Router  Router
	Records Records
	Runners Runners
	// Egress is optional; when set, instance changes invalidate its caches.
	Egress Egress
	// Credentials is optional; SandboxCredentials needs it.
	Credentials CredentialService
	Log         logr.Logger
	Now         func() time.Time
}

// Gateway is the core.
type Gateway struct {
	devboxv1.UnimplementedGatewayServer

	cfg  Config
	deps Deps
	log  logr.Logger
	now  func() time.Time

	// ctx bounds background work (provisioning, snapshots, forwarders); set by Run.
	ctx    context.Context
	cancel context.CancelFunc
	wg     sync.WaitGroup

	mu        sync.RWMutex
	instances map[string]*Instance
	byActor   map[string]*Instance
	clusterID string

	genMu   sync.Mutex
	lastGen uint64

	streams *streamRegistry

	evictionDisabled bool
}

// New builds a Gateway. Call Run to start its background loops.
func New(cfg Config, deps Deps) (*Gateway, error) {
	cfg.defaults()
	if deps.Ingest == nil || deps.Actors == nil || deps.Router == nil || deps.Records == nil || deps.Runners == nil {
		return nil, errors.New("core: Ingest, Actors, Router, Records and Runners are required")
	}
	if deps.Log.GetSink() == nil {
		deps.Log = logr.Discard()
	}
	if deps.Now == nil {
		deps.Now = time.Now
	}
	ctx, cancel := context.WithCancel(context.Background())
	return &Gateway{
		cfg:       cfg,
		deps:      deps,
		log:       deps.Log,
		now:       deps.Now,
		ctx:       ctx,
		cancel:    cancel,
		instances: map[string]*Instance{},
		byActor:   map[string]*Instance{},
		clusterID: cfg.ClusterID,
		streams:   newStreamRegistry(),
	}, nil
}

// UseEgress wires the egress service, which itself needs the Gateway as its actor resolver. Call it before Run.
func (g *Gateway) UseEgress(e Egress, c CredentialService) {
	g.deps.Egress = e
	g.deps.Credentials = c
}

// Register adds the Gateway service to a gRPC server (the tunnel's in-process server).
func (g *Gateway) Register(s grpc.ServiceRegistrar) {
	devboxv1.RegisterGatewayServer(s, g)
}

// Run runs registration, heartbeats, backstops and eviction polling until ctx is done, then stops event
// forwarders and waits for background operations.
func (g *Gateway) Run(ctx context.Context) error {
	var wg sync.WaitGroup
	loops := []func(context.Context){g.runIngest, g.runBackstops, g.runEvictionWatch}
	for _, loop := range loops {
		wg.Add(1)
		go func() {
			defer wg.Done()
			loop(ctx)
		}()
	}
	<-ctx.Done()
	wg.Wait()
	g.Shutdown()
	return nil
}

// Shutdown stops forwarders and background operations. Instances keep running on Substrate.
func (g *Gateway) Shutdown() {
	g.cancel()
	for _, inst := range g.list() {
		inst.stopForwarder()
	}
	g.wg.Wait()
}

func (g *Gateway) goBackground(fn func(ctx context.Context)) {
	g.wg.Add(1)
	go func() {
		defer g.wg.Done()
		fn(g.ctx)
	}()
}

// ---- registry ----

func (g *Gateway) get(id string) *Instance {
	g.mu.RLock()
	defer g.mu.RUnlock()
	return g.instances[id]
}

func (g *Gateway) list() []*Instance {
	g.mu.RLock()
	defer g.mu.RUnlock()
	out := make([]*Instance, 0, len(g.instances))
	for _, i := range g.instances {
		out = append(out, i)
	}
	return out
}

// CountByStatus counts managed instances in a status (metrics).
func (g *Gateway) CountByStatus(st devboxv1.InstanceStatus) int {
	n := 0
	for _, inst := range g.list() {
		if inst.status() == st {
			n++
		}
	}
	return n
}

func (g *Gateway) add(inst *Instance) *Instance {
	g.mu.Lock()
	defer g.mu.Unlock()
	if cur, ok := g.instances[inst.ID]; ok {
		return cur
	}
	g.instances[inst.ID] = inst
	g.byActor[inst.ActorID()] = inst
	return inst
}

func (g *Gateway) remove(inst *Instance) {
	g.mu.Lock()
	defer g.mu.Unlock()
	if g.instances[inst.ID] == inst {
		delete(g.instances, inst.ID)
		delete(g.byActor, inst.ActorID())
	}
}

func (g *Gateway) byActorID(actorID string) *Instance {
	g.mu.RLock()
	defer g.mu.RUnlock()
	return g.byActor[actorID]
}

func (g *Gateway) cluster() string {
	g.mu.RLock()
	defer g.mu.RUnlock()
	return g.clusterID
}

// nextGeneration orders status reports across restarts: nanosecond timestamps, strictly increasing.
func (g *Gateway) nextGeneration() uint64 {
	g.genMu.Lock()
	defer g.genMu.Unlock()
	n := uint64(g.now().UnixNano())
	if n <= g.lastGen {
		n = g.lastGen + 1
	}
	g.lastGen = n
	return n
}

// ---- status reporting ----

type statusUpdate struct {
	status  devboxv1.InstanceStatus
	reason  devboxv1.SuspendReason
	message string
	err     *devboxv1.ErrorDetail
}

// setStatus records a status, persists the instance record and reports to console.
func (g *Gateway) setStatus(ctx context.Context, inst *Instance, u statusUpdate) {
	now := g.now()
	inst.mu.Lock()
	// idleness is the awake daemon's: it doesn't outlive a suspend, and a resumed daemon reports its own
	if !awake(inst.rec.status()) || !awake(u.status) {
		inst.idle = nil
	}
	inst.rec.Status = u.status.String()
	inst.rec.SuspendReason = ""
	if u.status == devboxv1.InstanceStatus_INSTANCE_STATUS_SUSPENDED {
		inst.rec.SuspendReason = u.reason.String()
		inst.rec.SuspendedAt = now
	}
	if u.status == devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING {
		inst.awakeSince = now
		inst.lastContact = now
	}
	inst.rec.Message = u.message
	inst.rec.UpdatedAt = now
	rec := inst.rec
	idle := inst.idle
	inst.mu.Unlock()

	if err := g.persist(ctx, &rec); err != nil {
		g.log.Error(err, "persisting instance record", "instance", inst.ID)
	}
	g.report(ctx, &devboxv1.ReportInstanceStatusRequest{
		InstanceId:       inst.ID,
		Status:           u.status,
		SuspendReason:    u.reason,
		Message:          u.message,
		Error:            u.err,
		ActorId:          rec.ActorID(),
		ImageDigest:      rec.ImageDigest,
		TemplateRevision: rec.TemplateRevision,
		Idle:             idle,
	})
}

func (g *Gateway) report(ctx context.Context, req *devboxv1.ReportInstanceStatusRequest) {
	req.ObservedAt = timestamppb.New(g.now())
	req.Generation = g.nextGeneration()
	for attempt := range 3 {
		rctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 10*time.Second)
		_, err := g.deps.Ingest.ReportInstanceStatus(rctx, req)
		cancel()
		if err == nil {
			return
		}
		g.log.Error(err, "reporting instance status", "instance", req.GetInstanceId(), "status", req.GetStatus(), "attempt", attempt+1)
		time.Sleep(time.Duration(attempt+1) * 200 * time.Millisecond)
	}
}

func (g *Gateway) persist(ctx context.Context, rec *Record) error {
	return g.deps.Records.Put(context.WithoutCancel(ctx), rec)
}

func (g *Gateway) loadRecord(ctx context.Context, id string) (*Record, error) {
	return g.deps.Records.Get(ctx, id)
}

// ---- helpers ----

var nonName = regexp.MustCompile(`[^a-z0-9-]+`)

// ActorName is the Substrate actor name of an instance: a DNS label derived from the instance ID.
func ActorName(instanceID string) string {
	n := "dbx-" + strings.Trim(nonName.ReplaceAllString(strings.ToLower(instanceID), "-"), "-")
	if len(n) > 63 {
		n = strings.TrimRight(n[:63], "-")
	}
	return n
}

// SnapshotTagName is the Substrate tag of a snapshot.
func SnapshotTagName(snapshotID string) string {
	n := "snap-" + strings.Trim(nonName.ReplaceAllString(strings.ToLower(snapshotID), "-"), "-")
	if len(n) > 63 {
		n = strings.TrimRight(n[:63], "-")
	}
	return n
}

func hostOf(raw string) string {
	if raw == "" {
		return ""
	}
	if !strings.Contains(raw, "://") {
		raw = "https://" + raw
	}
	u, err := url.Parse(raw)
	if err != nil {
		return ""
	}
	return u.Hostname()
}

// IdlePolicy defaults (section 4.6a).
var defaultIdlePolicy = &devboxv1.IdlePolicy{
	ActivityWindow:      durationpb.New(2 * time.Minute),
	CpuThresholdPercent: 5,
	GracePeriod:         durationpb.New(5 * time.Minute),
	MaxDeferral:         durationpb.New(12 * time.Hour),
	MaxContinuousAwake:  durationpb.New(24 * time.Hour),
	CompleteAfter:       durationpb.New(14 * 24 * time.Hour),
}

func policyDuration(p *devboxv1.IdlePolicy, get func(*devboxv1.IdlePolicy) *durationpb.Duration) time.Duration {
	if d := get(p); d != nil && d.AsDuration() > 0 {
		return d.AsDuration()
	}
	return get(defaultIdlePolicy).AsDuration()
}
