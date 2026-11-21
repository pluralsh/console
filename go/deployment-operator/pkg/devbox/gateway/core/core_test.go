package core

import (
	"context"
	"slices"
	"strings"
	"testing"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/egress"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate/ateapi"
)

func entity(session, id string, pos, rev uint64, text string) *devboxv1.AcpEntity {
	return &devboxv1.AcpEntity{
		Key:      &devboxv1.EntityKey{SessionId: session, Type: devboxv1.EntityType_ENTITY_TYPE_AGENT_MESSAGE, Id: id},
		Position: pos,
		Revision: rev,
		Settled:  true,
		AcpJson:  []byte(`{"content":{"type":"text","text":"` + text + `"}}`),
	}
}

func reasonOf(err error) devboxv1.ErrorReason {
	for _, d := range status.Convert(err).Details() {
		if ed, ok := d.(*devboxv1.ErrorDetail); ok {
			return ed.GetReason()
		}
	}
	return devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED
}

func TestCreateInstanceProvisionsAndInitializes(t *testing.T) {
	h := newHarness(t, nil)
	inst := h.running("inst-1")

	ref := inst.ref()
	if ref.Atespace != testAtespace || ref.Name != "dbx-inst-1" {
		t.Fatalf("actor = %s", ref)
	}
	if got := h.ate.State(testAtespace, "dbx-inst-1"); got != ateapi.ActorState_ACTOR_STATE_RUNNING {
		t.Fatalf("actor state = %s", got)
	}
	policy := h.ate.Policy(testAtespace, "dbx-inst-1")
	if policy == nil || len(policy.GetRules()) == 0 {
		t.Fatal("no egress policy applied")
	}
	var hosts []string
	for _, r := range policy.GetRules() {
		if https := r.GetHttps(); https != nil {
			hosts = append(hosts, https.GetHostnames()...)
		}
	}
	for _, want := range []string{"github.com", "pypi.org", "console.example.com"} {
		if !slices.Contains(hosts, want) {
			t.Errorf("egress policy hosts %v lack %s", hosts, want)
		}
	}

	h.daemon.mu.Lock()
	init := h.daemon.initialized[0]
	h.daemon.mu.Unlock()
	if init.GetInstanceId() != "inst-1" || init.GetEndpoints().GetDevboxMcpUrl() != "http://devbox-gateway.ns.svc:8080/mcp" ||
		init.GetEndpoints().GetAiProxyUrl() != "https://console.example.com/ext/ai" {
		t.Fatalf("unexpected Initialize: %v", init)
	}
	if got := h.ingest.statusList(); !slices.Equal(got, []string{"PROVISIONING", "RUNNING"}) {
		t.Fatalf("status reports = %v", got)
	}

	// Idempotent on instance_id.
	resp, err := h.g.CreateInstance(context.Background(), &devboxv1.CreateInstanceRequest{InstanceId: "inst-1", RunnerName: testRunner})
	if err != nil || resp.GetStatus() != devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING || resp.GetActorId() != testAtespace+"/dbx-inst-1" {
		t.Fatalf("repeat CreateInstance = %v, %v", resp, err)
	}

	// The egress resolver knows the actor.
	info, err := h.g.ResolveActor(context.Background(), testAtespace+"/dbx-inst-1")
	if err != nil || info.InstanceID != "inst-1" || !slices.Contains(info.SCMHosts, "github.com") || info.ConsoleHost != "console.example.com" {
		t.Fatalf("ResolveActor = %+v, %v", info, err)
	}
	if info.AgentBilling["AGENT_TYPE_CLAUDE"] != "BILLING_MODE_PROXY" {
		t.Fatalf("billing = %v", info.AgentBilling)
	}
}

// A restore routed to a worker that just went away fails Unavailable; provisioning retries instead of failing the
// instance.
func TestProvisionRetriesUnavailableResume(t *testing.T) {
	prev := resumeBackoff
	resumeBackoff = 5 * time.Millisecond
	t.Cleanup(func() { resumeBackoff = prev })
	h := newHarness(t, nil)
	h.ate.FailResume = status.Error(codes.Unavailable, "dial unix /var/lib/ate/workers/w/worker.sock: connect: no such file or directory")
	h.ate.FailResumeTimes = 2
	h.running("inst-1")

	resumes := 0
	for _, c := range h.ate.CallsSnapshot() {
		if strings.HasPrefix(c, "ResumeActor") {
			resumes++
		}
	}
	if resumes != 3 {
		t.Fatalf("want 3 resume attempts, got %d", resumes)
	}
	if got := h.ingest.statusList(); !slices.Equal(got, []string{"PROVISIONING", "RUNNING"}) {
		t.Fatalf("status reports = %v", got)
	}
}

