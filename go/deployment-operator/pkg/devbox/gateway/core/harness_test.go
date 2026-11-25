package core

import (
	"context"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
	"google.golang.org/grpc/test/bufconn"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/actors"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/actors/actorstest"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/egress"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate/ateapi"
)

const (
	testAtespace = "ates-1"
	testRunner   = "box"
)

// ---- fake daemon ----

type fakeDaemon struct {
	devboxv1.UnimplementedDaemonServer

	mu          sync.Mutex
	initialized []*devboxv1.InitializeRequest
	prompts     []*devboxv1.PromptRequest
	subscribes  []uint64
	acks        []uint64
	leases      []*devboxv1.SetInstanceLeasesRequest
	prepares    []*devboxv1.PrepareSuspendRequest
	tokens      []string
	targets     []string
	timelines   []*devboxv1.GetTimelineRequest
	// acked is what GetInfo reports; AckEvents advances it.
	acked  uint64
	bootID string
	// unhealthy makes Health fail, like a wedged box.
	unhealthy bool
	// busy makes PrepareSuspend refuse automatic suspends, as a daemon with an agent turn running does.
	busy bool

	events   chan *devboxv1.DaemonEvent
	breakSub chan struct{}
	settled  uint64
	// onPrepare runs inside PrepareSuspend, before it returns settled.
	onPrepare func()
	onAck     func(offset uint64)
}

func newFakeDaemon() *fakeDaemon {
	return &fakeDaemon{events: make(chan *devboxv1.DaemonEvent, 256), breakSub: make(chan struct{}, 1), bootID: "boot-1"}
}

func (d *fakeDaemon) note(ctx context.Context) {
	md, _ := metadata.FromIncomingContext(ctx)
	d.mu.Lock()
	defer d.mu.Unlock()
	if v := md.Get(devboxv1.RequestTokenMetadataKey); len(v) > 0 {
		d.tokens = append(d.tokens, v[0])
	}
	if v := md.Get("ate-target-actor"); len(v) > 0 {
		d.targets = append(d.targets, v[0])
	}
}

func (d *fakeDaemon) Health(context.Context, *devboxv1.HealthRequest) (*devboxv1.HealthResponse, error) {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.unhealthy {
		return nil, status.Error(codes.Unavailable, "daemon unreachable")
	}
	if len(d.initialized) == 0 {
		return &devboxv1.HealthResponse{Status: "booting"}, nil
	}
	return &devboxv1.HealthResponse{Ready: true, Status: "ready"}, nil
}

func (d *fakeDaemon) Initialize(ctx context.Context, req *devboxv1.InitializeRequest) (*devboxv1.InitializeResponse, error) {
	d.note(ctx)
	d.mu.Lock()
	defer d.mu.Unlock()
	d.initialized = append(d.initialized, req)
	return &devboxv1.InitializeResponse{AlreadyInitialized: len(d.initialized) > 1}, nil
}

func (d *fakeDaemon) Prompt(ctx context.Context, req *devboxv1.PromptRequest) (*devboxv1.PromptResponse, error) {
	d.note(ctx)
	d.mu.Lock()
	defer d.mu.Unlock()
	d.prompts = append(d.prompts, req)
	return &devboxv1.PromptResponse{PromptId: req.GetPromptId(), Disposition: devboxv1.PromptDisposition_PROMPT_DISPOSITION_SENT}, nil
}

func (d *fakeDaemon) ListThreads(context.Context, *devboxv1.ListThreadsRequest) (*devboxv1.ListThreadsResponse, error) {
	return &devboxv1.ListThreadsResponse{Threads: []*devboxv1.Session{{ThreadId: "live", SessionId: "live"}}}, nil
}

func (d *fakeDaemon) CreateTerminal(_ context.Context, req *devboxv1.CreateTerminalRequest) (*devboxv1.TerminalInfo, error) {
	id := req.GetTerminalId()
	if id == "" {
		id = "t1"
	}
	return &devboxv1.TerminalInfo{TerminalId: id}, nil
}

func (d *fakeDaemon) PrepareSuspend(_ context.Context, req *devboxv1.PrepareSuspendRequest) (*devboxv1.PrepareSuspendResponse, error) {
	d.mu.Lock()
	d.prepares = append(d.prepares, req)
	hook, settled, busy := d.onPrepare, d.settled, d.busy
	d.mu.Unlock()
	if hook != nil {
		hook()
	}
	if busy && req.GetReason() != devboxv1.SuspendReason_SUSPEND_REASON_USER {
		return nil, status.Error(codes.FailedPrecondition, "agent running: agent_turn fix the build")
	}
	return &devboxv1.PrepareSuspendResponse{SettledOffset: settled}, nil
}

