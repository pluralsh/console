package actors_test

import (
	"context"
	"slices"
	"sync"
	"testing"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/actors"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/actors/actorstest"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/egress"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate/ateapi"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/zones"
)

func newClient(t *testing.T) (*actors.Client, *actorstest.Server) {
	fake := actorstest.New()
	return actors.New(ateapi.NewControlClient(fake.Dial(t))).WithPollInterval(10 * time.Millisecond), fake
}

func TestActorLifecycle(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	c, fake := newClient(t)
	ref := actors.Ref{Atespace: "rs-1", Name: "i-abc"}

	a, err := c.CreateActor(ctx, actors.Spec{Ref: ref, Template: "tmpl-r1", SourceTag: "golden-r1"})
	if err != nil {
		t.Fatal(err)
	}
	if a.GetSourceTag().GetName() != "golden-r1" || a.GetActorTemplate().GetName() != "tmpl-r1" {
		t.Fatalf("created actor = %v", a)
	}
	// Idempotent.
	if _, err := c.CreateActor(ctx, actors.Spec{Ref: ref, Template: "tmpl-r1"}); err != nil {
		t.Fatal(err)
	}

	if err := c.Resume(ctx, ref); err != nil {
		t.Fatal(err)
	}
	if err := c.Resume(ctx, ref); err != nil {
		t.Fatalf("resume of a running actor should succeed: %v", err)
	}
	if _, err := c.WaitState(ctx, ref, ateapi.ActorState_ACTOR_STATE_RUNNING); err != nil {
		t.Fatal(err)
	}

	if err := c.Suspend(ctx, ref, true); err != nil {
		t.Fatal(err)
	}
	if err := c.Suspend(ctx, ref, false); err != nil {
		t.Fatalf("suspend of a suspended actor should succeed: %v", err)
	}
	if fake.SuspendModes[0] != ateapi.DurabilityMode_DURABILITY_MODE_SYNCHRONOUS {
		t.Fatalf("suspend mode = %v", fake.SuspendModes[0])
	}

	tag := actors.Ref{Atespace: "rs-1", Name: "snap-1"}
	if _, err := c.CreateTag(ctx, tag, ref); err != nil {
		t.Fatal(err)
	}
	tg, err := c.WaitTag(ctx, tag)
	if err != nil {
		t.Fatal(err)
	}
	if actors.TagFidelity(tg) != ateapi.SnapshotFidelity_SNAPSHOT_FIDELITY_MEMORY {
		t.Fatalf("fidelity = %v", actors.TagFidelity(tg))
	}

	if err := c.SetTemplate(ctx, ref, "tmpl-r2"); err != nil {
		t.Fatal(err)
	}
	if a, _ := c.GetActor(ctx, ref); a.GetActorTemplate().GetName() != "tmpl-r2" {
		t.Fatalf("template = %s", a.GetActorTemplate().GetName())
	}

	fake.SetState("rs-1", "i-abc", ateapi.ActorState_ACTOR_STATE_CRASHED, "")
	if _, err := c.WaitState(ctx, ref, ateapi.ActorState_ACTOR_STATE_RUNNING); err == nil {
		t.Fatal("expected ErrCrashed")
	}
	if err := c.Revert(ctx, ref); err != nil {
		t.Fatal(err)
	}

	if err := c.ApplyEgressPolicy(ctx, ref, nil); err != nil {
		t.Fatal(err)
	}
	if err := c.DeleteActor(ctx, ref); err != nil {
		t.Fatal(err)
	}
	if err := c.DeleteActor(ctx, ref); err != nil {
		t.Fatalf("second delete should be a no-op: %v", err)
	}
	if err := c.DeleteTag(ctx, tag); err != nil {
		t.Fatal(err)
	}
	if err := c.DeleteTag(ctx, tag); err != nil {
		t.Fatal(err)
	}
	if !slices.Contains(fake.CallsSnapshot(), "DeleteActorEgressPolicy rs-1/i-abc") {
		t.Fatalf("egress policy not deleted with the actor: %v", fake.CallsSnapshot())
	}
}

// running creates an actor and resumes it.
func running(t *testing.T, c *actors.Client, ref actors.Ref) {
	t.Helper()
	if _, err := c.CreateActor(context.Background(), actors.Spec{Ref: ref, Template: "t"}); err != nil {
		t.Fatal(err)
	}
	if err := c.Resume(context.Background(), ref); err != nil {
		t.Fatal(err)
	}
}