// SCM connection hosts come from console, so egress allows and injects for a self-hosted SCM before any repository
// on it is named; the devbox MCP / SandboxCredentials rule stays a cleartext http rule, which Substrate serves as
// HTTP/1.1 and h2c (gRPC).
func TestEgressPolicyUsesBoxSCMHostsAndH2CGatewayRule(t *testing.T) {
	egress.SetGatewayEndpoint(egress.GatewayEndpoint{Host: "devbox-gateway.ns.svc", Port: egress.DefaultMCPPort})
	t.Cleanup(func() { egress.SetGatewayEndpoint(egress.GatewayEndpoint{}) })
	h := newHarness(t, nil)
	h.ingest.mu.Lock()
	h.ingest.scmHosts = []string{"gitlab.example.com", "https://ghe.example.com/api/v3"}
	h.ingest.mu.Unlock()
	h.running("inst-1")

	var https []string
	var gw *ateapi.HttpRule
	var gwHosts []string
	for _, r := range h.ate.Policy(testAtespace, "dbx-inst-1").GetRules() {
		if r.GetHttps() != nil {
			https = append(https, r.GetHttps().GetHostnames()...)
		}
		if r.GetHttp() != nil {
			if gw == nil {
				gw = r.GetHttp()
			}
			gwHosts = append(gwHosts, r.GetHttp().GetHostnames()...)
		}
	}
	if !slices.Contains(gwHosts, "devbox-gateway.ns.svc.cluster.local") {
		t.Errorf("gateway hosts %v lack the name sandbox DNS resolves", gwHosts)
	}
	for _, want := range []string{"gitlab.example.com", "ghe.example.com", "github.com"} {
		if !slices.Contains(https, want) {
			t.Errorf("egress policy hosts %v lack %s", https, want)
		}
	}
	if gw == nil || !slices.Equal(gw.GetHostnames(), []string{"devbox-gateway.ns.svc"}) || !slices.Equal(gw.GetPorts().GetNumbers(), []int32{8080}) {
		t.Fatalf("gateway rule = %v, want http devbox-gateway.ns.svc:8080", gw)
	}
	if hdr := gw.GetEffects().GetReplaceHeaders(); len(hdr) != 1 || hdr[0].GetActorJwt() == nil {
		t.Fatalf("gateway rule must inject the actor JWT: %v", hdr)
	}

	info, err := h.g.ResolveActor(context.Background(), testAtespace+"/dbx-inst-1")
	if err != nil || !slices.Contains(info.SCMHosts, "gitlab.example.com") {
		t.Fatalf("ResolveActor = %+v, %v", info, err)
	}
	h.ingest.mu.Lock()
	lookups := h.ingest.scmLookups
	h.ingest.mu.Unlock()
	if lookups != 1 {
		t.Fatalf("SCM hosts looked up %d times, want once (cached on the instance)", lookups)
	}

	// A new SCM connection on the box reaches the policy once console invalidates the allowlist.
	h.ingest.mu.Lock()
	h.ingest.scmHosts = append(h.ingest.scmHosts, "bitbucket.example.com")
	h.ingest.mu.Unlock()
	if _, err := h.g.InvalidateAllowlist(context.Background(), &devboxv1.InvalidateAllowlistRequest{InstanceId: "inst-1"}); err != nil {
		t.Fatal(err)
	}
	info, err = h.g.ResolveActor(context.Background(), testAtespace+"/dbx-inst-1")
	if err != nil || !slices.Contains(info.SCMHosts, "bitbucket.example.com") {
		t.Fatalf("after InvalidateAllowlist, ResolveActor = %+v, %v", info, err)
	}
}