func (d *fakeDaemon) SubscribeEvents(req *devboxv1.SubscribeEventsRequest, stream devboxv1.Daemon_SubscribeEventsServer) error {
	d.mu.Lock()
	d.subscribes = append(d.subscribes, req.GetFromOffset())
	d.mu.Unlock()
	for {
		select {
		case <-stream.Context().Done():
			return nil
		case <-d.breakSub:
			return context.Canceled
		case ev := <-d.events:
			if err := stream.Send(ev); err != nil {
				return err
			}
		}
	}
}

func (d *fakeDaemon) GetInfo(context.Context, *devboxv1.GetInfoRequest) (*devboxv1.DaemonInfo, error) {
	d.mu.Lock()
	defer d.mu.Unlock()
	return &devboxv1.DaemonInfo{AckedOffset: d.acked, BootId: d.bootID}, nil
}

func (d *fakeDaemon) GetTimeline(_ context.Context, req *devboxv1.GetTimelineRequest) (*devboxv1.GetTimelineResponse, error) {
	d.mu.Lock()
	defer d.mu.Unlock()
	d.timelines = append(d.timelines, req)
	return &devboxv1.GetTimelineResponse{Entities: []*devboxv1.AcpEntity{entity(req.GetSessionId(), "m1", 1, 1, "hello")}, NextPosition: 1, DeltaOffset: d.acked}, nil
}

func (d *fakeDaemon) GetSessions(context.Context, *devboxv1.GetSessionsRequest) (*devboxv1.GetSessionsResponse, error) {
	return &devboxv1.GetSessionsResponse{
		Sessions:    []*devboxv1.Session{{ThreadId: "th-1", SessionId: "s1"}},
		Connections: []*devboxv1.AgentConnection{{State: "running"}},
	}, nil
}

func (d *fakeDaemon) AckEvents(_ context.Context, req *devboxv1.AckEventsRequest) (*devboxv1.AckEventsResponse, error) {
	d.mu.Lock()
	d.acks = append(d.acks, req.GetOffset())
	d.acked = max(d.acked, req.GetOffset())
	hook := d.onAck
	d.mu.Unlock()
	if hook != nil {
		hook(req.GetOffset())
	}
	return &devboxv1.AckEventsResponse{AckedOffset: req.GetOffset()}, nil
}

func (d *fakeDaemon) SetLeases(_ context.Context, req *devboxv1.SetInstanceLeasesRequest) (*devboxv1.SetInstanceLeasesResponse, error) {
	d.mu.Lock()
	defer d.mu.Unlock()
	d.leases = append(d.leases, req)
	return &devboxv1.SetInstanceLeasesResponse{Leases: req.GetLeases(), Idle: &devboxv1.IdleState{Idle: false}}, nil
}

func (d *fakeDaemon) snapshot() (inits, prompts int, subs, acks []uint64) {
	d.mu.Lock()
	defer d.mu.Unlock()
	return len(d.initialized), len(d.prompts), append([]uint64(nil), d.subscribes...), append([]uint64(nil), d.acks...)
}

// ---- fake router ----

type fakeRouter struct {
	conn    *grpc.ClientConn
	baseURL string
	rt      http.RoundTripper
}

func (r *fakeRouter) Daemon(actor string) devboxv1.DaemonClient {
	return devboxv1.NewDaemonClient(&targetConn{conn: r.conn, actor: actor})
}

func (r *fakeRouter) NewRequest(ctx context.Context, actor, method, pathAndQuery string) (*http.Request, error) {
	req, err := http.NewRequestWithContext(ctx, method, r.baseURL+pathAndQuery, http.NoBody)
	if err != nil {
		return nil, err
	}
	req.Header.Set("ate-target-actor", actor)
	return req, nil
}

func (r *fakeRouter) RoundTrip(req *http.Request) (*http.Response, error) { return r.rt.RoundTrip(req) }

type targetConn struct {
	conn  *grpc.ClientConn
	actor string
}

func (c *targetConn) ctx(ctx context.Context) context.Context {
	ctx = metadata.AppendToOutgoingContext(ctx, "ate-target-actor", c.actor)
	if in, ok := metadata.FromIncomingContext(ctx); ok {
		if tok := in.Get(devboxv1.RequestTokenMetadataKey); len(tok) > 0 {
			ctx = metadata.AppendToOutgoingContext(ctx, devboxv1.RequestTokenMetadataKey, tok[0])
		}
	}
	return ctx
}

func (c *targetConn) Invoke(ctx context.Context, method string, args, reply any, opts ...grpc.CallOption) error {
	return c.conn.Invoke(c.ctx(ctx), method, args, reply, opts...)
}

func (c *targetConn) NewStream(ctx context.Context, desc *grpc.StreamDesc, method string, opts ...grpc.CallOption) (grpc.ClientStream, error) {
	return c.conn.NewStream(c.ctx(ctx), desc, method, opts...)
}

// ---- fake ingest ----

