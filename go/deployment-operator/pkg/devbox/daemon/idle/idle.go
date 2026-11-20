// Package idle is the daemon's suspend detector (DBX-47, section 4.3a). It evaluates activity signals, reports
// IdleState changes and emits SuspendRequested once the instance has been idle for the grace period (or a
// ceiling is reached). The gateway executes the suspend.
package idle

import (
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/timestamppb"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/internal/clock"
)

// Policy defaults (IdlePolicy).
const (
	DefaultActivityWindow     = 2 * time.Minute
	DefaultCPUThreshold       = 5.0
	DefaultGracePeriod        = 5 * time.Minute
	DefaultMaxDeferral        = 12 * time.Hour
	DefaultMaxContinuousAwake = 24 * time.Hour
)

// Policy is the resolved idle policy.
type Policy struct {
	ActivityWindow     time.Duration
	CPUThresholdPct    float64
	GracePeriod        time.Duration
	MaxDeferral        time.Duration
	MaxContinuousAwake time.Duration
}

// PolicyOf resolves an IdlePolicy with defaults.
func PolicyOf(p *devboxv1.IdlePolicy) Policy {
	out := Policy{DefaultActivityWindow, DefaultCPUThreshold, DefaultGracePeriod, DefaultMaxDeferral, DefaultMaxContinuousAwake}
	if d := p.GetActivityWindow(); d != nil && d.AsDuration() > 0 {
		out.ActivityWindow = d.AsDuration()
	}
	if v := p.GetCpuThresholdPercent(); v > 0 {
		out.CPUThresholdPct = v
	}
	if d := p.GetGracePeriod(); d != nil && d.AsDuration() > 0 {
		out.GracePeriod = d.AsDuration()
	}
	if d := p.GetMaxDeferral(); d != nil && d.AsDuration() > 0 {
		out.MaxDeferral = d.AsDuration()
	}
	if d := p.GetMaxContinuousAwake(); d != nil && d.AsDuration() > 0 {
		out.MaxContinuousAwake = d.AsDuration()
	}
	return out
}

// TerminalJob is a PTY foreground job.
type TerminalJob struct {
	TerminalID string
	Command    string
	// Pgid is the job's process group (for CPU attribution); 0 when unknown.
	Pgid int
}

// Sources provide the signals.
type Sources struct {
	// Agent returns agent turn and pending-interaction reasons.
	Agent func(now time.Time) []*devboxv1.BusyReason
	// TerminalJobs returns PTY foreground jobs.
	TerminalJobs func() []TerminalJob
	// StreamActivity returns the last byte time of each interactive stream source (terminal, vnc, preview, cdp).
	StreamActivity func() map[string]time.Time
	// CPU samples process CPU outside the daemon.
	CPU CPUSampler
}

// CPUSampler reports CPU usage since the previous sample, as percent of one core, in total and per process
// group.
type CPUSampler interface {
	Sample(now time.Time) (total float64, byPgid map[int]float64)
}

// Emitter receives detector events.
type Emitter interface {
	IdleState(*devboxv1.IdleState)
	SuspendRequested(*devboxv1.SuspendRequested)
}

// Detector is the idle state machine.
type Detector struct {
	clock clock.Clock
	src   Sources
	emit  Emitter
	// SettledOffset settles in-flight entities and returns the log offset through which everything is settled.
	SettledOffset func() uint64

	mu           sync.Mutex
	policy       Policy
	leases       []*devboxv1.Lease
	leaseGen     uint64
	awakeSince   time.Time
	idleSince    time.Time
	requested    bool
	ceilingFired bool
	cpuBusyAt    time.Time
	jobBusyAt    map[int]time.Time
	lastKey      string
	state        *devboxv1.IdleState
	resetAt      time.Time
}

// New returns a Detector.
func New(c clock.Clock, policy Policy, src Sources, emit Emitter) *Detector {
	if c == nil {
		c = clock.Real{}
	}
	now := c.Now()
	return &Detector{clock: c, src: src, emit: emit, policy: policy, awakeSince: now, cpuBusyAt: now, resetAt: now, jobBusyAt: map[int]time.Time{}}
}

// SetPolicy replaces the policy (Initialize).
func (d *Detector) SetPolicy(p Policy) {
	d.mu.Lock()
	defer d.mu.Unlock()
	d.policy = p
}