func TestForwardingAndResumeIfSuspended(t *testing.T) {
	h := newHarness(t, nil)
	h.running("inst-1")

	ctx := metadata.NewIncomingContext(context.Background(), metadata.Pairs(devboxv1.RequestTokenMetadataKey, "tok-1"))
	prompt := &devboxv1.PromptRequest{Thread: &devboxv1.ThreadRef{InstanceId: "inst-1", ThreadId: "th-1"}, PromptId: "p1"}
	if _, err := h.g.Prompt(ctx, prompt); err != nil {
		t.Fatal(err)
	}
	h.daemon.mu.Lock()
	tokens, targets := slices.Clone(h.daemon.tokens), slices.Clone(h.daemon.targets)
	h.daemon.mu.Unlock()
	if !slices.Contains(tokens, "tok-1") {
		t.Fatalf("request token not forwarded: %v", tokens)
	}
	if !slices.Contains(targets, testAtespace+"/dbx-inst-1") {
		t.Fatalf("target actor not set: %v", targets)
	}

	if _, err := h.g.SuspendInstance(context.Background(), &devboxv1.InstanceActionRequest{InstanceId: "inst-1"}); err != nil {
		t.Fatal(err)
	}
	if got := h.ate.State(testAtespace, "dbx-inst-1"); got != ateapi.ActorState_ACTOR_STATE_SUSPENDED {
		t.Fatalf("actor state = %s", got)
	}
	if last := h.ingest.lastStatus(); last.GetStatus() != devboxv1.InstanceStatus_INSTANCE_STATUS_SUSPENDED ||
		last.GetSuspendReason() != devboxv1.SuspendReason_SUSPEND_REASON_USER {
		t.Fatalf("last status = %v", last)
	}

	// Without resume_if_suspended the call fails without touching the sandbox.
	_, err := h.g.Prompt(ctx, prompt)
	if status.Code(err) != codes.FailedPrecondition || reasonOf(err) != devboxv1.ErrorReason_ERROR_REASON_INSTANCE_SUSPENDED {
		t.Fatalf("Prompt on suspended = %v", err)
	}
	if _, err := h.g.ListFiles(ctx, &devboxv1.ListFilesRequest{InstanceId: "inst-1"}); reasonOf(err) != devboxv1.ErrorReason_ERROR_REASON_INSTANCE_SUSPENDED {
		t.Fatalf("ListFiles on suspended = %v", err)
	}
	// History lives on the box: reading it doesn't wake it unless asked to. CancelPrompt is a no-op.
	if _, err := h.g.ListThreads(ctx, &devboxv1.ListThreadsRequest{InstanceId: "inst-1"}); reasonOf(err) != devboxv1.ErrorReason_ERROR_REASON_INSTANCE_SUSPENDED {
		t.Fatalf("ListThreads on suspended = %v", err)
	}
	if _, err := h.g.GetSessions(ctx, &devboxv1.GetSessionsRequest{InstanceId: "inst-1"}); reasonOf(err) != devboxv1.ErrorReason_ERROR_REASON_INSTANCE_SUSPENDED {
		t.Fatalf("GetSessions on suspended = %v", err)
	}
	if _, err := h.g.GetTimeline(ctx, &devboxv1.GetTimelineRequest{InstanceId: "inst-1", SessionId: "s1"}); reasonOf(err) != devboxv1.ErrorReason_ERROR_REASON_INSTANCE_SUSPENDED {
		t.Fatalf("GetTimeline on suspended = %v", err)
	}
	if resp, err := h.g.CancelPrompt(ctx, &devboxv1.CancelPromptRequest{Thread: prompt.Thread}); err != nil || resp.GetCancelled() {
		t.Fatalf("CancelPrompt on suspended = %v, %v", resp, err)
	}
	inits, prompts, _, _ := h.daemon.snapshot()
	if inits != 1 || prompts != 1 {
		t.Fatalf("suspended instance was touched: inits=%d prompts=%d", inits, prompts)
	}

	prompt.ResumeIfSuspended = true
	if _, err := h.g.Prompt(ctx, prompt); err != nil {
		t.Fatal(err)
	}
	inits, prompts, _, _ = h.daemon.snapshot()
	if inits != 2 || prompts != 2 {
		t.Fatalf("resume-on-prompt: inits=%d prompts=%d", inits, prompts)
	}
	if got := h.ate.State(testAtespace, "dbx-inst-1"); got != ateapi.ActorState_ACTOR_STATE_RUNNING {
		t.Fatalf("actor state after resume = %s", got)
	}

	if _, err := h.g.Prompt(ctx, &devboxv1.PromptRequest{Thread: &devboxv1.ThreadRef{InstanceId: "nope"}}); reasonOf(err) != devboxv1.ErrorReason_ERROR_REASON_INSTANCE_NOT_FOUND {
		t.Fatalf("unknown instance = %v", err)
	}
}

func TestIdlenessDoesNotOutliveASuspend(t *testing.T) {
	h := newHarness(t, nil)
	h.running("inst-1")
	inst := h.g.get("inst-1")
	inst.mu.Lock()
	inst.idle = &devboxv1.IdleState{Idle: true, SuspendAt: timestamppb.Now()}
	inst.mu.Unlock()

	if _, err := h.g.SuspendInstance(context.Background(), &devboxv1.InstanceActionRequest{InstanceId: "inst-1"}); err != nil {
		t.Fatal(err)
	}
	if _, err := h.g.ResumeInstance(context.Background(), &devboxv1.InstanceActionRequest{InstanceId: "inst-1"}); err != nil {
		t.Fatal(err)
	}
	if last := h.ingest.lastStatus(); last.GetStatus() != devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING || last.GetIdle() != nil {
		t.Fatalf("resume reported the suspended run's idleness: %v", last)
	}
	inst.mu.Lock()
	idle := inst.idle
	inst.mu.Unlock()
	if idle != nil {
		t.Fatalf("heartbeats would still carry the suspended run's idleness: %v", idle)
	}
}

