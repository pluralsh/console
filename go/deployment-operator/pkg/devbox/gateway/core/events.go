package core

import (
	"context"
	"errors"
	"fmt"
	"io"
	"sync"
	"time"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
)

// forwarder holds the one SubscribeEvents stream of a running instance (DBX-35). Index records are batched into
// one UpsertInstanceIndex call, then acknowledged with AckEvents, so the daemon only trims what console has.
// Transcript content never passes through: the box keeps it and serves GetTimeline. Deltas go to console
// separately, best effort, about every 50ms.
type forwarder struct {
	g      *Gateway
	inst   *Instance
	daemon devboxv1.DaemonClient

	ctx    context.Context
	cancel context.CancelFunc
	done   chan struct{}
	deltas chan *devboxv1.Delta
	flushC chan chan error

	mu        sync.Mutex
	acked     uint64
	received  uint64
	ackedCond chan struct{}
}

// daemonCallTimeout bounds the forwarder's unary calls to the daemon, which can block behind a hung home; the
// stream itself stays open so heartbeats keep arriving.
const daemonCallTimeout = 15 * time.Second

// startForwarder starts (or keeps) the instance's forwarder.
func (g *Gateway) startForwarder(inst *Instance) {
	inst.mu.Lock()
	defer inst.mu.Unlock()
	if inst.fwd != nil {
		return
	}
	ctx, cancel := context.WithCancel(g.ctx)
	f := &forwarder{
		g:         g,
		inst:      inst,
		daemon:    g.deps.Router.Daemon(inst.rec.ActorID()),
		ctx:       ctx,
		cancel:    cancel,
		done:      make(chan struct{}),
		deltas:    make(chan *devboxv1.Delta, 4096),
		flushC:    make(chan chan error),
		ackedCond: make(chan struct{}),
	}
	inst.fwd = f
	g.wg.Add(2)
	go func() {
		defer g.wg.Done()
		defer close(f.done)
		f.run()
	}()
	go func() {
		defer g.wg.Done()
		f.pushDeltas()
	}()
}

func (f *forwarder) stop() {
	f.cancel()
	<-f.done
}

func (f *forwarder) ackedOffset() uint64 {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.acked
}

// drain waits until everything through offset (or, when offset is 0, everything received so far) is in console's
// index and acknowledged.
func (f *forwarder) drain(ctx context.Context, offset uint64) error {
	f.mu.Lock()
	if offset == 0 {
		offset = f.received
	}
	f.mu.Unlock()
	for {
		f.mu.Lock()
		acked, wait := f.acked, f.ackedCond
		f.mu.Unlock()
		if acked >= offset {
			return nil
		}
		reply := make(chan error, 1)
		select {
		case f.flushC <- reply:
			select {
			case <-reply:
			case <-ctx.Done():
				return ctx.Err()
			}
		case <-wait:
		case <-f.done:
			return fmt.Errorf("forwarder stopped at offset %d, before %d", f.ackedOffset(), offset)
		case <-ctx.Done():
			return fmt.Errorf("acknowledged offset %d, waiting for %d: %w", acked, offset, ctx.Err())
		}
		// Give the stream a moment to deliver records up to offset before flushing again.
		select {
		case <-wait:
		case <-time.After(20 * time.Millisecond):
		case <-ctx.Done():
		}
	}
}

func (f *forwarder) run() {
	log := f.g.log.WithValues("instance", f.inst.ID)
	attempt := 0
	started := false
	bootID := ""
	for f.ctx.Err() == nil {
		ictx, cancel := context.WithTimeout(f.ctx, daemonCallTimeout)
		info, err := f.daemon.GetInfo(ictx, &devboxv1.GetInfoRequest{})
		cancel()
		if err == nil {
			switch {
			case !started:
				// The daemon persists what was acknowledged, so a new forwarder (or gateway) resumes from there.
				f.mu.Lock()
				f.acked, f.received = info.GetAckedOffset(), info.GetAckedOffset()
				f.mu.Unlock()
				started = true
			case info.GetBootId() != bootID:
				// A restarted daemon reloads its persisted Initialize, which never includes secret env.
				log.Info("daemon restarted; reinitializing", "boot", info.GetBootId())
				_, err = f.daemon.Initialize(f.ctx, f.g.initRequest(f.inst))
			}
			if err == nil {
				bootID = info.GetBootId()
			}
		}
		if started && err == nil {
			err = f.consume()
		}
		if f.ctx.Err() != nil {
			return
		}
		attempt++
		wait := min(time.Duration(attempt)*500*time.Millisecond, 10*time.Second)
		log.V(1).Info("event subscription ended; resubscribing", "error", fmt.Sprint(err), "in", wait)
		select {
		case <-f.ctx.Done():
			return
		case <-time.After(wait):
		}
	}
}

