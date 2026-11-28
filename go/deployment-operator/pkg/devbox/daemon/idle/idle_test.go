package idle

import (
	"testing"
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/internal/clock"
)

type events struct {
	states   []*devboxv1.IdleState
	requests []*devboxv1.SuspendRequested
}

func (e *events) IdleState(s *devboxv1.IdleState)               { e.states = append(e.states, s) }
func (e *events) SuspendRequested(r *devboxv1.SuspendRequested) { e.requests = append(e.requests, r) }

type fakeCPU struct {
	total  float64
	byPgid map[int]float64
}

func (f *fakeCPU) Sample(time.Time) (float64, map[int]float64) { return f.total, f.byPgid }

var start = time.Date(2026, 11, 13, 9, 0, 0, 0, time.UTC)

type fixture struct {
	clk     *clock.Fake
	d       *Detector
	ev      *events
	agent   []*devboxv1.BusyReason
	jobs    []TerminalJob
	streams map[string]time.Time
	cpu     *fakeCPU
}

func newFixture() *fixture {
	f := &fixture{clk: clock.NewFake(start), ev: &events{}, streams: map[string]time.Time{}, cpu: &fakeCPU{}}
	policy := Policy{ActivityWindow: 2 * time.Minute, CPUThresholdPct: 5, GracePeriod: 5 * time.Minute,
		MaxDeferral: 12 * time.Hour, MaxContinuousAwake: 24 * time.Hour}
	f.d = New(f.clk, policy, Sources{
		Agent:          func(time.Time) []*devboxv1.BusyReason { return f.agent },
		TerminalJobs:   func() []TerminalJob { return f.jobs },
		StreamActivity: func() map[string]time.Time { return f.streams },
		CPU:            f.cpu,
	}, f.ev)
	f.d.SettledOffset = func() uint64 { return 42 }
	return f
}

func (f *fixture) step(d time.Duration) *devboxv1.IdleState {
	f.clk.Advance(d)
	return f.d.Evaluate()
}

func TestIdleGraceAndSuspendOnce(t *testing.T) {
	f := newFixture()
	st := f.d.Evaluate()
	if !st.GetIdle() {
		t.Fatalf("fresh box with no activity should be idle: %v", st)
	}
	if st.GetSuspendAt().AsTime() != start.Add(5*time.Minute) {
		t.Fatalf("suspend_at %v", st.GetSuspendAt().AsTime())
	}
	f.step(4 * time.Minute)
	if len(f.ev.requests) != 0 {
		t.Fatal("suspend requested before the grace period")
	}
	f.step(time.Minute)
	if len(f.ev.requests) != 1 || f.ev.requests[0].GetReason() != devboxv1.SuspendReason_SUSPEND_REASON_IDLE ||
		f.ev.requests[0].GetSettledOffset() != 42 {
		t.Fatalf("requests %v", f.ev.requests)
	}
	f.step(time.Minute)
	if len(f.ev.requests) != 1 {
		t.Fatal("suspend requested twice in one idle episode")
	}
	if n := len(f.ev.states); n != 1 {
		t.Fatalf("idle state emitted %d times without a change", n)
	}
}

// stuckEmitter blocks in IdleState like an event log append on a hung home.
type stuckEmitter struct{ entered, release chan struct{} }

func (e *stuckEmitter) IdleState(*devboxv1.IdleState) {
	close(e.entered)
	<-e.release
}
func (e *stuckEmitter) SuspendRequested(*devboxv1.SuspendRequested) {}

func TestStateDoesNotWaitForAStuckEmit(t *testing.T) {
	f := newFixture()
	em := &stuckEmitter{entered: make(chan struct{}), release: make(chan struct{})}
	f.d.emit = em
	done := make(chan struct{})
	go func() {
		f.d.Evaluate()
		close(done)
	}()
	<-em.entered

	got := make(chan *devboxv1.IdleState, 1)
	go func() { got <- f.d.State() }()
	select {
	case st := <-got:
		if !st.GetIdle() {
			t.Fatalf("state %v", st)
		}
	case <-time.After(time.Second):
		t.Fatal("State waited for a stuck emit, so heartbeats would stop")
	}
	close(em.release)
	<-done
}

func TestBusySources(t *testing.T) {
	f := newFixture()
	f.agent = []*devboxv1.BusyReason{{Kind: devboxv1.BusyReasonKind_BUSY_REASON_KIND_AGENT_TURN, ThreadId: "t1"}}
	if f.d.Evaluate().GetIdle() {
		t.Fatal("running turn not busy")
	}
	f.agent = nil

	// A terminal job is busy for one activity window, then only while it uses CPU.
	f.jobs = []TerminalJob{{TerminalID: "term", Command: "make", Pgid: 77}}
	if f.step(time.Second).GetIdle() {
		t.Fatal("new job not busy")
	}
	if !f.step(3 * time.Minute).GetIdle() {
		t.Fatal("quiet job kept the box awake past the window")
	}
	f.cpu.byPgid = map[int]float64{77: 50}
	if f.step(time.Second).GetIdle() {
		t.Fatal("CPU-heavy job not busy")
	}
	f.jobs, f.cpu.byPgid = nil, nil

	// Interactive streams count for the activity window.
	f.streams["terminal"] = f.clk.Now()
	if f.step(time.Minute).GetIdle() {
		t.Fatal("recent stream activity not busy")
	}
	if !f.step(2 * time.Minute).GetIdle() {
		t.Fatal("stale stream activity still busy")
	}

	// Box-wide CPU.
	f.cpu.total = 80
	if f.step(time.Second).GetIdle() {
		t.Fatal("CPU not busy")
	}
	f.cpu.total = 0
	if !f.step(3 * time.Minute).GetIdle() {
		t.Fatal("CPU window did not expire")
	}
}