func TestResumeConvergesFromWhatAnInterruptedOperationLeft(t *testing.T) {
	ref := actors.Ref{Atespace: "rs-1", Name: "i-abc"}
	for _, tc := range []struct {
		name  string
		state ateapi.ActorState
		// the RPC that repairs it before the resume
		repair string
	}{
		// a checkpoint cut off by its deadline: AssignWorker prerequisite not met (got: SUSPENDING)
		{"suspend cut off midway", ateapi.ActorState_ACTOR_STATE_SUSPENDING, "SuspendActor"},
		{"crashed", ateapi.ActorState_ACTOR_STATE_CRASHED, "RevertActor"},
		// a resume that died after assigning a worker is re-entered, not waited on
		{"resume died midway", ateapi.ActorState_ACTOR_STATE_RESUMING, ""},
	} {
		t.Run(tc.name, func(t *testing.T) {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			c, fake := newClient(t)
			running(t, c, ref)
			fake.SetState(ref.Atespace, ref.Name, tc.state, "worker-1")
			before := len(fake.CallsSnapshot())

			if err := c.Resume(ctx, ref); err != nil {
				t.Fatal(err)
			}
			if got := fake.State(ref.Atespace, ref.Name); got != ateapi.ActorState_ACTOR_STATE_RUNNING {
				t.Fatalf("state = %s", got)
			}
			calls := fake.CallsSnapshot()[before:]
			if tc.repair != "" && !slices.Contains(calls, tc.repair+" rs-1/i-abc") {
				t.Fatalf("calls = %v, want a %s", calls, tc.repair)
			}
		})
	}
}

func TestResumeRetriesAnOperationInFlight(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	c, fake := newClient(t)
	ref := actors.Ref{Atespace: "rs-1", Name: "i-abc"}
	if _, err := c.CreateActor(ctx, actors.Spec{Ref: ref, Template: "t"}); err != nil {
		t.Fatal(err)
	}
	fake.FailResume = status.Error(codes.Aborted, "another operation is in progress for this actor")
	fake.FailResumeTimes = 2
	if err := c.Resume(ctx, ref); err != nil {
		t.Fatal(err)
	}
	if got := fake.State(ref.Atespace, ref.Name); got != ateapi.ActorState_ACTOR_STATE_RUNNING {
		t.Fatalf("state = %s", got)
	}
}

func TestResumeWaitsBrieflyForAWorkerWithRoom(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	c, fake := newClient(t)
	ref := actors.Ref{Atespace: "rs-1", Name: "i-abc"}
	if _, err := c.CreateActor(ctx, actors.Spec{Ref: ref, Template: "t"}); err != nil {
		t.Fatal(err)
	}
	fake.FailResume = status.Error(codes.ResourceExhausted, "no worker that meets the constraints has room")
	fake.FailResumeTimes = 2
	if err := c.Resume(ctx, ref); err != nil {
		t.Fatal(err)
	}
	if got := fake.State(ref.Atespace, ref.Name); got != ateapi.ActorState_ACTOR_STATE_RUNNING {
		t.Fatalf("state = %s", got)
	}

	fake.SetState(ref.Atespace, ref.Name, ateapi.ActorState_ACTOR_STATE_SUSPENDED, "")
	fake.FailResume, fake.FailResumeTimes = status.Error(codes.ResourceExhausted, "no worker that meets the constraints has room"), 0
	if err := c.WithCapacityWait(30*time.Millisecond).Resume(ctx, ref); status.Code(err) != codes.ResourceExhausted {
		t.Fatalf("resume with the pool full past the wait = %v", err)
	}
	if ctx.Err() != nil {
		t.Fatal("resume kept waiting past the capacity wait")
	}
}

type recordedDemand struct {
	mu    sync.Mutex
	wants []string
	done  []string
}

func (d *recordedDemand) Want(_ context.Context, atespace, actor, zone string) error {
	d.mu.Lock()
	defer d.mu.Unlock()
	d.wants = append(d.wants, atespace+"/"+actor+"@"+zone)
	return nil
}