// eventBatch accumulates records between flushes.
type eventBatch struct {
	last         uint64
	sessions     map[string]*devboxv1.Session
	interactions map[string]*devboxv1.Interaction
	aggregate    *devboxv1.InstanceAggregate
	records      int
}

func newBatch() *eventBatch {
	return &eventBatch{sessions: map[string]*devboxv1.Session{}, interactions: map[string]*devboxv1.Interaction{}}
}

func sessionKey(s *devboxv1.Session) string {
	if s.GetSessionId() != "" {
		return "s:" + s.GetSessionId()
	}
	return "t:" + s.GetThreadId()
}

func (f *forwarder) consume() error {
	stream, err := f.daemon.SubscribeEvents(f.ctx, &devboxv1.SubscribeEventsRequest{FromOffset: f.ackedOffset()})
	if err != nil {
		return err
	}
	events := make(chan *devboxv1.DaemonEvent)
	recvErr := make(chan error, 1)
	go func() {
		for {
			ev, err := stream.Recv()
			if err != nil {
				recvErr <- err
				return
			}
			select {
			case events <- ev:
			case <-f.ctx.Done():
				recvErr <- f.ctx.Err()
				return
			}
		}
	}()

	ticker := time.NewTicker(f.g.cfg.FlushInterval)
	defer ticker.Stop()
	b := newBatch()
	for {
		select {
		case ev := <-events:
			f.handle(ev, b)
			// An interaction blocks the agent until someone answers it, so it goes to console without waiting for
			// the tick.
			if b.records >= f.g.cfg.MaxBatch || ev.GetInteraction() != nil {
				if err := f.flush(b); err != nil {
					return err
				}
				b = newBatch()
			}
		case <-ticker.C:
			if err := f.flush(b); err != nil {
				return err
			}
			b = newBatch()
		case reply := <-f.flushC:
			err := f.flush(b)
			reply <- err
			if err != nil {
				return err
			}
			b = newBatch()
		case err := <-recvErr:
			// Flush what we have so a clean end of stream (suspend) still acknowledges it.
			if ferr := f.flush(b); ferr != nil {
				return errors.Join(err, ferr)
			}
			if errors.Is(err, io.EOF) {
				return nil
			}
			return err
		case <-f.ctx.Done():
			return f.ctx.Err()
		}
	}
}

