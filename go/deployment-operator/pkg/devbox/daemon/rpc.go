package daemon

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/timestamppb"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/agents"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/authn"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/derr"
)

// ---- interceptors ----

type instanceScoped interface{ GetInstanceId() string }
type threadScoped interface{ GetThread() *devboxv1.ThreadRef }

func tokenOf(ctx context.Context) string {
	md, _ := metadata.FromIncomingContext(ctx)
	if v := md.Get(devboxv1.RequestTokenMetadataKey); len(v) > 0 {
		return v[0]
	}
	return ""
}

// authorize validates the request token. Before Initialize delivered keys, every call is accepted (the
// atenet-router's mTLS and actor targeting are the primary control); Health never needs a token.
func (d *Daemon) authorize(ctx context.Context, method string) error {
	if method == devboxv1.Daemon_Health_FullMethodName || method == devboxv1.Daemon_Initialize_FullMethodName {
		return nil
	}
	return d.checkToken(tokenOf(ctx))
}

func (d *Daemon) checkToken(token string) error {
	if d.cfg.InsecureNoAuth || !d.verifier.Configured() {
		return nil
	}
	if token == "" {
		return status.Error(codes.Unauthenticated, "missing "+devboxv1.RequestTokenMetadataKey)
	}
	if _, err := d.verifier.Verify(token); err != nil {
		return status.Error(codes.Unauthenticated, "invalid request token: "+err.Error())
	}
	return nil
}

// checkInstance rejects requests addressed to another instance.
func (d *Daemon) checkInstance(req any) error {
	want := d.instanceID()
	if want == "" {
		return nil
	}
	got := ""
	if r, ok := req.(instanceScoped); ok {
		got = r.GetInstanceId()
	}
	if r, ok := req.(threadScoped); ok && got == "" {
		got = r.GetThread().GetInstanceId()
	}
	if got != "" && got != want {
		return derr.New(codes.FailedPrecondition, devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED,
			"request is for instance "+got+", this sandbox runs "+want, nil)
	}
	return nil
}

func (d *Daemon) unary(ctx context.Context, req any, info *grpc.UnaryServerInfo, h grpc.UnaryHandler) (any, error) {
	if err := d.authorize(ctx, info.FullMethod); err != nil {
		return nil, err
	}
	if info.FullMethod != devboxv1.Daemon_Initialize_FullMethodName {
		if err := d.checkInstance(req); err != nil {
			return nil, err
		}
	}
	resp, err := h(ctx, req)
	if err != nil {
		err = agents.ToStatus(err)
		if _, ok := status.FromError(err); !ok {
			err = status.Error(codes.Internal, err.Error())
		}
		d.log.Debug("rpc failed", "method", info.FullMethod, "err", err)
	}
	return resp, err
}

func (d *Daemon) stream(srv any, ss grpc.ServerStream, info *grpc.StreamServerInfo, h grpc.StreamHandler) error {
	if err := d.authorize(ss.Context(), info.FullMethod); err != nil {
		return err
	}
	return agents.ToStatus(h(srv, ss))
}

// ---- lifecycle ----

func (d *Daemon) Health(context.Context, *devboxv1.HealthRequest) (*devboxv1.HealthResponse, error) {
	return d.health(), nil
}