func (d *recordedDemand) Done(_ context.Context, atespace, actor string) error {
	d.mu.Lock()
	defer d.mu.Unlock()
	d.done = append(d.done, atespace+"/"+actor)
	return nil
}

func TestResumeOfAZonalActorWaitsForItsZoneAsDemand(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	c, fake := newClient(t)
	demand := &recordedDemand{}
	c.WithDemand(demand).WithCapacityWait(time.Millisecond)
	ref := actors.Ref{Atespace: "rs-1", Name: "i-abc"}
	a, err := c.CreateActor(ctx, actors.Spec{Ref: ref, Template: "t", Zone: "us-east-2b"})
	if err != nil {
		t.Fatal(err)
	}
	if got := zones.OfActor(a); got != "us-east-2b" {
		t.Fatalf("actor zone = %q", got)
	}

	fake.FailResume = status.Error(codes.ResourceExhausted, "no worker that meets the constraints has room")
	fake.FailResumeTimes = 3
	if err := c.Resume(ctx, ref); err != nil {
		t.Fatalf("a zonal resume waits past the capacity wait for its zone's worker: %v", err)
	}
	if len(demand.wants) == 0 || demand.wants[0] != "rs-1/i-abc@us-east-2b" {
		t.Fatalf("demand wants = %v", demand.wants)
	}
	if !slices.Equal(demand.done, []string{"rs-1/i-abc"}) {
		t.Fatalf("demand done = %v", demand.done)
	}

	fake.SetState(ref.Atespace, ref.Name, ateapi.ActorState_ACTOR_STATE_SUSPENDED, "")
	fake.FailResume, fake.FailResumeTimes = status.Error(codes.ResourceExhausted, "no worker that meets the constraints has room"), 0
	short, cancelShort := context.WithTimeout(ctx, 100*time.Millisecond)
	defer cancelShort()
	if err := c.Resume(short, ref); status.Code(err) != codes.ResourceExhausted {
		t.Fatalf("a zonal resume out of time reports no capacity, got %v", err)
	}
	if len(demand.done) != 2 {
		t.Fatalf("demand done = %v, want it cleared when the wait ends", demand.done)
	}
}

func TestResumeDoesNotRetryAHardFailure(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	c, fake := newClient(t)
	ref := actors.Ref{Atespace: "rs-1", Name: "i-abc"}
	running(t, c, ref)
	fake.SetState(ref.Atespace, ref.Name, ateapi.ActorState_ACTOR_STATE_DELETING, "")
	if err := c.Resume(ctx, ref); status.Code(err) != codes.FailedPrecondition {
		t.Fatalf("resume of a deleting actor = %v", err)
	}
	if ctx.Err() != nil {
		t.Fatal("a hard failure should return at once")
	}
}

func TestSuspendFinishesAnInterruptedSuspend(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	c, fake := newClient(t)
	ref := actors.Ref{Atespace: "rs-1", Name: "i-abc"}
	running(t, c, ref)
	// cut off midway twice
	fake.FailSuspend = status.Error(codes.Unavailable, "while calling atelet Checkpoint: connection refused")
	fake.FailSuspendTimes = 2
	if err := c.Suspend(ctx, ref, false); err != nil {
		t.Fatal(err)
	}
	if got := fake.State(ref.Atespace, ref.Name); got != ateapi.ActorState_ACTOR_STATE_SUSPENDED {
		t.Fatalf("state = %s", got)
	}

	// a deadline is the caller's, not retried: the actor is left SUSPENDING for the next resume to finish
	running(t, c, ref)
	fake.FailSuspend = status.Error(codes.DeadlineExceeded, "while calling atelet Checkpoint: context deadline exceeded")
	fake.FailSuspendTimes = 1
	if err := c.Suspend(ctx, ref, false); status.Code(err) != codes.DeadlineExceeded {
		t.Fatalf("suspend = %v", err)
	}
	if got := fake.State(ref.Atespace, ref.Name); got != ateapi.ActorState_ACTOR_STATE_SUSPENDING {
		t.Fatalf("state = %s", got)
	}
	if err := c.Resume(ctx, ref); err != nil {
		t.Fatal(err)
	}
	if got := fake.State(ref.Atespace, ref.Name); got != ateapi.ActorState_ACTOR_STATE_RUNNING {
		t.Fatalf("state = %s", got)
	}
}