func (f *forwarder) handle(ev *devboxv1.DaemonEvent, b *eventBatch) {
	g, inst := f.g, f.inst
	now := g.now()
	inst.mu.Lock()
	inst.lastContact = now
	inst.mu.Unlock()

	if hb := ev.GetHeartbeat(); hb != nil {
		if hb.GetIdle() != nil {
			f.setIdle(hb.GetIdle())
		}
		f.setHomeError(hb.GetHomeError())
		return
	}

	off := ev.GetOffset()
	f.mu.Lock()
	if off <= f.acked {
		f.mu.Unlock()
		return
	}
	if off > f.received {
		f.received = off
	}
	f.mu.Unlock()
	if off > b.last {
		b.last = off
	}
	b.records++

	switch e := ev.GetEvent().(type) {
	case *devboxv1.DaemonEvent_Delta:
		d := e.Delta
		d.InstanceId = inst.ID
		if d.Offset == 0 {
			d.Offset = off
		}
		if d.EmittedAt == nil {
			d.EmittedAt = ev.GetEmittedAt()
		}
		select {
		case f.deltas <- d:
		default:
			// Console falls behind: deltas are live-only and viewers recover with GetTimeline.
		}
	case *devboxv1.DaemonEvent_Session:
		k := sessionKey(e.Session)
		if cur, ok := b.sessions[k]; !ok || e.Session.GetRevision() >= cur.GetRevision() {
			b.sessions[k] = e.Session
		}
	case *devboxv1.DaemonEvent_Interaction:
		k := e.Interaction.GetInteractionId()
		if cur, ok := b.interactions[k]; !ok || e.Interaction.GetRevision() >= cur.GetRevision() {
			b.interactions[k] = e.Interaction
		}
	case *devboxv1.DaemonEvent_Aggregate:
		if b.aggregate == nil || e.Aggregate.GetRevision() >= b.aggregate.GetRevision() {
			b.aggregate = e.Aggregate
		}
		inst.mu.Lock()
		if inst.aggregate == nil || e.Aggregate.GetRevision() >= inst.aggregate.GetRevision() {
			inst.aggregate = e.Aggregate
		}
		inst.mu.Unlock()
	case *devboxv1.DaemonEvent_IdleState:
		f.setIdle(e.IdleState)
	case *devboxv1.DaemonEvent_SuspendRequested:
		reason := e.SuspendRequested.GetReason()
		if reason == devboxv1.SuspendReason_SUSPEND_REASON_UNSPECIFIED {
			reason = devboxv1.SuspendReason_SUSPEND_REASON_IDLE
		}
		g.requestSuspend(inst, reason)
	case *devboxv1.DaemonEvent_Condition:
		c := e.Condition
		inst.mu.Lock()
		if c.GetActive() {
			detail := c.GetError()
			if detail == nil {
				detail = &devboxv1.ErrorDetail{Message: c.GetMessage()}
			}
			if detail.Metadata == nil {
				detail.Metadata = map[string]string{}
			}
			detail.Metadata["type"] = c.GetType()
			detail.Metadata["severity"] = c.GetSeverity()
			inst.conditions[c.GetType()] = detail
		} else {
			delete(inst.conditions, c.GetType())
		}
		inst.mu.Unlock()
	}
}

// homeCondition is the condition type the daemon reports a failed home under, set from heartbeats too since its
// event log lives on that home.
const homeCondition = "home_unavailable"

func (f *forwarder) setHomeError(msg string) {
	inst := f.inst
	inst.mu.Lock()
	if msg == "" {
		delete(inst.conditions, homeCondition)
	} else {
		inst.conditions[homeCondition] = homeConditionDetail(msg)
	}
	inst.mu.Unlock()
	if msg != "" {
		f.g.remountHome(inst, msg)
	}
}

func homeConditionDetail(msg string) *devboxv1.ErrorDetail {
	return &devboxv1.ErrorDetail{Message: msg, Metadata: map[string]string{"type": homeCondition, "severity": "error"}}
}

func (f *forwarder) setIdle(idle *devboxv1.IdleState) {
	inst := f.inst
	inst.mu.Lock()
	changed := inst.idle == nil || inst.idle.GetIdle() != idle.GetIdle()
	inst.idle = idle
	rec := inst.rec
	inst.mu.Unlock()
	if changed && rec.status() == devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING {
		f.g.goBackground(func(ctx context.Context) {
			f.g.report(ctx, &devboxv1.ReportInstanceStatusRequest{
				InstanceId:       inst.ID,
				Status:           devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING,
				ActorId:          rec.ActorID(),
				ImageDigest:      rec.ImageDigest,
				TemplateRevision: rec.TemplateRevision,
				Idle:             idle,
			})
		})
	}
}

// flush sends a batch to console's index and acknowledges it.
func (f *forwarder) flush(b *eventBatch) error {
	if b.last == 0 || b.last <= f.ackedOffset() {
		return nil
	}
	ctx := f.ctx
	g, id := f.g, f.inst.ID
	indexed := make([]*devboxv1.Session, 0, len(b.sessions))
	for _, s := range b.sessions {
		indexed = append(indexed, s)
	}
	if len(indexed) > 0 || len(b.interactions) > 0 || b.aggregate != nil {
		req := &devboxv1.UpsertInstanceIndexRequest{InstanceId: id, Sessions: indexed, Aggregate: b.aggregate, Offset: b.last}
		for _, i := range b.interactions {
			req.Interactions = append(req.Interactions, i)
		}
		if _, err := g.deps.Ingest.UpsertInstanceIndex(ctx, req); err != nil {
			return fmt.Errorf("upserting the instance index: %w", err)
		}
	}
	actx, cancel := context.WithTimeout(ctx, daemonCallTimeout)
	_, err := f.daemon.AckEvents(actx, &devboxv1.AckEventsRequest{Offset: b.last})
	cancel()
	if err != nil {
		// Console already has everything; the daemon just keeps its log longer. Replays are idempotent.
		g.log.V(1).Info("AckEvents failed", "instance", id, "offset", b.last, "error", err.Error())
	}
	f.mu.Lock()
	f.acked = b.last
	close(f.ackedCond)
	f.ackedCond = make(chan struct{})
	f.mu.Unlock()
	return nil
}