func TestLeases(t *testing.T) {
	f := newFixture()
	now := f.clk.Now()
	leases := f.d.SetLeases([]*devboxv1.Lease{
		{Kind: devboxv1.LeaseKind_LEASE_KIND_DEFERRAL, ExpiresAt: timestamppb.New(now.Add(48 * time.Hour)), Holder: &devboxv1.Principal{Name: "Alice"}},
		{Kind: devboxv1.LeaseKind_LEASE_KIND_VIEWER, ExpiresAt: timestamppb.New(now.Add(-time.Minute))},
	}, 2)
	if len(leases) != 1 {
		t.Fatalf("expired lease kept: %v", leases)
	}
	if got := leases[0].GetExpiresAt().AsTime(); got != now.Add(12*time.Hour) {
		t.Fatalf("deferral not clamped: %v", got)
	}
	if leases[0].GetRequestedUntil().AsTime() != now.Add(48*time.Hour) {
		t.Fatal("requested_until lost")
	}
	st := f.d.Evaluate()
	if st.GetIdle() || st.GetBusyReasons()[0].GetDetail() != "kept awake by Alice" {
		t.Fatalf("deferral not busy: %v", st)
	}
	if got := f.d.SetLeases(nil, 1); len(got) != 1 {
		t.Fatal("older generation replaced leases")
	}
	f.step(12*time.Hour + time.Second)
	if !f.d.Evaluate().GetIdle() {
		t.Fatal("expired deferral still busy")
	}
}

func TestCeilingWaitsForTheAgentTurn(t *testing.T) {
	f := newFixture()
	f.agent = []*devboxv1.BusyReason{{Kind: devboxv1.BusyReasonKind_BUSY_REASON_KIND_AGENT_TURN, Detail: "fix the build"}}
	f.step(30 * time.Hour)
	if len(f.ev.requests) != 0 {
		t.Fatalf("ceiling cut off a running turn: %v", f.ev.requests)
	}
	if why := f.d.Veto(devboxv1.SuspendReason_SUSPEND_REASON_MAX_CONTINUOUS_AWAKE); why == "" {
		t.Fatal("max-awake suspend not vetoed during a turn")
	}
	f.agent = nil
	f.step(time.Minute)
	if len(f.ev.requests) != 1 || f.ev.requests[0].GetReason() != devboxv1.SuspendReason_SUSPEND_REASON_MAX_CONTINUOUS_AWAKE {
		t.Fatalf("ceiling after the turn: %v", f.ev.requests)
	}
	if why := f.d.Veto(devboxv1.SuspendReason_SUSPEND_REASON_MAX_CONTINUOUS_AWAKE); why != "" {
		t.Fatalf("vetoed with no turn running: %s", why)
	}
}

func TestVetoesAnIdleSuspendOnceBusy(t *testing.T) {
	f := newFixture()
	f.d.Evaluate()
	f.step(5 * time.Minute)
	if len(f.ev.requests) != 1 {
		t.Fatalf("requests %v", f.ev.requests)
	}
	if why := f.d.Veto(devboxv1.SuspendReason_SUSPEND_REASON_IDLE); why != "" {
		t.Fatalf("idle box vetoed: %s", why)
	}
	// A prompt lands between the request and the suspend.
	f.agent = []*devboxv1.BusyReason{{Kind: devboxv1.BusyReasonKind_BUSY_REASON_KIND_AGENT_TURN, Detail: "next task"}}
	if why := f.d.Veto(devboxv1.SuspendReason_SUSPEND_REASON_IDLE); why == "" {
		t.Fatal("idle suspend not vetoed once a turn started")
	}
	if why := f.d.Veto(devboxv1.SuspendReason_SUSPEND_REASON_USER); why != "" {
		t.Fatalf("user suspend vetoed: %s", why)
	}
	// The turn ends: a fresh grace period, then a new request.
	f.agent = nil
	f.d.Evaluate()
	f.step(5 * time.Minute)
	if len(f.ev.requests) != 2 {
		t.Fatalf("requests after the turn %v", f.ev.requests)
	}
}

func TestMaxContinuousAwakeAndReset(t *testing.T) {
	f := newFixture()
	f.cpu.total = 50
	f.step(23 * time.Hour)
	if len(f.ev.requests) != 0 {
		t.Fatal("ceiling fired early")
	}
	f.step(time.Hour)
	if len(f.ev.requests) != 1 || f.ev.requests[0].GetReason() != devboxv1.SuspendReason_SUSPEND_REASON_MAX_CONTINUOUS_AWAKE {
		t.Fatalf("ceiling: %v", f.ev.requests)
	}
	f.step(time.Hour)
	if len(f.ev.requests) != 1 {
		t.Fatal("ceiling fired twice")
	}

	// A memory restore: the wall clock jumps; Reset restarts the timers so stale activity doesn't count.
	f.cpu.total = 0
	f.streams["browser"] = f.clk.Now()
	f.clk.Set(f.clk.Now().Add(30 * time.Second))
	f.d.Reset()
	st := f.d.Evaluate()
	if !st.GetIdle() {
		t.Fatalf("pre-restore stream activity counted after reset: %v", st)
	}
	f.step(5 * time.Minute)
	if len(f.ev.requests) != 2 || f.ev.requests[1].GetReason() != devboxv1.SuspendReason_SUSPEND_REASON_IDLE {
		t.Fatalf("requests after reset %v", f.ev.requests)
	}
}