func (d *Daemon) Initialize(ctx context.Context, req *devboxv1.InitializeRequest) (*devboxv1.InitializeResponse, error) {
	if req.GetInstanceId() == "" {
		return nil, status.Error(codes.InvalidArgument, "instance_id is required")
	}
	if err := d.checkInitializeToken(tokenOf(ctx), req); err != nil {
		return nil, err
	}
	d.initMu.Lock()
	defer d.initMu.Unlock()

	d.mu.Lock()
	prev := d.req
	d.mu.Unlock()
	if prev != nil && prev.GetInstanceId() == req.GetInstanceId() {
		// Restarted or restored: keep the workspace, threads and log; apply lease and endpoint changes.
		merged := proto.Clone(prev).(*devboxv1.InitializeRequest)
		merged.Endpoints = req.GetEndpoints()
		merged.Env = req.GetEnv()
		merged.Leases, merged.LeaseGeneration = req.GetLeases(), req.GetLeaseGeneration()
		if len(req.GetRequestTokenJwks()) > 0 {
			merged.RequestTokenJwks = req.GetRequestTokenJwks()
		}
		if req.GetIdlePolicy() != nil {
			merged.IdlePolicy = req.GetIdlePolicy()
		}
		if len(req.GetCloudIdentities()) > 0 {
			merged.CloudIdentities = req.GetCloudIdentities()
		}
		d.apply(merged)
		d.mu.Lock()
		err := d.saveInstanceLocked()
		d.mu.Unlock()
		if err != nil {
			return nil, err
		}
		return &devboxv1.InitializeResponse{Info: d.info(), AlreadyInitialized: true}, nil
	}

	if prev != nil {
		// A snapshot restored as a new instance: the new instance's console has none of the old threads or events.
		d.log.Info("new instance on an initialized workspace", "previous", prev.GetInstanceId(), "instance", req.GetInstanceId())
		d.agents.Forget()
		if err := d.events.Reset(); err != nil {
			return nil, err
		}
		d.idle.Reset()
	}
	d.apply(req)
	d.mu.Lock()
	d.inst.FirstThreadDone = false
	err := d.saveInstanceLocked()
	d.mu.Unlock()
	if err != nil {
		return nil, err
	}
	if d.usesCodexSubscription() {
		go func() {
			fctx, cancel := context.WithTimeout(d.ctx, 30*time.Second)
			defer cancel()
			if err := d.creds.FetchCodex(fctx); err != nil {
				d.log.Warn("codex credential", "err", err)
			}
		}()
	}
	go d.hydrate(req)
	return &devboxv1.InitializeResponse{Info: d.info()}, nil
}

// checkInitializeToken accepts tokens signed by the current keys or, on key rotation, by the keys in the request.
// The very first Initialize is trusted (there are no keys yet).
func (d *Daemon) checkInitializeToken(token string, req *devboxv1.InitializeRequest) error {
	if d.cfg.InsecureNoAuth || !d.verifier.Configured() {
		return nil
	}
	if token != "" {
		if _, err := d.verifier.Verify(token); err == nil {
			return nil
		}
		if jwks := req.GetRequestTokenJwks(); len(jwks) > 0 {
			v := authn.NewVerifier(d.cfg.Clock.Now)
			if v.SetJWKS(jwks, req.GetInstanceId()) == nil {
				if _, err := v.Verify(token); err == nil {
					return nil
				}
			}
		}
	}
	return d.checkToken(token)
}

func (d *Daemon) GetInfo(context.Context, *devboxv1.GetInfoRequest) (*devboxv1.DaemonInfo, error) {
	return d.info(), nil
}

func (d *Daemon) ProbeAgents(ctx context.Context, req *devboxv1.ProbeAgentsRequest) (*devboxv1.ProbeAgentsResponse, error) {
	entries := d.probe(ctx, req.GetAgents(), req.GetEndpoints())
	d.mu.Lock()
	d.catalog = entries
	d.mu.Unlock()
	d.saveCatalog(entries)
	return &devboxv1.ProbeAgentsResponse{Agents: entries}, nil
}

func (d *Daemon) probe(ctx context.Context, specs []*devboxv1.AgentProbeSpec, ep *devboxv1.HarnessEndpoints) []*devboxv1.AgentCatalogEntry {
	scratch, err := os.MkdirTemp("", "devbox-probe-")
	if err != nil {
		scratch = filepath.Join(d.cfg.StateDir, "probe")
	}
	defer os.RemoveAll(scratch)
	return agents.Probe(ctx, agents.ProbeOptions{Launcher: d.harness, Supervisor: d.sup, Log: d.log.With("component", "probe"),
		Present:        func(t devboxv1.AgentType) bool { _, ok := d.harness.Present(t); return ok },
		AdapterVersion: d.harness.AdapterVersion, ScratchDir: scratch, Endpoints: ep}, specs)
}

func (d *Daemon) PrepareSuspend(ctx context.Context, req *devboxv1.PrepareSuspendRequest) (*devboxv1.PrepareSuspendResponse, error) {
	resp := &devboxv1.PrepareSuspendResponse{}
	if req.GetReason() == devboxv1.SuspendReason_SUSPEND_REASON_SNAPSHOT {
		if req.GetSharedSnapshot() {
			resp.StoppedAgents = d.agents.StopAgents(isCodexSubscription)
		}
		removed := d.creds.Scrub()
		d.log.Info("credentials scrubbed for snapshot", "paths", len(removed), "shared", req.GetSharedSnapshot())
		d.mu.Lock()
		d.scrubbed = true
		d.mu.Unlock()
	}
	resp.SettledOffset = d.settle()
	return resp, nil
}