func (f *forwarder) pushDeltas() {
	ticker := time.NewTicker(f.g.cfg.DeltaInterval)
	defer ticker.Stop()
	var batch []*devboxv1.Delta
	push := func() {
		if len(batch) == 0 {
			return
		}
		ctx, cancel := context.WithTimeout(f.ctx, 5*time.Second)
		if _, err := f.g.deps.Ingest.PushInstanceDeltas(ctx, &devboxv1.PushInstanceDeltasRequest{Deltas: batch}); err != nil && f.ctx.Err() == nil {
			f.g.log.Info("dropping deltas", "instance", f.inst.ID, "count", len(batch), "error", err.Error())
		}
		cancel()
		batch = nil
	}
	for {
		select {
		case d := <-f.deltas:
			batch = append(batch, d)
			if len(batch) >= f.g.cfg.MaxDeltaBatch {
				push()
			}
		case <-ticker.C:
			push()
		case <-f.ctx.Done():
			return
		}
	}
}

// requestSuspend suspends an instance in the background once; repeated requests while one runs are dropped.
func (g *Gateway) requestSuspend(inst *Instance, reason devboxv1.SuspendReason) {
	inst.mu.Lock()
	if inst.suspending {
		inst.mu.Unlock()
		return
	}
	inst.suspending = true
	inst.mu.Unlock()
	g.goBackground(func(ctx context.Context) {
		defer func() {
			inst.mu.Lock()
			inst.suspending = false
			inst.mu.Unlock()
		}()
		if _, err := g.suspend(ctx, inst, reason); err != nil {
			g.log.Error(err, "suspending instance", "instance", inst.ID, "reason", reason)
		}
	})
}

var (
	// homeRemountGrace is how long after remounting a home the gateway ignores home errors, while the daemon's
	// next probes clear (or confirm) the one it reported before the suspend.
	homeRemountGrace = 3 * time.Minute
	// homeRemountBackoff is how long after remounting a home a new failure only suspends the instance, rather
	// than resuming it into the same failure.
	homeRemountBackoff = 15 * time.Minute
)

// remountHome suspends and resumes an instance whose daemon reports that its home stopped taking writes, once.
// Suspending unmounts the workspace volume (restarting a dead ZeroFS writer to flush and release it) and resuming
// mounts it afresh. What the box wrote after the failure is lost either way.
func (g *Gateway) remountHome(inst *Instance, why string) {
	now := g.now()
	inst.mu.Lock()
	since := now.Sub(inst.homeRemounted)
	if inst.suspending || (!inst.homeRemounted.IsZero() && since < homeRemountGrace) {
		inst.mu.Unlock()
		return
	}
	inst.suspending = true
	resume := inst.homeRemounted.IsZero() || since > homeRemountBackoff
	inst.mu.Unlock()
	g.goBackground(func(ctx context.Context) {
		defer func() {
			inst.mu.Lock()
			inst.suspending = false
			inst.mu.Unlock()
		}()
		g.log.Info("the box's home stopped taking writes; suspending it", "instance", inst.ID, "why", why, "resume", resume)
		st, err := g.suspend(ctx, inst, devboxv1.SuspendReason_SUSPEND_REASON_HOME_UNAVAILABLE)
		if err != nil {
			g.log.Error(err, "suspending instance", "instance", inst.ID, "reason", devboxv1.SuspendReason_SUSPEND_REASON_HOME_UNAVAILABLE)
			return
		}
		if !resume || st != devboxv1.InstanceStatus_INSTANCE_STATUS_SUSPENDED {
			return
		}
		if _, err := g.resume(ctx, inst); err != nil {
			g.log.Error(err, "resuming instance after remounting its home", "instance", inst.ID)
		}
		inst.mu.Lock()
		inst.homeRemounted = g.now()
		inst.mu.Unlock()
	})
}