func TestEgressPolicyApplyAndConvert(t *testing.T) {
	ctx := context.Background()
	c, fake := newClient(t)
	ref := actors.Ref{Atespace: "rs-1", Name: "i-abc"}
	if _, err := c.CreateActor(ctx, actors.Spec{Ref: ref, Template: "t"}); err != nil {
		t.Fatal(err)
	}

	policy := egress.BuildPolicy(egress.InstanceInfo{
		InstanceID:    "inst-1",
		SCMHosts:      []string{"github.com"},
		ConsoleHost:   "console.example.com",
		HTTPAllowlist: []egress.AllowEntry{{Host: "pypi.org"}, {Host: "db.internal", Port: 5432, Passthrough: true}},
		Gateway:       egress.GatewayEndpoint{Host: "devbox-gateway.ns.svc", Port: 8080},
	})
	rules := actors.EgressRules(policy)
	if err := c.ApplyEgressPolicy(ctx, ref, rules); err != nil {
		t.Fatal(err)
	}
	// A second apply updates in place with the stored uid/version as preconditions.
	if err := c.ApplyEgressPolicy(ctx, ref, rules[:2]); err != nil {
		t.Fatal(err)
	}
	if got := fake.Policy("rs-1", "i-abc"); len(got.GetRules()) != 2 {
		t.Fatalf("policy has %d rules after update", len(got.GetRules()))
	}

	var sawSecret, sawJWT, sawPassthrough, sawHTTP bool
	for _, r := range rules {
		switch {
		case r.GetHttps() != nil && r.GetHttps().GetHostnames()[0] == "github.com":
			hs := r.GetHttps().GetEffects().GetReplaceHeaders()
			sawSecret = len(hs) == 2 &&
				hs[0].GetCredentialUri() == egress.SecretURI("inst-1", egress.KindSCM, "github.com") && hs[0].GetHeader() == "Authorization" &&
				hs[1].GetCredentialUri() == egress.SecretURI("inst-1", egress.KindSCMToken, "github.com") && hs[1].GetHeader() == egress.PrivateTokenHeader
		case r.GetHttp() != nil:
			sawHTTP = r.GetHttp().GetPorts().GetNumbers()[0] == 8080
			sawJWT = r.GetHttp().GetEffects().GetReplaceHeaders()[0].GetActorJwt() != nil
		case r.GetTlsPassthrough() != nil:
			sawPassthrough = r.GetTlsPassthrough().GetPorts().GetNumbers()[0] == 5432
		}
	}
	if !sawSecret || !sawJWT || !sawPassthrough || !sawHTTP {
		t.Fatalf("conversion missing rules: secret=%v jwt=%v passthrough=%v http=%v\n%v", sawSecret, sawJWT, sawPassthrough, sawHTTP, rules)
	}
}

func TestDrainingWorkers(t *testing.T) {
	c, fake := newClient(t)
	fake.SetWorker("w1", ateapi.WorkerState_WORKER_STATE_ACTIVE)
	fake.SetWorker("w2", ateapi.WorkerState_WORKER_STATE_DRAINING)
	got, err := c.DrainingWorkers(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 1 || !got["w2"] {
		t.Fatalf("draining = %v", got)
	}
}

func TestParseRef(t *testing.T) {
	if r := actors.ParseRef("a/b", "x"); r.Atespace != "a" || r.Name != "b" {
		t.Fatal(r)
	}
	if r := actors.ParseRef("b", "x"); r.Atespace != "x" || r.Name != "b" {
		t.Fatal(r)
	}
}

func TestEgressRulesDefaultPorts(t *testing.T) {
	rules := actors.EgressRules(egress.Policy{Rules: []egress.Rule{
		{Host: "ai.example.com", Scheme: egress.SchemeHTTPS},
		{Host: "plain.example.com", Scheme: egress.SchemeHTTP},
		{Host: "db.example.com", Scheme: egress.SchemeTLSPassthrough},
	}})
	got := []int32{
		rules[0].GetHttps().GetPorts().GetNumbers()[0],
		rules[1].GetHttp().GetPorts().GetNumbers()[0],
		rules[2].GetTlsPassthrough().GetPorts().GetNumbers()[0],
	}
	if want := []int32{443, 80, 443}; !slices.Equal(got, want) {
		t.Fatalf("ports = %v, want %v", got, want)
	}
}