func TestEventForwardingAckOrdering(t *testing.T) {
	h := newHarness(t, nil)
	h.daemon.mu.Lock()
	h.daemon.acked = 1
	h.daemon.mu.Unlock()
	h.running("inst-1")

	type ackCheck struct {
		offset       uint64
		indexedFirst bool
	}
	checks := make(chan ackCheck, 16)
	h.daemon.mu.Lock()
	h.daemon.onAck = func(off uint64) {
		h.ingest.mu.Lock()
		indexed := slices.Contains(h.ingest.log, "index")
		h.ingest.mu.Unlock()
		checks <- ackCheck{offset: off, indexedFirst: indexed}
	}
	h.daemon.mu.Unlock()

	// The forwarder resumes from the offset the daemon says was acknowledged.
	h.eventually("subscribed", func() bool {
		_, _, subs, _ := h.daemon.snapshot()
		return len(subs) > 0
	})
	if _, _, subs, _ := h.daemon.snapshot(); subs[0] != 1 {
		t.Fatalf("subscribed from %d", subs[0])
	}

	now := timestamppb.Now()
	h.daemon.events <- &devboxv1.DaemonEvent{Offset: 2, Event: &devboxv1.DaemonEvent_Session{Session: &devboxv1.Session{ThreadId: "th-1", SessionId: "s1", Revision: 1, CreatedAt: now}}}
	h.daemon.events <- &devboxv1.DaemonEvent{Offset: 3, Event: &devboxv1.DaemonEvent_Delta{Delta: &devboxv1.Delta{
		SessionId: "s1", EntityType: devboxv1.EntityType_ENTITY_TYPE_AGENT_MESSAGE, EntityId: "m2", Position: 2,
		Op: devboxv1.DeltaOp_DELTA_OP_APPEND, PayloadJson: []byte(`{"content":{"type":"text","text":"wor"}}`),
	}}}
	h.daemon.events <- &devboxv1.DaemonEvent{Offset: 4, Event: &devboxv1.DaemonEvent_Delta{Delta: &devboxv1.Delta{
		SessionId: "s1", EntityType: devboxv1.EntityType_ENTITY_TYPE_AGENT_MESSAGE, EntityId: "m2", Position: 2,
		Op: devboxv1.DeltaOp_DELTA_OP_APPEND, PayloadJson: []byte(`{"content":{"type":"text","text":"ld"}}`),
	}}}
	h.daemon.events <- &devboxv1.DaemonEvent{Offset: 5, Event: &devboxv1.DaemonEvent_Aggregate{Aggregate: &devboxv1.InstanceAggregate{Revision: 1, Connections: []*devboxv1.AgentConnection{{State: "running"}}}}}
	h.daemon.events <- &devboxv1.DaemonEvent{Offset: 5, Event: &devboxv1.DaemonEvent_Heartbeat{Heartbeat: &devboxv1.DaemonHeartbeat{HeadOffset: 5}}}

	var last ackCheck
	h.eventually("ack through offset 5", func() bool {
		for {
			select {
			case c := <-checks:
				if !c.indexedFirst {
					t.Fatalf("AckEvents(%d) before console indexed it", c.offset)
				}
				last = c
			default:
				return last.offset == 5
			}
		}
	})

	h.eventually("deltas pushed", func() bool {
		h.ingest.mu.Lock()
		defer h.ingest.mu.Unlock()
		return len(h.ingest.deltas) == 2
	})
	h.ingest.mu.Lock()
	var deltas []*devboxv1.Delta
	deltas = append(deltas, h.ingest.deltas...)
	var indexed []*devboxv1.UpsertInstanceIndexRequest
	indexed = append(indexed, h.ingest.indexes...)
	h.ingest.mu.Unlock()
	if len(deltas) != 2 || deltas[0].GetInstanceId() != "inst-1" || deltas[0].GetOffset() != 3 {
		t.Fatalf("deltas = %v", deltas)
	}
	var sessions, aggregates int
	for _, ix := range indexed {
		sessions += len(ix.GetSessions())
		if ix.GetAggregate() != nil {
			aggregates++
		}
	}
	if sessions != 1 || aggregates != 1 {
		t.Fatalf("index upserts: sessions=%d aggregates=%d", sessions, aggregates)
	}

	// History is served by the box.
	tl, err := h.g.GetTimeline(context.Background(), &devboxv1.GetTimelineRequest{InstanceId: "inst-1", SessionId: "s1", Limit: 50})
	if err != nil || len(tl.GetEntities()) != 1 || tl.GetDeltaOffset() != 5 {
		t.Fatalf("timeline = %v, %v", tl, err)
	}
	h.daemon.mu.Lock()
	proxied := h.daemon.timelines[len(h.daemon.timelines)-1]
	h.daemon.mu.Unlock()
	if proxied.GetSessionId() != "s1" || proxied.GetLimit() != 50 {
		t.Fatalf("proxied request = %v", proxied)
	}
	sess, err := h.g.GetSessions(context.Background(), &devboxv1.GetSessionsRequest{InstanceId: "inst-1"})
	if err != nil || len(sess.GetSessions()) != 1 || len(sess.GetConnections()) != 1 {
		t.Fatalf("GetSessions = %v, %v", sess, err)
	}

	// A broken subscription resumes from the acknowledged offset.
	h.daemon.breakSub <- struct{}{}
	h.eventually("resubscribe", func() bool {
		_, _, subs, _ := h.daemon.snapshot()
		return len(subs) >= 2 && subs[len(subs)-1] == 5
	})
	h.daemon.events <- &devboxv1.DaemonEvent{Offset: 6, Event: &devboxv1.DaemonEvent_Session{Session: &devboxv1.Session{ThreadId: "th-1", SessionId: "s1", Revision: 2, CreatedAt: now}}}
	h.eventually("ack 6", func() bool {
		_, _, _, acks := h.daemon.snapshot()
		return slices.Contains(acks, 6)
	})
}

func TestInteractionsFlushWithoutWaitingForTheTick(t *testing.T) {
	h := newHarness(t, nil)
	h.g.cfg.FlushInterval = time.Hour
	h.running("inst-1")

	h.daemon.events <- &devboxv1.DaemonEvent{Offset: 1, Event: &devboxv1.DaemonEvent_Session{Session: &devboxv1.Session{ThreadId: "th-1", SessionId: "s1", Revision: 1}}}
	h.daemon.events <- &devboxv1.DaemonEvent{Offset: 2, Event: &devboxv1.DaemonEvent_Interaction{Interaction: &devboxv1.Interaction{
		InteractionId: "int-1", SessionId: "s1", State: devboxv1.InteractionState_INTERACTION_STATE_PENDING, Revision: 1,
	}}}

	h.eventually("the interaction indexed", func() bool {
		h.ingest.mu.Lock()
		defer h.ingest.mu.Unlock()
		for _, ix := range h.ingest.indexes {
			if len(ix.GetInteractions()) == 1 && len(ix.GetSessions()) == 1 {
				return true
			}
		}
		return false
	})
}

