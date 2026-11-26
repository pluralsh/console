package core

import (
	"context"
	"errors"
	"maps"
	"slices"
	"strings"
	"sync"
	"testing"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/actors"
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
	if modes := h.ate.SuspendModesSnapshot(); len(modes) != 1 || modes[0] != ateapi.DurabilityMode_DURABILITY_MODE_SYNCHRONOUS {
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

func TestBusyBoxRefusesAutomaticSuspends(t *testing.T) {
	h := newHarness(t, nil)
	inst := h.running("inst-1")
	h.daemon.mu.Lock()
	h.daemon.busy = true
	h.daemon.mu.Unlock()

	for _, reason := range []devboxv1.SuspendReason{devboxv1.SuspendReason_SUSPEND_REASON_IDLE, devboxv1.SuspendReason_SUSPEND_REASON_MAX_CONTINUOUS_AWAKE} {
		resp, err := h.g.SuspendInstance(context.Background(), &devboxv1.InstanceActionRequest{InstanceId: "inst-1", Reason: reason})
		if err != nil || resp.GetStatus() != devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING {
			t.Fatalf("%s suspend of a busy box = %v, %v", reason, resp, err)
		}
	}
	if st := h.ate.State(testAtespace, "dbx-inst-1"); st != ateapi.ActorState_ACTOR_STATE_RUNNING {
		t.Fatalf("actor %s after refused suspends", st)
	}
	// Still forwarding events.
	h.daemon.events <- &devboxv1.DaemonEvent{Offset: 1, Event: &devboxv1.DaemonEvent_Session{Session: &devboxv1.Session{ThreadId: "th-1", SessionId: "s1", Revision: 1}}}
	h.eventually("events still acknowledged", func() bool {
		h.daemon.mu.Lock()
		defer h.daemon.mu.Unlock()
		return h.daemon.acked >= 1
	})

	// The user's own suspend isn't refused.
	resp, err := h.g.SuspendInstance(context.Background(), &devboxv1.InstanceActionRequest{InstanceId: "inst-1", Reason: devboxv1.SuspendReason_SUSPEND_REASON_USER})
	if err != nil || resp.GetStatus() != devboxv1.InstanceStatus_INSTANCE_STATUS_SUSPENDED {
		t.Fatalf("user suspend = %v, %v", resp, err)
	}
	if inst.status() != devboxv1.InstanceStatus_INSTANCE_STATUS_SUSPENDED {
		t.Fatalf("status %s", inst.status())
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

func TestHomeErrorRemountsTheHome(t *testing.T) {
	h := newHarness(t, nil)
	inst := h.running("inst-1")
	homeSuspends := func() (n int) {
		h.ingest.mu.Lock()
		defer h.ingest.mu.Unlock()
		for _, s := range h.ingest.statuses {
			if s.GetSuspendReason() == devboxv1.SuspendReason_SUSPEND_REASON_HOME_UNAVAILABLE {
				n++
			}
		}
		return n
	}
	failing := func() {
		h.daemon.events <- &devboxv1.DaemonEvent{Event: &devboxv1.DaemonEvent_Heartbeat{
			Heartbeat: &devboxv1.DaemonHeartbeat{HomeError: "writing to the home: input/output error"}}}
	}

	failing()
	h.eventually("suspended and resumed", func() bool {
		inst.mu.Lock()
		defer inst.mu.Unlock()
		return !inst.homeRemounted.IsZero() && inst.rec.status() == devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING
	})
	if n := homeSuspends(); n != 1 {
		t.Fatalf("home suspends = %d", n)
	}
	inst.mu.Lock()
	cond := inst.conditions[homeCondition]
	inst.mu.Unlock()
	if cond.GetMessage() == "" {
		t.Fatal("no home condition for console")
	}

	// The error the daemon reported before the suspend, until its next probe clears it.
	failing()
	time.Sleep(50 * time.Millisecond)
	if n := homeSuspends(); n != 1 {
		t.Fatalf("remounted again within the grace period: %d", n)
	}

	// Failing again soon after: suspended, not resumed into the same failure.
	h.clock.advance(homeRemountGrace + time.Minute)
	failing()
	h.eventually("suspended", func() bool { return inst.status() == devboxv1.InstanceStatus_INSTANCE_STATUS_SUSPENDED })
	time.Sleep(50 * time.Millisecond)
	if st := inst.status(); st != devboxv1.InstanceStatus_INSTANCE_STATUS_SUSPENDED {
		t.Fatalf("status = %s", st)
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

func fastProbes(t *testing.T) {
	interval := unresponsiveProbeInterval
	unresponsiveProbeInterval = time.Millisecond
	t.Cleanup(func() { unresponsiveProbeInterval = interval })
}

func TestUnresponsiveDaemonBackstop(t *testing.T) {
	fastProbes(t)
	h := newHarness(t, nil)
	inst := h.running("inst-1")
	h.daemon.mu.Lock()
	h.daemon.unhealthy = true
	h.daemon.mu.Unlock()
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

func TestSilentStreamToAHealthyDaemonIsNotSuspended(t *testing.T) {
	fastProbes(t)
	h := newHarness(t, nil)
	inst := h.running("inst-1")
	h.clock.advance(10 * time.Minute)
	h.g.backstops(context.Background())
	h.eventually("contact refreshed", func() bool {
		inst.mu.Lock()
		defer inst.mu.Unlock()
		return h.clock.now().Sub(inst.lastContact) < time.Minute && !inst.probing
	})
	if inst.status() != devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING {
		t.Fatalf("healthy daemon suspended: %s", inst.status())
	}
	if n := len(h.ate.SuspendModesSnapshot()); n != 0 {
		t.Fatalf("suspended %d times", n)
	}
	h.daemon.events <- &devboxv1.DaemonEvent{Offset: 1, Event: &devboxv1.DaemonEvent_Session{Session: &devboxv1.Session{ThreadId: "th-1", SessionId: "s1", Revision: 1}}}
	h.eventually("restarted forwarder delivers events", func() bool {
		h.daemon.mu.Lock()
		defer h.daemon.mu.Unlock()
		return h.daemon.acked >= 1
	})
}

func TestCrashDuringSuspendReportsLostWork(t *testing.T) {
	h := newHarness(t, nil)
	inst := h.running("inst-1")
	h.ate.SetState(testAtespace, "dbx-inst-1", ateapi.ActorState_ACTOR_STATE_CRASHED, "")
	if _, err := h.g.SuspendInstance(context.Background(), &devboxv1.InstanceActionRequest{InstanceId: "inst-1", Reason: devboxv1.SuspendReason_SUSPEND_REASON_IDLE}); err != nil {
		t.Fatal(err)
	}
	h.eventually("suspended", func() bool { return inst.status() == devboxv1.InstanceStatus_INSTANCE_STATUS_SUSPENDED })
	if msg := h.ingest.lastStatus().GetMessage(); !strings.Contains(msg, "work since then was lost") {
		t.Fatalf("status message = %q", msg)
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

type fakeSeeds struct {
	mu      sync.Mutex
	saved   map[string]string
	deleted []string
	failErr error
}

func (f *fakeSeeds) SaveSeed(_ context.Context, seedID, volumeID string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.failErr != nil {
		return f.failErr
	}
	if f.saved == nil {
		f.saved = map[string]string{}
	}
	f.saved[seedID] = volumeID
	return nil
}

func (f *fakeSeeds) DeleteSeed(_ context.Context, seedID string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.deleted = append(f.deleted, seedID)
	return nil
}

func TestJuiceFSHomes(t *testing.T) {
	h := newHarness(t, nil)
	h.g.deps.Runners.(StaticRunners)[testRunner].HomeStorage = v1alpha1.DevboxHomeJuiceFS
	seeds := &fakeSeeds{}
	h.g.deps.Seeds = seeds
	h.ate.ExternalHomes = true
	ctx := context.Background()

	h.running("inst-1")
	ref := actors.Ref{Atespace: testAtespace, Name: "dbx-inst-1"}
	actor, err := h.g.deps.Actors.GetActor(ctx, ref)
	if err != nil {
		t.Fatal(err)
	}
	if actor.GetSourceTag() != nil || !h.ate.Preview(ref.Atespace, ref.Name) {
		t.Fatalf("the actor must take the template's golden tag with the preview header: source %v", actor.GetSourceTag())
	}

	snapshot := func(id string) *devboxv1.ReportSnapshotRequest {
		t.Helper()
		if _, err := h.g.SnapshotInstance(ctx, &devboxv1.SnapshotInstanceRequest{InstanceId: "inst-1", SnapshotId: id}); err != nil {
			t.Fatal(err)
		}
		var report *devboxv1.ReportSnapshotRequest
		h.eventually("snapshot "+id, func() bool {
			h.ingest.mu.Lock()
			defer h.ingest.mu.Unlock()
			for _, r := range h.ingest.snapshots {
				if r.GetSnapshotId() == id {
					report = r
				}
			}
			return report != nil
		})
		h.eventually("running again", func() bool { return h.g.get("inst-1").status() == devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING })
		return report
	}
	if r := snapshot("snap-1"); r.GetState() != devboxv1.SnapshotState_SNAPSHOT_STATE_SUCCEEDED {
		t.Fatalf("snapshot report = %v", r)
	}
	seeds.mu.Lock()
	saved := maps.Clone(seeds.saved)
	seeds.mu.Unlock()
	if want := map[string]string{testAtespace + ".tag.snap-snap-1": "substrate-" + actor.GetMetadata().GetUid() + "-home"}; !maps.Equal(saved, want) {
		t.Fatalf("seeds = %v, want %v", saved, want)
	}

	_, err = h.g.StartFromSnapshot(ctx, &devboxv1.StartFromSnapshotRequest{
		Instance: &devboxv1.CreateInstanceRequest{InstanceId: "inst-2", RunnerName: testRunner},
		Snapshot: &devboxv1.SnapshotRef{SnapshotId: "snap-1", Tag: testAtespace + "/snap-snap-1", TemplateRevision: 2},
	})
	if status.Code(err) != codes.Unimplemented || detailOf(err, 0).GetReason() != devboxv1.ErrorReason_ERROR_REASON_UNSUPPORTED {
		t.Fatalf("StartFromSnapshot = %v, want UNSUPPORTED", err)
	}
	if h.g.get("inst-2") != nil {
		t.Fatal("a rejected start registered an instance")
	}

	if _, err := h.g.DeleteSnapshot(ctx, &devboxv1.DeleteSnapshotRequest{Snapshot: &devboxv1.SnapshotRef{Tag: testAtespace + "/snap-snap-1"}}); err != nil {
		t.Fatal(err)
	}
	seeds.mu.Lock()
	deleted := slices.Clone(seeds.deleted)
	seeds.failErr = errors.New("juicefs controller unavailable")
	seeds.mu.Unlock()
	if !slices.Equal(deleted, []string{testAtespace + ".tag.snap-snap-1"}) {
		t.Fatalf("deleted seeds = %v", deleted)
	}

	if r := snapshot("snap-2"); r.GetState() != devboxv1.SnapshotState_SNAPSHOT_STATE_FAILED {
		t.Fatalf("a snapshot whose home wasn't saved = %v, want FAILED", r)
	}
	if _, err := h.g.deps.Actors.GetTag(ctx, actors.Ref{Atespace: testAtespace, Name: "snap-snap-2"}); status.Code(err) != codes.NotFound {
		t.Fatalf("the failed snapshot's tag is left behind: %v", err)
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

// A checkpoint cut off by its deadline leaves the actor SUSPENDING; the instance is recorded suspended and the next
// resume finishes the suspend instead of failing "AssignWorker prerequisite not met (got: ACTOR_STATE_SUSPENDING)".
func TestResumeAfterASuspendCutOffMidway(t *testing.T) {
	h := newHarness(t, nil)
	h.running("inst-1")
	h.ate.FailSuspend = status.Error(codes.DeadlineExceeded, "workflow failed at step CallAteletSuspend: while calling atelet Checkpoint: context deadline exceeded")
	h.ate.FailSuspendTimes = 1

	req := &devboxv1.InstanceActionRequest{InstanceId: "inst-1"}
	resp, err := h.g.SuspendInstance(context.Background(), req)
	if err != nil || resp.GetStatus() != devboxv1.InstanceStatus_INSTANCE_STATUS_SUSPENDED {
		t.Fatalf("suspend = %v, %v", resp, err)
	}
	if got := h.ate.State(testAtespace, "dbx-inst-1"); got != ateapi.ActorState_ACTOR_STATE_SUSPENDING {
		t.Fatalf("actor state = %s", got)
	}

	resp, err = h.g.ResumeInstance(context.Background(), req)
	if err != nil || resp.GetStatus() != devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING {
		t.Fatalf("resume = %v, %v", resp, err)
	}
	if got := h.ate.State(testAtespace, "dbx-inst-1"); got != ateapi.ActorState_ACTOR_STATE_RUNNING {
		t.Fatalf("actor state = %s", got)
	}
}

// Console calls SuspendInstance with a 30s deadline, shorter than a prepare, drain and memory checkpoint can take;
// the suspend carries on past it rather than abandoning the checkpoint midway.
func TestSuspendOutlivesTheCallersDeadline(t *testing.T) {
	h := newHarness(t, nil)
	h.running("inst-1")
	// substrate is busy for the first attempts (backing off 5+10+20+40ms)
	h.ate.FailSuspend = status.Error(codes.Aborted, "another operation is in progress for this actor")
	h.ate.FailSuspendTimes = 4

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
	defer cancel()
	resp, err := h.g.SuspendInstance(ctx, &devboxv1.InstanceActionRequest{InstanceId: "inst-1"})
	if err != nil || resp.GetStatus() != devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING {
		t.Fatalf("an impatient suspend = %v, %v", resp, err)
	}
	h.eventually("the suspend to land", func() bool {
		return h.ate.State(testAtespace, "dbx-inst-1") == ateapi.ActorState_ACTOR_STATE_SUSPENDED &&
			slices.Contains(h.ingest.statusList(), "SUSPENDED")
	})
}

func TestResumeAnswersBeforeTheCallersDeadline(t *testing.T) {
	h := newHarness(t, nil)
	h.running("inst-1")
	if _, err := h.g.SuspendInstance(context.Background(), &devboxv1.InstanceActionRequest{InstanceId: "inst-1"}); err != nil {
		t.Fatal(err)
	}
	h.ate.FailResume = status.Error(codes.Unavailable, "worker gone")
	h.ate.FailResumeTimes = 1 << 20

	deadline := time.Now().Add(time.Second)
	ctx, cancel := context.WithDeadline(context.Background(), deadline)
	defer cancel()
	_, err := h.g.ResumeInstance(ctx, &devboxv1.InstanceActionRequest{InstanceId: "inst-1"})
	if reasonOf(err) != devboxv1.ErrorReason_ERROR_REASON_INSTANCE_STARTING {
		t.Fatalf("resume = %v", err)
	}
	if left := time.Until(deadline); left < 50*time.Millisecond {
		t.Fatalf("answered %s before the deadline, too late to make it back through a proxy", left)
	}
}

func TestResumeOutlivesTheCallersDeadline(t *testing.T) {
	h := newHarness(t, nil)
	h.running("inst-1")
	if _, err := h.g.SuspendInstance(context.Background(), &devboxv1.InstanceActionRequest{InstanceId: "inst-1"}); err != nil {
		t.Fatal(err)
	}
	// a slow restore: substrate is unavailable for the first attempts (backing off 5+10+20+40ms)
	h.ate.FailResume = status.Error(codes.Unavailable, "worker gone")
	h.ate.FailResumeTimes = 4

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

func TestZeroFSHomes(t *testing.T) {
	h := newHarness(t, nil)
	runner := h.g.deps.Runners.(StaticRunners)[testRunner]
	runner.HomeStorage = v1alpha1.DevboxHomeZeroFS
	runner.Revisions[2] = RunnerRevision{Template: "tmpl-r2", GoldenTag: "golden-r2", HomeStorage: v1alpha1.DevboxHomeZeroFS}
	// The JuiceFS seed client must never see a ZeroFS volume.
	seeds := &fakeSeeds{failErr: errors.New("not a JuiceFS volume")}
	h.g.deps.Seeds = seeds
	h.ate.ExternalHomes = true
	ctx := context.Background()

	h.running("inst-1")
	ref := actors.Ref{Atespace: testAtespace, Name: "dbx-inst-1"}
	actor, err := h.g.deps.Actors.GetActor(ctx, ref)
	if err != nil {
		t.Fatal(err)
	}
	if actor.GetSourceTag() != nil || !h.ate.Preview(ref.Atespace, ref.Name) {
		t.Fatalf("the actor must take the template's golden tag with the preview header: source %v", actor.GetSourceTag())
	}

	// As after a restart whose adopt couldn't read the runner.
	inst := h.g.get("inst-1")
	inst.mu.Lock()
	inst.runner = nil
	inst.mu.Unlock()
	if _, err := h.g.SnapshotInstance(ctx, &devboxv1.SnapshotInstanceRequest{InstanceId: "inst-1", SnapshotId: "snap-1"}); err != nil {
		t.Fatal(err)
	}
	var report *devboxv1.ReportSnapshotRequest
	h.eventually("snapshot", func() bool {
		h.ingest.mu.Lock()
		defer h.ingest.mu.Unlock()
		for _, r := range h.ingest.snapshots {
			if r.GetSnapshotId() == "snap-1" {
				report = r
			}
		}
		return report != nil
	})
	if report.GetState() != devboxv1.SnapshotState_SNAPSHOT_STATE_SUCCEEDED {
		t.Fatalf("snapshot report = %v", report)
	}
	seeds.mu.Lock()
	saved := len(seeds.saved)
	seeds.mu.Unlock()
	if saved != 0 {
		t.Fatalf("a ZeroFS home was saved as a JuiceFS seed: %v", seeds.saved)
	}

	_, err = h.g.StartFromSnapshot(ctx, &devboxv1.StartFromSnapshotRequest{
		Instance: &devboxv1.CreateInstanceRequest{InstanceId: "inst-2", RunnerName: testRunner},
		Snapshot: &devboxv1.SnapshotRef{SnapshotId: "snap-1", Tag: testAtespace + "/snap-snap-1", TemplateRevision: 2},
	})
	if status.Code(err) != codes.Unimplemented || !strings.Contains(err.Error(), "ZeroFS") {
		t.Fatalf("StartFromSnapshot = %v, want Unimplemented for ZeroFS homes", err)
	}
}