// ---- event log ----

func (d *Daemon) SubscribeEvents(req *devboxv1.SubscribeEventsRequest, stream grpc.ServerStreamingServer[devboxv1.DaemonEvent]) error {
	ctx, cancel := context.WithCancel(stream.Context())
	defer cancel()
	// Exactly one subscriber: a new subscription (the gateway reconnecting) replaces the old one.
	d.subMu.Lock()
	if d.subCancel != nil {
		d.subCancel()
	}
	d.subCancel = cancel
	d.subMu.Unlock()
	defer func() {
		d.subMu.Lock()
		if d.subCancel != nil && ctx.Err() == nil {
			d.subCancel = nil
		}
		d.subMu.Unlock()
	}()

	var sendMu sync.Mutex
	send := func(ev *devboxv1.DaemonEvent) error {
		sendMu.Lock()
		defer sendMu.Unlock()
		return stream.Send(ev)
	}
	go func() {
		t := time.NewTicker(heartbeatInterval)
		defer t.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-t.C:
				head := d.events.Head()
				if err := send(&devboxv1.DaemonEvent{Offset: head, EmittedAt: timestamppb.Now(),
					Event: &devboxv1.DaemonEvent_Heartbeat{Heartbeat: &devboxv1.DaemonHeartbeat{HeadOffset: head, Idle: d.idle.State()}}}); err != nil {
					cancel()
					return
				}
			}
		}
	}()
	err := d.events.Subscribe(ctx, req.GetFromOffset(), send)
	if ctx.Err() != nil && stream.Context().Err() == nil {
		return status.Error(codes.Aborted, "replaced by a newer subscription")
	}
	return err
}

func (d *Daemon) AckEvents(_ context.Context, req *devboxv1.AckEventsRequest) (*devboxv1.AckEventsResponse, error) {
	acked, err := d.events.Ack(req.GetOffset())
	return &devboxv1.AckEventsResponse{AckedOffset: acked}, err
}

// ---- history ----

func (d *Daemon) GetTimeline(ctx context.Context, req *devboxv1.GetTimelineRequest) (*devboxv1.GetTimelineResponse, error) {
	if req.GetSessionId() == "" {
		return nil, status.Error(codes.InvalidArgument, "session_id is required")
	}
	resp, err := d.agents.Timeline(ctx, req)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "reading transcript: %v", err)
	}
	return resp, nil
}

func (d *Daemon) GetSessions(context.Context, *devboxv1.GetSessionsRequest) (*devboxv1.GetSessionsResponse, error) {
	return d.agents.Sessions(), nil
}

// ---- threads ----

func (d *Daemon) CreateThread(ctx context.Context, req *devboxv1.CreateThreadRequest) (*devboxv1.ThreadResponse, error) {
	s, err := d.agents.CreateThread(ctx, req)
	return &devboxv1.ThreadResponse{Session: s}, err
}

func (d *Daemon) ListThreads(ctx context.Context, req *devboxv1.ListThreadsRequest) (*devboxv1.ListThreadsResponse, error) {
	return d.agents.ListThreads(ctx, req.GetIncludeImportable())
}

func (d *Daemon) ImportThread(ctx context.Context, req *devboxv1.ImportThreadRequest) (*devboxv1.ThreadResponse, error) {
	s, err := d.agents.ImportThread(ctx, req)
	return &devboxv1.ThreadResponse{Session: s}, err
}

func (d *Daemon) ResumeThread(ctx context.Context, req *devboxv1.ResumeThreadRequest) (*devboxv1.ThreadResponse, error) {
	s, err := d.agents.ResumeThread(ctx, req.GetThread(), req.GetReplay())
	return &devboxv1.ThreadResponse{Session: s}, err
}

func (d *Daemon) CloseThread(ctx context.Context, req *devboxv1.ThreadActionRequest) (*devboxv1.ThreadResponse, error) {
	s, err := d.agents.CloseThread(ctx, req.GetThread())
	return &devboxv1.ThreadResponse{Session: s}, err
}

func (d *Daemon) DeleteThread(ctx context.Context, req *devboxv1.ThreadActionRequest) (*devboxv1.DeleteThreadResponse, error) {
	s, agentSide, err := d.agents.DeleteThread(ctx, req.GetThread())
	return &devboxv1.DeleteThreadResponse{Session: s, AgentSideDeleted: agentSide}, err
}