func TestSuspendDrainsEventsBeforeSuspending(t *testing.T) {
	h := newHarness(t, nil)
	h.running("inst-1")

	stateAtAck := make(chan ateapi.ActorState, 4)
	h.daemon.mu.Lock()
	h.daemon.settled = 7
	h.daemon.onPrepare = func() {
		if got := h.ate.State(testAtespace, "dbx-inst-1"); got != ateapi.ActorState_ACTOR_STATE_RUNNING {
			t.Errorf("PrepareSuspend after the actor was suspended (%s)", got)
		}
		h.daemon.events <- &devboxv1.DaemonEvent{Offset: 7, Event: &devboxv1.DaemonEvent_Session{Session: &devboxv1.Session{ThreadId: "th-1", SessionId: "s1", Revision: 2}}}
	}
	h.daemon.onAck = func(off uint64) {
		if off == 7 {
			stateAtAck <- h.ate.State(testAtespace, "dbx-inst-1")
		}
	}
	h.daemon.mu.Unlock()

	resp, err := h.g.SuspendInstance(context.Background(), &devboxv1.InstanceActionRequest{InstanceId: "inst-1", Reason: devboxv1.SuspendReason_SUSPEND_REASON_IDLE})
	if err != nil || resp.GetStatus() != devboxv1.InstanceStatus_INSTANCE_STATUS_SUSPENDED {
		t.Fatalf("SuspendInstance = %v, %v", resp, err)
	}
	select {
	case st := <-stateAtAck:
		if st != ateapi.ActorState_ACTOR_STATE_RUNNING {
			t.Fatalf("offset 7 acknowledged after suspend (actor %s)", st)
		}
	default:
		t.Fatal("offset 7 was never acknowledged")
	}
	if modes := h.ate.SuspendModesSnapshot(); len(modes) != 1 || modes[0] != ateapi.DurabilityMode_DURABILITY_MODE_ASYNCHRONOUS {
		t.Fatalf("suspend modes = %v", modes)
	}
	// Opening a suspended instance's timeline wakes the box, which serves it.
	tl, err := h.g.GetTimeline(context.Background(), &devboxv1.GetTimelineRequest{InstanceId: "inst-1", SessionId: "s1", ResumeIfSuspended: true})
	if err != nil || len(tl.GetEntities()) != 1 || tl.GetDeltaOffset() != 7 {
		t.Fatalf("timeline = %v, %v", tl, err)
	}
	if h.ate.State(testAtespace, "dbx-inst-1") != ateapi.ActorState_ACTOR_STATE_RUNNING {
		t.Fatal("GetTimeline with resume_if_suspended left the box suspended")
	}
}

func TestSuspendRequestedEvent(t *testing.T) {
	h := newHarness(t, nil)
	inst := h.running("inst-1")
	h.daemon.events <- &devboxv1.DaemonEvent{Offset: 1, Event: &devboxv1.DaemonEvent_SuspendRequested{SuspendRequested: &devboxv1.SuspendRequested{Reason: devboxv1.SuspendReason_SUSPEND_REASON_IDLE}}}
	h.eventually("suspended", func() bool { return inst.status() == devboxv1.InstanceStatus_INSTANCE_STATUS_SUSPENDED })
	if r := inst.record().SuspendReason; r != devboxv1.SuspendReason_SUSPEND_REASON_IDLE.String() {
		t.Fatalf("reason = %s", r)
	}
}

func TestEvictionSuspendsSynchronously(t *testing.T) {
	h := newHarness(t, nil)
	inst := h.running("inst-1")
	h.ate.SetWorker("worker-1", ateapi.WorkerState_WORKER_STATE_DRAINING)
	if !h.g.evictions(context.Background()) {
		t.Fatal("eviction watch disabled")
	}
	h.eventually("evicted", func() bool { return inst.status() == devboxv1.InstanceStatus_INSTANCE_STATUS_SUSPENDED })
	if r := inst.record().SuspendReason; r != devboxv1.SuspendReason_SUSPEND_REASON_EVICTION.String() {
		t.Fatalf("reason = %s", r)
	}
	h.eventually("suspend mode recorded", func() bool { return len(h.ate.SuspendModesSnapshot()) == 1 })
	if h.ate.SuspendModesSnapshot()[0] != ateapi.DurabilityMode_DURABILITY_MODE_SYNCHRONOUS {
		t.Fatalf("suspend mode = %v", h.ate.SuspendModesSnapshot())
	}
}