// SetLeases replaces the leases when generation is newer than the last applied one. Deferrals are clamped to
// now + maxDeferral; expired leases are dropped.
func (d *Detector) SetLeases(leases []*devboxv1.Lease, generation uint64) []*devboxv1.Lease {
	d.mu.Lock()
	defer d.mu.Unlock()
	if generation != 0 && generation < d.leaseGen {
		return d.leases
	}
	d.leaseGen = generation
	now := d.clock.Now()
	limit := now.Add(d.policy.MaxDeferral)
	var out []*devboxv1.Lease
	for _, l := range leases {
		l = proto.Clone(l).(*devboxv1.Lease)
		exp := l.GetExpiresAt().AsTime()
		if l.GetKind() == devboxv1.LeaseKind_LEASE_KIND_DEFERRAL {
			if l.RequestedUntil == nil {
				l.RequestedUntil = l.GetExpiresAt()
			}
			if exp.After(limit) {
				exp = limit
				l.ExpiresAt = timestamppb.New(exp)
			}
		}
		if !exp.After(now) {
			continue
		}
		out = append(out, l)
	}
	d.leases = out
	return out
}

// Reset restarts activity timers (memory restore detected, or a fresh boot).
func (d *Detector) Reset() {
	d.mu.Lock()
	defer d.mu.Unlock()
	now := d.clock.Now()
	d.awakeSince, d.cpuBusyAt, d.resetAt = now, now, now
	d.idleSince = time.Time{}
	d.requested, d.ceilingFired = false, false
	d.jobBusyAt = map[int]time.Time{}
}

// State returns the last evaluated state.
func (d *Detector) State() *devboxv1.IdleState {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.state == nil {
		return &devboxv1.IdleState{EvaluatedAt: timestamppb.New(d.clock.Now())}
	}
	return proto.Clone(d.state).(*devboxv1.IdleState)
}

// Evaluate runs one evaluation and emits events. It's called on a ticker (and directly by tests).
func (d *Detector) Evaluate() *devboxv1.IdleState {
	now := d.clock.Now()
	var agent []*devboxv1.BusyReason
	if d.src.Agent != nil {
		agent = d.src.Agent(now)
	}
	var jobs []TerminalJob
	if d.src.TerminalJobs != nil {
		jobs = d.src.TerminalJobs()
	}
	var streams map[string]time.Time
	if d.src.StreamActivity != nil {
		streams = d.src.StreamActivity()
	}
	var total float64
	var byPgid map[int]float64
	sampled := false
	if d.src.CPU != nil {
		total, byPgid = d.src.CPU.Sample(now)
		sampled = true
	}

	d.mu.Lock()
	defer d.mu.Unlock()
	p := d.policy
	var reasons []*devboxv1.BusyReason
	reasons = append(reasons, agent...)

	if sampled && total >= p.CPUThresholdPct {
		d.cpuBusyAt = now
	}
	if until := d.cpuBusyAt.Add(p.ActivityWindow); now.Before(until) && d.cpuBusyAt.After(d.resetAt) {
		reasons = append(reasons, &devboxv1.BusyReason{Kind: devboxv1.BusyReasonKind_BUSY_REASON_KIND_PROCESS_ACTIVITY,
			Detail: fmt.Sprintf("CPU above %.0f%%", p.CPUThresholdPct), Until: timestamppb.New(until)})
	}

	reasons = append(reasons, d.jobReasonsLocked(now, jobs, byPgid)...)
	reasons = append(reasons, d.streamReasonsLocked(now, streams)...)
	reasons = append(reasons, d.leaseReasonsLocked(now)...)

	idle := len(reasons) == 0
	if idle {
		if d.idleSince.IsZero() {
			d.idleSince = now
		}
	} else {
		d.idleSince = time.Time{}
		d.requested = false
	}
	st := &devboxv1.IdleState{Idle: idle, BusyReasons: reasons, EvaluatedAt: timestamppb.New(now)}
	if idle {
		st.IdleSince = timestamppb.New(d.idleSince)
		st.SuspendAt = timestamppb.New(d.idleSince.Add(p.GracePeriod))
	}
	d.state = st
	if key := stateKey(st); key != d.lastKey {
		d.lastKey = key
		if d.emit != nil {
			d.emit.IdleState(proto.Clone(st).(*devboxv1.IdleState))
		}
	}

	var req *devboxv1.SuspendRequested
	switch {
	case idle && !d.requested && !now.Before(d.idleSince.Add(p.GracePeriod)):
		d.requested = true
		req = &devboxv1.SuspendRequested{Reason: devboxv1.SuspendReason_SUSPEND_REASON_IDLE, IdleSince: timestamppb.New(d.idleSince)}
	case !d.ceilingFired && p.MaxContinuousAwake > 0 && now.Sub(d.awakeSince) >= p.MaxContinuousAwake:
		d.ceilingFired = true
		req = &devboxv1.SuspendRequested{Reason: devboxv1.SuspendReason_SUSPEND_REASON_MAX_CONTINUOUS_AWAKE}
		if !d.idleSince.IsZero() {
			req.IdleSince = timestamppb.New(d.idleSince)
		}
	}
	if req != nil && d.emit != nil {
		settle := d.SettledOffset
		d.mu.Unlock()
		if settle != nil {
			req.SettledOffset = settle()
		}
		d.emit.SuspendRequested(req)
		d.mu.Lock()
	}
	return proto.Clone(st).(*devboxv1.IdleState)
}