func (d *Daemon) ForkThread(ctx context.Context, req *devboxv1.ForkThreadRequest) (*devboxv1.ThreadResponse, error) {
	s, err := d.agents.ForkThread(ctx, req)
	return &devboxv1.ThreadResponse{Session: s}, err
}

func (d *Daemon) Prompt(ctx context.Context, req *devboxv1.PromptRequest) (*devboxv1.PromptResponse, error) {
	return d.agents.Prompt(ctx, req)
}

func (d *Daemon) CancelPrompt(ctx context.Context, req *devboxv1.CancelPromptRequest) (*devboxv1.CancelPromptResponse, error) {
	ok, err := d.agents.CancelPrompt(ctx, req.GetThread())
	return &devboxv1.CancelPromptResponse{Cancelled: ok}, err
}

func (d *Daemon) SetThreadConfigOption(ctx context.Context, req *devboxv1.SetThreadConfigOptionRequest) (*devboxv1.SetThreadConfigOptionResponse, error) {
	opts, err := d.agents.SetThreadConfigOption(ctx, req.GetThread(), req.GetOption())
	return &devboxv1.SetThreadConfigOptionResponse{ConfigOptions: opts}, err
}

func (d *Daemon) RespondInteraction(_ context.Context, req *devboxv1.RespondInteractionRequest) (*devboxv1.RespondInteractionResponse, error) {
	in, err := d.agents.RespondInteraction(req)
	return &devboxv1.RespondInteractionResponse{Interaction: in}, err
}

func (d *Daemon) ListCommands(_ context.Context, req *devboxv1.ListCommandsRequest) (*devboxv1.ListCommandsResponse, error) {
	cmds, err := d.agents.ListCommands(req.GetThread(), req.GetSessionId())
	return &devboxv1.ListCommandsResponse{Commands: cmds}, err
}

func (d *Daemon) SetAgentBilling(ctx context.Context, req *devboxv1.SetAgentBillingRequest) (*devboxv1.SetAgentBillingResponse, error) {
	launch := req.GetAgent()
	if launch.GetAgent() == devboxv1.AgentType_AGENT_TYPE_UNSPECIFIED {
		return nil, status.Error(codes.InvalidArgument, "agent is required")
	}
	if isCodexSubscription(launch.GetAgent(), launch.GetBilling()) {
		// Always refetch: the owner may have switched credentials.
		if err := d.creds.FetchCodex(ctx); err != nil {
			return nil, derr.New(codes.FailedPrecondition, devboxv1.ErrorReason_ERROR_REASON_AGENT_AUTH_FAILED,
				"could not fetch the Codex subscription credential: "+err.Error(), nil)
		}
	}
	conn, threads, err := d.agents.SetAgentBilling(ctx, launch)
	if err != nil {
		return nil, err
	}
	d.initMu.Lock()
	d.mu.Lock()
	if d.req != nil {
		r := proto.Clone(d.req).(*devboxv1.InitializeRequest)
		replaced := false
		for i, l := range r.Agents {
			if l.GetAgent() == launch.GetAgent() {
				r.Agents[i], replaced = launch, true
			}
		}
		if !replaced {
			r.Agents = append(r.Agents, launch)
		}
		d.req = r
		if err := d.saveInstanceLocked(); err != nil {
			d.log.Warn("persist instance", "err", err)
		}
	}
	d.mu.Unlock()
	d.initMu.Unlock()
	return &devboxv1.SetAgentBillingResponse{Connection: conn, ThreadIds: threads}, nil
}

// ---- terminals ----

func (d *Daemon) CreateTerminal(_ context.Context, req *devboxv1.CreateTerminalRequest) (*devboxv1.TerminalInfo, error) {
	return d.terms.Create(req)
}

func (d *Daemon) ListTerminals(context.Context, *devboxv1.ListTerminalsRequest) (*devboxv1.ListTerminalsResponse, error) {
	return &devboxv1.ListTerminalsResponse{Terminals: d.terms.List()}, nil
}

func (d *Daemon) ResizeTerminal(_ context.Context, req *devboxv1.ResizeTerminalRequest) (*devboxv1.TerminalInfo, error) {
	return d.terms.Resize(req.GetTerminalId(), req.GetCols(), req.GetRows())
}