func TestBackstops(t *testing.T) {
	h := newHarness(t, nil)
	inst := h.running("inst-1")

	// A viewer lease keeps the box past maxContinuousAwake.
	if _, err := h.g.SetInstanceLeases(context.Background(), &devboxv1.SetInstanceLeasesRequest{
		InstanceId: "inst-1", Generation: 1,
		Leases: []*devboxv1.Lease{{Kind: devboxv1.LeaseKind_LEASE_KIND_VIEWER, ExpiresAt: timestamppb.New(time.Now().Add(48 * time.Hour))}},
	}); err != nil {
		t.Fatal(err)
	}
	h.clock.advance(25 * time.Hour)
	inst.mu.Lock()
	inst.lastContact = h.clock.now()
	inst.mu.Unlock()
	h.g.backstops(context.Background())
	time.Sleep(50 * time.Millisecond)
	if inst.status() != devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING {
		t.Fatal("suspended despite a viewer lease")
	}

	if _, err := h.g.SetInstanceLeases(context.Background(), &devboxv1.SetInstanceLeasesRequest{InstanceId: "inst-1", Generation: 2}); err != nil {
		t.Fatal(err)
	}
	h.g.backstops(context.Background())
	h.eventually("max awake suspend", func() bool { return inst.status() == devboxv1.InstanceStatus_INSTANCE_STATUS_SUSPENDED })
	if r := inst.record().SuspendReason; r != devboxv1.SuspendReason_SUSPEND_REASON_MAX_CONTINUOUS_AWAKE.String() {
		t.Fatalf("reason = %s", r)
	}

	h.clock.advance(15 * 24 * time.Hour)
	h.g.backstops(context.Background())
	h.eventually("completed", func() bool { return h.g.get("inst-1") == nil })
	if last := h.ingest.lastStatus(); last.GetStatus() != devboxv1.InstanceStatus_INSTANCE_STATUS_COMPLETED {
		t.Fatalf("last status = %v", last)
	}
	if st := h.ate.State(testAtespace, "dbx-inst-1"); st != ateapi.ActorState_ACTOR_STATE_UNSPECIFIED {
		t.Fatalf("actor not deleted: %s", st)
	}
	if rec, _ := h.g.loadRecord(context.Background(), "inst-1"); rec == nil || rec.Status != devboxv1.InstanceStatus_INSTANCE_STATUS_COMPLETED.String() {
		t.Fatalf("record = %+v", rec)
	}
}

func TestCompleteAfterBackstopLosesToResume(t *testing.T) {
	h := newHarness(t, nil)
	inst := h.running("inst-1")
	h.clock.advance(25 * time.Hour)
	inst.mu.Lock()
	inst.lastContact = h.clock.now()
	inst.mu.Unlock()
	h.g.backstops(context.Background())
	h.eventually("max awake suspend", func() bool { return inst.status() == devboxv1.InstanceStatus_INSTANCE_STATUS_SUSPENDED })

	// The backstop sees a stale suspended instance while a resume holds the operation lock.
	h.clock.advance(15 * 24 * time.Hour)
	inst.op.Lock()
	h.g.backstops(context.Background())
	_, err := h.g.resumeLocked(context.Background(), inst)
	inst.op.Unlock()
	if err != nil {
		t.Fatal(err)
	}

	time.Sleep(100 * time.Millisecond)
	if h.g.get("inst-1") == nil || inst.status() != devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING {
		t.Fatalf("resumed instance was completed: %s", inst.status())
	}
	if st := h.ate.State(testAtespace, "dbx-inst-1"); st == ateapi.ActorState_ACTOR_STATE_UNSPECIFIED {
		t.Fatal("resumed instance's actor was deleted")
	}
}

func TestUnresponsiveDaemonBackstop(t *testing.T) {
	h := newHarness(t, nil)
	inst := h.running("inst-1")
	h.clock.advance(10 * time.Minute)
	h.g.backstops(context.Background())
	h.eventually("suspended", func() bool { return inst.status() == devboxv1.InstanceStatus_INSTANCE_STATUS_SUSPENDED })
	if r := inst.record().SuspendReason; r != devboxv1.SuspendReason_SUSPEND_REASON_DAEMON_UNRESPONSIVE.String() {
		t.Fatalf("reason = %s", r)
	}
	h.daemon.mu.Lock()
	prepares := len(h.daemon.prepares)
	h.daemon.mu.Unlock()
	if prepares != 0 {
		t.Fatal("PrepareSuspend called on an unresponsive daemon")
	}
}

func TestSetInstanceLeasesClampsAndRelays(t *testing.T) {
	h := newHarness(t, nil)
	h.running("inst-1")
	far := time.Now().Add(72 * time.Hour)
	resp, err := h.g.SetInstanceLeases(context.Background(), &devboxv1.SetInstanceLeasesRequest{
		InstanceId: "inst-1", Generation: 5,
		Leases: []*devboxv1.Lease{{Kind: devboxv1.LeaseKind_LEASE_KIND_DEFERRAL, ExpiresAt: timestamppb.New(far)}},
	})
	if err != nil {
		t.Fatal(err)
	}
	got := resp.GetLeases()[0]
	if !got.GetExpiresAt().AsTime().Before(time.Now().Add(13*time.Hour)) || !got.GetRequestedUntil().AsTime().Equal(far.Truncate(time.Nanosecond)) {
		t.Fatalf("lease not clamped to maxDeferral: %v", got)
	}
	h.daemon.mu.Lock()
	relayed := len(h.daemon.leases)
	h.daemon.mu.Unlock()
	if relayed != 1 {
		t.Fatalf("relayed %d lease sets", relayed)
	}
	// Older generations are ignored.
	resp, err = h.g.SetInstanceLeases(context.Background(), &devboxv1.SetInstanceLeasesRequest{InstanceId: "inst-1", Generation: 4})
	if err != nil || len(resp.GetLeases()) != 1 {
		t.Fatalf("stale generation applied: %v, %v", resp, err)
	}
}