// stateKey identifies a state for change detection: idle flag, idle_since and the busy reasons' kinds and
// subjects (not their moving `until`).
func stateKey(st *devboxv1.IdleState) string {
	var b strings.Builder
	fmt.Fprintf(&b, "%v|%d|", st.GetIdle(), st.GetIdleSince().AsTime().UnixNano())
	keys := make([]string, 0, len(st.GetBusyReasons()))
	for _, r := range st.GetBusyReasons() {
		keys = append(keys, fmt.Sprintf("%d:%s:%s:%s", r.GetKind(), r.GetDetail(), r.GetThreadId(), r.GetTerminalId()))
	}
	sort.Strings(keys)
	b.WriteString(strings.Join(keys, ","))
	return b.String()
}

// jobReasonsLocked tracks terminal jobs' activity, keeping a job busy for an activity window after it starts or last
// used CPU.
func (d *Detector) jobReasonsLocked(now time.Time, jobs []TerminalJob, byPgid map[int]float64) []*devboxv1.BusyReason {
	p := d.policy
	var reasons []*devboxv1.BusyReason
	live := map[int]bool{}
	for _, j := range jobs {
		live[j.Pgid] = true
		last, seen := d.jobBusyAt[j.Pgid]
		if !seen {
			// A new job is busy for at least one activity window.
			last = now
		}
		if byPgid != nil && byPgid[j.Pgid] >= p.CPUThresholdPct {
			last = now
		}
		d.jobBusyAt[j.Pgid] = last
		if until := last.Add(p.ActivityWindow); now.Before(until) {
			reasons = append(reasons, &devboxv1.BusyReason{Kind: devboxv1.BusyReasonKind_BUSY_REASON_KIND_TERMINAL_JOB,
				Detail: j.Command, TerminalId: j.TerminalID, Until: timestamppb.New(until)})
		}
	}
	for pg := range d.jobBusyAt {
		if !live[pg] {
			delete(d.jobBusyAt, pg)
		}
	}
	return reasons
}

func (d *Detector) streamReasonsLocked(now time.Time, streams map[string]time.Time) []*devboxv1.BusyReason {
	var reasons []*devboxv1.BusyReason
	kinds := make([]string, 0, len(streams))
	for k := range streams {
		kinds = append(kinds, k)
	}
	sort.Strings(kinds)
	for _, k := range kinds {
		last := streams[k]
		if last.Before(d.resetAt) {
			continue
		}
		if until := last.Add(d.policy.ActivityWindow); now.Before(until) {
			reasons = append(reasons, &devboxv1.BusyReason{Kind: devboxv1.BusyReasonKind_BUSY_REASON_KIND_INTERACTIVE_STREAM,
				Detail: k, Until: timestamppb.New(until)})
		}
	}
	return reasons
}

func (d *Detector) leaseReasonsLocked(now time.Time) []*devboxv1.BusyReason {
	var reasons []*devboxv1.BusyReason
	for _, l := range d.leases {
		exp := l.GetExpiresAt().AsTime()
		if !now.Before(exp) {
			continue
		}
		kind := devboxv1.BusyReasonKind_BUSY_REASON_KIND_VIEWER_LEASE
		detail := "viewer"
		if l.GetKind() == devboxv1.LeaseKind_LEASE_KIND_DEFERRAL {
			kind = devboxv1.BusyReasonKind_BUSY_REASON_KIND_DEFERRAL_LEASE
			detail = "kept awake"
		}
		if who := l.GetHolder().GetName(); who != "" {
			detail += " by " + who
		} else if who := l.GetHolder().GetEmail(); who != "" {
			detail += " by " + who
		}
		reasons = append(reasons, &devboxv1.BusyReason{Kind: kind, Detail: detail, Until: l.GetExpiresAt()})
	}
	return reasons
}