type fakeIngest struct {
	devboxv1.IngestClient

	mu        sync.Mutex
	log       []string
	statuses  []*devboxv1.ReportInstanceStatusRequest
	snapshots []*devboxv1.ReportSnapshotRequest
	indexes   []*devboxv1.UpsertInstanceIndexRequest
	deltas    []*devboxv1.Delta
	creds     []*devboxv1.GetInstanceCredentialsRequest
	updates   []*devboxv1.UpdateAgentCredentialRequest
	heartbeat []*devboxv1.HeartbeatRequest
	register  *devboxv1.RegisterGatewayResponse
	unknown   []string
	// scmHosts answer SCM connection lookups (an SCM selector without host), one credential per host.
	scmHosts   []string
	scmLookups int
}

func (f *fakeIngest) record(s string) {
	f.log = append(f.log, s)
}

func (f *fakeIngest) RegisterGateway(context.Context, *devboxv1.RegisterGatewayRequest, ...grpc.CallOption) (*devboxv1.RegisterGatewayResponse, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.record("register")
	if f.register != nil {
		return f.register, nil
	}
	return &devboxv1.RegisterGatewayResponse{ClusterId: "cluster-1", HeartbeatIntervalSeconds: 1}, nil
}

func (f *fakeIngest) Heartbeat(_ context.Context, req *devboxv1.HeartbeatRequest, _ ...grpc.CallOption) (*devboxv1.HeartbeatResponse, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.heartbeat = append(f.heartbeat, req)
	return &devboxv1.HeartbeatResponse{UnknownInstanceIds: f.unknown}, nil
}

func (f *fakeIngest) ReportInstanceStatus(_ context.Context, req *devboxv1.ReportInstanceStatusRequest, _ ...grpc.CallOption) (*devboxv1.ReportInstanceStatusResponse, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.record("status:" + req.GetStatus().String())
	f.statuses = append(f.statuses, req)
	return &devboxv1.ReportInstanceStatusResponse{Status: req.GetStatus()}, nil
}

func (f *fakeIngest) ReportSnapshot(_ context.Context, req *devboxv1.ReportSnapshotRequest, _ ...grpc.CallOption) (*devboxv1.ReportSnapshotResponse, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.snapshots = append(f.snapshots, req)
	return &devboxv1.ReportSnapshotResponse{}, nil
}

func (f *fakeIngest) UpsertInstanceIndex(_ context.Context, req *devboxv1.UpsertInstanceIndexRequest, _ ...grpc.CallOption) (*devboxv1.UpsertInstanceIndexResponse, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.record("index")
	f.indexes = append(f.indexes, req)
	return &devboxv1.UpsertInstanceIndexResponse{}, nil
}

func (f *fakeIngest) PushInstanceDeltas(_ context.Context, req *devboxv1.PushInstanceDeltasRequest, _ ...grpc.CallOption) (*devboxv1.PushInstanceDeltasResponse, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.deltas = append(f.deltas, req.GetDeltas()...)
	return &devboxv1.PushInstanceDeltasResponse{}, nil
}

func (f *fakeIngest) GetInstanceCredentials(_ context.Context, req *devboxv1.GetInstanceCredentialsRequest, _ ...grpc.CallOption) (*devboxv1.GetInstanceCredentialsResponse, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if sels := req.GetCredentials(); len(sels) == 1 && sels[0].GetKind() == devboxv1.CredentialKind_CREDENTIAL_KIND_SCM {
		f.scmLookups++
		var out []*devboxv1.InstanceCredential
		for _, h := range f.scmHosts {
			out = append(out, &devboxv1.InstanceCredential{Kind: devboxv1.CredentialKind_CREDENTIAL_KIND_SCM, Host: h, Token: "scm"})
		}
		return &devboxv1.GetInstanceCredentialsResponse{Credentials: out}, nil
	}
	f.creds = append(f.creds, req)
	return &devboxv1.GetInstanceCredentialsResponse{Credentials: []*devboxv1.InstanceCredential{{Kind: devboxv1.CredentialKind_CREDENTIAL_KIND_CODEX, CredentialId: "cred-1", Version: 3}}}, nil
}

func (f *fakeIngest) UpdateAgentCredential(_ context.Context, req *devboxv1.UpdateAgentCredentialRequest, _ ...grpc.CallOption) (*devboxv1.UpdateAgentCredentialResponse, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.updates = append(f.updates, req)
	return &devboxv1.UpdateAgentCredentialResponse{Applied: true}, nil
}

func (f *fakeIngest) statusList() []string {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := make([]string, 0, len(f.statuses))
	for _, s := range f.statuses {
		out = append(out, strings.TrimPrefix(s.GetStatus().String(), "INSTANCE_STATUS_"))
	}
	return out
}