func TestSnapshotAndStartFromSnapshot(t *testing.T) {
	h := newHarness(t, nil)
	h.running("inst-1")
	if _, err := h.g.SnapshotInstance(context.Background(), &devboxv1.SnapshotInstanceRequest{InstanceId: "inst-1", SnapshotId: "snap-1", Shared: true}); err != nil {
		t.Fatal(err)
	}
	var report *devboxv1.ReportSnapshotRequest
	h.eventually("snapshot report", func() bool {
		h.ingest.mu.Lock()
		defer h.ingest.mu.Unlock()
		if len(h.ingest.snapshots) > 0 {
			report = h.ingest.snapshots[0]
		}
		return report != nil
	})
	if report.GetState() != devboxv1.SnapshotState_SNAPSHOT_STATE_SUCCEEDED || report.GetSnapshot().GetTag() != testAtespace+"/snap-snap-1" ||
		report.GetSnapshot().GetFidelity() != devboxv1.SnapshotFidelity_SNAPSHOT_FIDELITY_MEMORY || report.GetSnapshot().GetTemplateRevision() != 2 {
		t.Fatalf("snapshot report = %v", report)
	}
	h.eventually("running again", func() bool { return h.g.get("inst-1").status() == devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING })
	statuses := h.ingest.statusList()
	if !slices.Contains(statuses, "SNAPSHOTTING") || statuses[len(statuses)-1] != "RUNNING" {
		t.Fatalf("statuses = %v", statuses)
	}
	h.daemon.mu.Lock()
	prep := h.daemon.prepares[0]
	h.daemon.mu.Unlock()
	if prep.GetReason() != devboxv1.SuspendReason_SUSPEND_REASON_SNAPSHOT || !prep.GetSharedSnapshot() {
		t.Fatalf("PrepareSuspend = %v", prep)
	}
	if h.ate.SuspendModesSnapshot()[0] != ateapi.DurabilityMode_DURABILITY_MODE_SYNCHRONOUS {
		t.Fatalf("snapshot suspend mode = %v", h.ate.SuspendModesSnapshot())
	}

	// Start from a snapshot taken on an older template revision: seeded from the old template, moved to the
	// current one, cold boot.
	resp, err := h.g.StartFromSnapshot(context.Background(), &devboxv1.StartFromSnapshotRequest{
		Instance: &devboxv1.CreateInstanceRequest{InstanceId: "inst-2", RunnerName: testRunner},
		Snapshot: &devboxv1.SnapshotRef{SnapshotId: "old", Tag: testAtespace + "/snap-old", TemplateRevision: 1},
	})
	if err != nil {
		t.Fatal(err)
	}
	if resp.GetStatus() != devboxv1.InstanceStatus_INSTANCE_STATUS_PROVISIONING {
		t.Fatalf("StartFromSnapshot = %v", resp)
	}
	inst2 := h.g.get("inst-2")
	h.eventually("inst-2 running", func() bool { return inst2.status() == devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING })
	h.ate.CallsSnapshot()
	if !slices.Contains(h.ate.CallsSnapshot(), "UpdateActor "+testAtespace+"/dbx-inst-2") {
		t.Fatalf("actor not moved to the current template: %v", h.ate.CallsSnapshot())
	}
	if rec := inst2.record(); rec.Template != "tmpl-r2" || rec.RestoreFidelity != devboxv1.SnapshotFidelity_SNAPSHOT_FIDELITY_FILESYSTEM.String() {
		t.Fatalf("record = %+v", rec)
	}
	h.daemon.mu.Lock()
	init := h.daemon.initialized[len(h.daemon.initialized)-1]
	h.daemon.mu.Unlock()
	if !init.GetRestoredFromSnapshot() || init.GetRestoreFidelity() != devboxv1.SnapshotFidelity_SNAPSHOT_FIDELITY_FILESYSTEM {
		t.Fatalf("Initialize = %v", init)
	}
}