func (d *Daemon) CloseTerminal(_ context.Context, req *devboxv1.CloseTerminalRequest) (*devboxv1.TerminalInfo, error) {
	return d.terms.Close(req.GetTerminalId(), req.GetSignal())
}

func (d *Daemon) AttachTerminal(stream grpc.BidiStreamingServer[devboxv1.TerminalInput, devboxv1.TerminalOutput]) error {
	return d.terms.Attach(stream.Context(), stream.Recv, stream.Send)
}

// ---- files ----

func (d *Daemon) ListFiles(ctx context.Context, req *devboxv1.ListFilesRequest) (*devboxv1.ListFilesResponse, error) {
	return d.files.List(ctx, req)
}

func (d *Daemon) StatFile(ctx context.Context, req *devboxv1.StatFileRequest) (*devboxv1.StatFileResponse, error) {
	e, err := d.files.Stat(ctx, req.GetPath())
	if err != nil {
		return nil, err
	}
	return &devboxv1.StatFileResponse{Entry: e}, nil
}

func (d *Daemon) ReadFile(ctx context.Context, req *devboxv1.ReadFileRequest) (*devboxv1.ReadFileResponse, error) {
	return d.files.Read(ctx, req)
}

func (d *Daemon) WriteFile(ctx context.Context, req *devboxv1.WriteFileRequest) (*devboxv1.WriteFileResponse, error) {
	return d.files.Write(ctx, req)
}

func (d *Daemon) WatchFiles(req *devboxv1.WatchFilesRequest, stream grpc.ServerStreamingServer[devboxv1.FileEvent]) error {
	return d.files.Watch(stream.Context(), req, stream.Send)
}

func (d *Daemon) GetChanges(ctx context.Context, req *devboxv1.GetChangesRequest) (*devboxv1.GetChangesResponse, error) {
	return d.files.Changes(ctx, req)
}

// ---- workspace ----

func (d *Daemon) AddRepository(ctx context.Context, req *devboxv1.AddRepositoryRequest) (*devboxv1.AddRepositoryResponse, error) {
	d.writeGitAuth(req.GetRepository().GetUrl())
	co, err := d.ws.AddRepository(ctx, req.GetRepository(), req.GetIdempotencyKey())
	return &devboxv1.AddRepositoryResponse{Checkout: co}, err
}

func (d *Daemon) ListRepositories(ctx context.Context, req *devboxv1.ListRepositoriesRequest) (*devboxv1.ListRepositoriesResponse, error) {
	return d.ws.List(ctx, req.GetIncludeWorktrees()), nil
}

// ---- browser ----

func (d *Daemon) StartBrowser(ctx context.Context, req *devboxv1.StartBrowserRequest) (*devboxv1.BrowserInfo, error) {
	return d.browser.Start(ctx, req.GetWidth(), req.GetHeight(), req.GetUrl())
}

func (d *Daemon) StopBrowser(context.Context, *devboxv1.StopBrowserRequest) (*devboxv1.BrowserInfo, error) {
	return d.browser.Stop(), nil
}

func (d *Daemon) GetBrowser(context.Context, *devboxv1.GetBrowserRequest) (*devboxv1.BrowserInfo, error) {
	return d.browser.Info(), nil
}

// ---- idle and credentials ----

func (d *Daemon) SetLeases(_ context.Context, req *devboxv1.SetInstanceLeasesRequest) (*devboxv1.SetInstanceLeasesResponse, error) {
	leases := d.idle.SetLeases(req.GetLeases(), req.GetGeneration())
	return &devboxv1.SetInstanceLeasesResponse{Leases: leases, Idle: d.idle.Evaluate()}, nil
}

func (d *Daemon) GetIdleState(context.Context, *devboxv1.GetIdleStateRequest) (*devboxv1.IdleState, error) {
	return d.idle.State(), nil
}

func (d *Daemon) PushCredential(ctx context.Context, req *devboxv1.PushCredentialRequest) (*devboxv1.PushCredentialResponse, error) {
	if req.GetCredential() == nil {
		return nil, status.Error(codes.InvalidArgument, "credential is required")
	}
	applied, err := d.creds.PushCredential(ctx, req.GetCredential())
	return &devboxv1.PushCredentialResponse{Applied: applied}, err
}

// trimToken drops a "Bearer " prefix from HTTP header tokens.
func trimToken(v string) string {
	if t, ok := strings.CutPrefix(v, "Bearer "); ok {
		return t
	}
	return v
}