func (f *fakeIngest) lastStatus() *devboxv1.ReportInstanceStatusRequest {
	f.mu.Lock()
	defer f.mu.Unlock()
	if len(f.statuses) == 0 {
		return nil
	}
	return f.statuses[len(f.statuses)-1]
}

// ---- harness ----

type fakeEgress struct {
	mu          sync.Mutex
	invalidated []string
}

func (e *fakeEgress) Invalidate(id string) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.invalidated = append(e.invalidated, id)
}

type harness struct {
	t       *testing.T
	g       *Gateway
	ate     *actorstest.Server
	daemon  *fakeDaemon
	ingest  *fakeIngest
	records *MemoryRecords
	egress  *fakeEgress
	http    *httptest.Server
	clock   *clock
}

type clock struct {
	mu  sync.Mutex
	off time.Duration
}

func (c *clock) now() time.Time {
	c.mu.Lock()
	defer c.mu.Unlock()
	return time.Now().Add(c.off)
}

func (c *clock) advance(d time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.off += d
}

func testRunners() StaticRunners {
	return StaticRunners{testRunner: {
		Name:      testRunner,
		Atespace:  testAtespace,
		Template:  "tmpl-r2",
		Revision:  2,
		GoldenTag: "golden-r2",
		Revisions: map[int64]RunnerRevision{
			1: {Template: "tmpl-r1", GoldenTag: "golden-r1"},
			2: {Template: "tmpl-r2", GoldenTag: "golden-r2"},
		},
		HTTPAllowlist: []egress.AllowEntry{{Host: "pypi.org"}},
		Env:           map[string]string{"API_KEY": "s3cret"},
	}}
}

func newHarness(t *testing.T, handler http.Handler) *harness {
	t.Helper()
	h := &harness{t: t, ate: actorstest.New(), daemon: newFakeDaemon(), ingest: &fakeIngest{}, egress: &fakeEgress{}, clock: &clock{}}

	lis := bufconn.Listen(1 << 20)
	srv := grpc.NewServer()
	devboxv1.RegisterDaemonServer(srv, h.daemon)
	go func() { _ = srv.Serve(lis) }()
	conn, err := grpc.NewClient("passthrough:///daemon",
		grpc.WithContextDialer(func(ctx context.Context, _ string) (net.Conn, error) { return lis.DialContext(ctx) }),
		grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		t.Fatal(err)
	}
	if handler == nil {
		handler = http.NotFoundHandler()
	}
	h.http = httptest.NewServer(handler)

	h.records = &MemoryRecords{}
	h.g, err = New(Config{
		ConsoleURL:          "https://console.example.com",
		AIProxyURL:          "https://console.example.com/ext/ai",
		GatewayURL:          "http://devbox-gateway.ns.svc:8080",
		ReadyTimeout:        5 * time.Second,
		PrepareTimeout:      2 * time.Second,
		DrainTimeout:        2 * time.Second,
		FlushInterval:       10 * time.Millisecond,
		DeltaInterval:       5 * time.Millisecond,
		RegistrationBackoff: 10 * time.Millisecond,
	}, Deps{
		Ingest:  h.ingest,
		Actors:  actors.New(ateapi.NewControlClient(h.ate.Dial(t))).WithPollInterval(5 * time.Millisecond),
		Router:  &fakeRouter{conn: conn, baseURL: h.http.URL, rt: http.DefaultTransport},
		Records: h.records,
		Runners: testRunners(),
		Egress:  h.egress,
		Now:     h.clock.now,
	})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		h.g.Shutdown()
		_ = conn.Close()
		srv.Stop()
		h.http.Close()
	})
	return h
}

func (h *harness) eventually(what string, cond func() bool) {
	h.t.Helper()
	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		if cond() {
			return
		}
		time.Sleep(5 * time.Millisecond)
	}
	h.t.Fatalf("timed out waiting for %s", what)
}

// running creates an instance and waits until it runs with its forwarder subscribed.
func (h *harness) running(id string) *Instance {
	h.t.Helper()
	_, err := h.g.CreateInstance(context.Background(), &devboxv1.CreateInstanceRequest{
		InstanceId:          id,
		DevboxId:            "box-1",
		RunnerName:          testRunner,
		Owner:               &devboxv1.Principal{UserId: "user-1"},
		Agents:              []*devboxv1.AgentLaunch{{Agent: devboxv1.AgentType_AGENT_TYPE_CLAUDE, Billing: devboxv1.BillingMode_BILLING_MODE_PROXY}},
		AllowedRepositories: []string{"https://github.com/pluralsh/console"},
	})
	if err != nil {
		h.t.Fatal(err)
	}
	inst := h.g.get(id)
	h.eventually("instance running", func() bool { return inst.status() == devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING })
	h.eventually("forwarder subscribed", func() bool {
		_, _, subs, _ := h.daemon.snapshot()
		return len(subs) > 0
	})
	return inst
}