func TestCancelDeletesActorAndCollectsTheRecord(t *testing.T) {
	h := newHarness(t, nil)
	h.running("inst-1")
	if _, err := h.g.CancelInstance(context.Background(), &devboxv1.InstanceActionRequest{InstanceId: "inst-1"}); err != nil {
		t.Fatal(err)
	}
	if h.ate.State(testAtespace, "dbx-inst-1") != ateapi.ActorState_ACTOR_STATE_UNSPECIFIED || h.ate.Policy(testAtespace, "dbx-inst-1") != nil {
		t.Fatal("actor or egress policy left behind")
	}
	h.egress.mu.Lock()
	invalidated := slices.Contains(h.egress.invalidated, "inst-1")
	h.egress.mu.Unlock()
	if !invalidated {
		t.Fatal("egress caches not invalidated")
	}

	// The terminal record outlives the actor until console has seen the end.
	ctx := context.Background()
	h.g.reconcile(ctx, []*devboxv1.InstanceSummary{{InstanceId: "inst-1", Status: devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING}})
	if rec, _ := h.g.loadRecord(ctx, "inst-1"); rec == nil || rec.Status != devboxv1.InstanceStatus_INSTANCE_STATUS_CANCELLED.String() {
		t.Fatalf("record = %+v", rec)
	}
	h.g.reconcile(ctx, []*devboxv1.InstanceSummary{{InstanceId: "inst-1", Status: devboxv1.InstanceStatus_INSTANCE_STATUS_CANCELLED}})
	if rec, _ := h.g.loadRecord(ctx, "inst-1"); rec != nil {
		t.Fatalf("record not collected: %+v", rec)
	}
}

func TestRegistrationReconcilesAndHeartbeats(t *testing.T) {
	h := newHarness(t, nil)
	h.running("inst-1")

	// A second gateway process over the same records and Substrate adopts the running instance.
	g2, err := New(h.g.cfg, h.g.deps)
	if err != nil {
		t.Fatal(err)
	}
	defer g2.Shutdown()
	h.ingest.mu.Lock()
	h.ingest.register = &devboxv1.RegisterGatewayResponse{ClusterId: "cluster-9", HeartbeatIntervalSeconds: 1, Instances: []*devboxv1.InstanceSummary{
		{InstanceId: "inst-1", Status: devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING, LeaseGeneration: 3,
			Leases: []*devboxv1.Lease{{Kind: devboxv1.LeaseKind_LEASE_KIND_VIEWER}}},
		{InstanceId: "ghost", Status: devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING},
	}}
	h.ingest.mu.Unlock()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go g2.runIngest(ctx)

	h.eventually("adopted", func() bool {
		inst := g2.get("inst-1")
		return inst != nil && inst.status() == devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING && inst.forwarder() != nil
	})
	if g2.cluster() != "cluster-9" {
		t.Fatalf("cluster = %s", g2.cluster())
	}
	if inst := g2.get("inst-1"); inst.leaseGen != 3 {
		t.Fatalf("lease generation = %d", inst.leaseGen)
	}
	h.eventually("ghost reported failed", func() bool {
		h.ingest.mu.Lock()
		defer h.ingest.mu.Unlock()
		for _, s := range h.ingest.statuses {
			if s.GetInstanceId() == "ghost" && s.GetStatus() == devboxv1.InstanceStatus_INSTANCE_STATUS_FAILED {
				return true
			}
		}
		return false
	})
	h.eventually("heartbeat", func() bool {
		h.ingest.mu.Lock()
		defer h.ingest.mu.Unlock()
		for _, hb := range h.ingest.heartbeat {
			if len(hb.GetInstances()) == 1 && hb.GetInstances()[0].GetInstanceId() == "inst-1" {
				return true
			}
		}
		return false
	})
}

func TestEndpointsScopeWorkbenchMCPToTheInstance(t *testing.T) {
	g := &Gateway{cfg: Config{WorkbenchMCPURL: "https://console.example.com/mcp/workbench/"}}
	if got := g.endpoints("wb-1").GetWorkbenchMcpUrl(); got != "https://console.example.com/mcp/workbench/wb-1" {
		t.Fatalf("workbench mcp = %q", got)
	}
	if got := g.endpoints("").GetWorkbenchMcpUrl(); got != "" {
		t.Fatalf("workbench mcp without a workbench = %q", got)
	}
}

func TestResumeOutlivesTheCallersDeadline(t *testing.T) {
	prev := resumeBackoff
	resumeBackoff = 100 * time.Millisecond
	t.Cleanup(func() { resumeBackoff = prev })
	h := newHarness(t, nil)
	h.running("inst-1")
	if _, err := h.g.SuspendInstance(context.Background(), &devboxv1.InstanceActionRequest{InstanceId: "inst-1"}); err != nil {
		t.Fatal(err)
	}
	// a slow restore: substrate is unavailable for the first two attempts
	h.ate.FailResume = status.Error(codes.Unavailable, "worker gone")
	h.ate.FailResumeTimes = 2

	req := &devboxv1.InstanceActionRequest{InstanceId: "inst-1"}
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
	defer cancel()
	_, err := h.g.ResumeInstance(ctx, req)
	if status.Code(err) != codes.Unavailable || reasonOf(err) != devboxv1.ErrorReason_ERROR_REASON_INSTANCE_STARTING {
		t.Fatalf("an impatient resume = %v", err)
	}
	// a second caller joins the wake in flight rather than starting another
	resp, err := h.g.ResumeInstance(context.Background(), req)
	if err != nil || resp.GetStatus() != devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING {
		t.Fatalf("joined resume = %v, %v", resp, err)
	}
	if got := h.ate.State(testAtespace, "dbx-inst-1"); got != ateapi.ActorState_ACTOR_STATE_RUNNING {
		t.Fatalf("actor state = %s", got)
	}
	if inits, _, _, _ := h.daemon.snapshot(); inits != 2 {
		t.Fatalf("the daemon should be initialized once per wake, got %d inits", inits)
	}
}
