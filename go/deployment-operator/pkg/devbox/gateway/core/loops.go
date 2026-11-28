package core

import (
	"context"
	"sync/atomic"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate/ateapi"
)

// Capabilities are reported on registration.
var Capabilities = []string{"acp-v2", "claude-oauth", "egress-pr-observation", "snapshots"}

var registered atomic.Bool

// Registered reports whether this process has registered with console at least once since it started.
func Registered() bool { return registered.Load() }

// runIngest registers with console, reconciles the instances it expects, and heartbeats; it re-registers after
// repeated heartbeat failures (a new KAS connection, or console lost the gateway).
func (g *Gateway) runIngest(ctx context.Context) {
	attempt := 0
	for ctx.Err() == nil {
		resp, err := g.deps.Ingest.RegisterGateway(ctx, &devboxv1.RegisterGatewayRequest{
			GatewayId:                    g.cfg.GatewayID,
			Version:                      g.cfg.Version,
			Capabilities:                 Capabilities,
			SubstrateVersion:             g.cfg.SubstrateVersion,
			CredentialProviderRegistered: g.cfg.CredentialProviderRegistered,
			EgressAuthzRegistered:        g.cfg.EgressAuthzRegistered,
		})
		if err != nil {
			attempt++
			wait := min(g.cfg.RegistrationBackoff*time.Duration(1<<min(attempt-1, 5)), time.Minute)
			g.log.Error(err, "registering with console", "retryIn", wait)
			if !sleep(ctx, wait) {
				return
			}
			continue
		}
		attempt = 0
		registered.Store(true)
		if id := resp.GetClusterId(); id != "" {
			g.mu.Lock()
			g.clusterID = id
			g.mu.Unlock()
		}
		g.log.Info("registered with console", "cluster", resp.GetClusterId(), "instances", len(resp.GetInstances()))
		g.reconcile(ctx, resp.GetInstances())

		interval := g.cfg.HeartbeatInterval
		if s := resp.GetHeartbeatIntervalSeconds(); s > 0 {
			interval = time.Duration(s) * time.Second
		}
		g.heartbeatLoop(ctx, interval)
	}
}

func (g *Gateway) heartbeatLoop(ctx context.Context, interval time.Duration) {
	t := time.NewTicker(interval)
	defer t.Stop()
	failures := 0
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
		}
		if err := g.heartbeat(ctx); err != nil {
			failures++
			g.log.Error(err, "heartbeat failed", "consecutive", failures)
			if failures >= 3 {
				return
			}
			continue
		}
		failures = 0
	}
}

func (g *Gateway) heartbeat(ctx context.Context) error {
	req := &devboxv1.HeartbeatRequest{GatewayId: g.cfg.GatewayID}
	for _, inst := range g.list() {
		hb := &devboxv1.InstanceHeartbeat{InstanceId: inst.ID}
		var acked uint64
		if f := inst.forwarder(); f != nil {
			acked = f.ackedOffset()
		}
		inst.mu.Lock()
		hb.Status = inst.rec.status()
		hb.Idle = inst.idle
		if !inst.lastContact.IsZero() {
			hb.LastDaemonContact = timestamppb.New(inst.lastContact)
		}
		for _, c := range inst.conditions {
			hb.Conditions = append(hb.Conditions, c)
		}
		inst.mu.Unlock()
		hb.AckedOffset = acked
		req.Instances = append(req.Instances, hb)
	}
	hctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	resp, err := g.deps.Ingest.Heartbeat(hctx, req)
	if err != nil {
		return err
	}
	for _, id := range resp.GetUnknownInstanceIds() {
		inst := g.get(id)
		if inst == nil {
			continue
		}
		g.log.Info("console doesn't know this instance; deleting its actor", "instance", id)
		g.goBackground(func(ctx context.Context) {
			if err := g.end(ctx, inst, devboxv1.InstanceStatus_INSTANCE_STATUS_CANCELLED, "unknown to console"); err != nil {
				g.log.Error(err, "garbage-collecting instance", "instance", id)
			}
		})
	}
	return nil
}

// reconcile adopts the instances console expects after a (re)registration.
func (g *Gateway) reconcile(ctx context.Context, summaries []*devboxv1.InstanceSummary) {
	g.collectRecords(ctx, summaries)
	for _, s := range summaries {
		if terminal(s.GetStatus()) {
			continue
		}
		if inst := g.get(s.GetInstanceId()); inst != nil {
			g.adoptLeases(inst, s)
			continue
		}
		rec, err := g.loadRecord(ctx, s.GetInstanceId())
		if err != nil {
			g.log.Error(err, "loading instance record", "instance", s.GetInstanceId())
			continue
		}
		if rec == nil || rec.Actor == "" {
			if s.GetStatus() == devboxv1.InstanceStatus_INSTANCE_STATUS_PENDING {
				continue // CreateInstance hasn't reached us yet; console fails it if it never does.
			}
			g.report(ctx, &devboxv1.ReportInstanceStatusRequest{
				InstanceId: s.GetInstanceId(),
				Status:     devboxv1.InstanceStatus_INSTANCE_STATUS_FAILED,
				Message:    "the gateway has no record of this instance",
				Error:      &devboxv1.ErrorDetail{Reason: devboxv1.ErrorReason_ERROR_REASON_INSTANCE_NOT_FOUND, Message: "the gateway has no record of this instance"},
			})
			continue
		}
		if terminal(rec.status()) {
			// We ended it but console missed the report: say it again.
			g.report(ctx, &devboxv1.ReportInstanceStatusRequest{InstanceId: rec.InstanceID, Status: rec.status(), ActorId: rec.ActorID(), Message: rec.Message})
			continue
		}
		inst := g.add(newInstance(*rec))
		g.adoptLeases(inst, s)
		g.goBackground(func(ctx context.Context) { g.adopt(ctx, inst) })
	}
}

// collectRecords deletes the records of ended instances once console has seen the end: it reports them terminal
// or no longer lists them. Until then a terminal record lets reconcile repeat a status console missed.
func (g *Gateway) collectRecords(ctx context.Context, summaries []*devboxv1.InstanceSummary) {
	live := map[string]bool{}
	for _, s := range summaries {
		live[s.GetInstanceId()] = !terminal(s.GetStatus())
	}
	recs, err := g.deps.Records.List(ctx)
	if err != nil {
		g.log.Error(err, "listing instance records")
		return
	}
	for _, rec := range recs {
		if !terminal(rec.status()) || live[rec.InstanceID] || g.get(rec.InstanceID) != nil {
			continue
		}
		if err := g.deps.Records.Delete(ctx, rec.InstanceID); err != nil {
			g.log.Error(err, "deleting instance record", "instance", rec.InstanceID)
		}
	}
}

func (g *Gateway) adoptLeases(inst *Instance, s *devboxv1.InstanceSummary) {
	inst.mu.Lock()
	defer inst.mu.Unlock()
	if s.GetLeaseGeneration() > inst.leaseGen {
		inst.leases = cloneLeases(s.GetLeases())
		inst.leaseGen = s.GetLeaseGeneration()
	}
}

// runBackstops enforces what the daemon can't (DBX-64): maximum continuous awake time, unresponsive daemons, and
// completion of long-suspended instances.
func (g *Gateway) runBackstops(ctx context.Context) {
	t := time.NewTicker(g.cfg.BackstopInterval)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
		}
		g.backstops(ctx)
	}
}

func (g *Gateway) backstops(ctx context.Context) {
	now := g.now()
	for _, inst := range g.list() {
		policy := inst.idlePolicy()
		inst.mu.Lock()
		st := inst.rec.status()
		awakeSince, lastContact, suspendedAt := inst.awakeSince, inst.lastContact, inst.rec.SuspendedAt
		inst.mu.Unlock()

		if st == devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING || st == devboxv1.InstanceStatus_INSTANCE_STATUS_SUSPENDED {
			g.refreshEgressInBackground(inst)
		}
		switch st {
		case devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING:
			maxAwake := policyDuration(policy, (*devboxv1.IdlePolicy).GetMaxContinuousAwake)
			switch {
			case !awakeSince.IsZero() && now.Sub(awakeSince) > maxAwake && !inst.viewerLease(now):
				g.requestSuspend(inst, devboxv1.SuspendReason_SUSPEND_REASON_MAX_CONTINUOUS_AWAKE)
			case !lastContact.IsZero() && now.Sub(lastContact) > g.cfg.UnresponsiveAfter && !inst.activeLease(now):
				g.confirmUnresponsive(inst)
			}
		case devboxv1.InstanceStatus_INSTANCE_STATUS_SUSPENDED:
			completeAfter := policyDuration(policy, (*devboxv1.IdlePolicy).GetCompleteAfter)
			if !suspendedAt.IsZero() && now.Sub(suspendedAt) > completeAfter {
				g.goBackground(func(ctx context.Context) {
					if err := g.completeStale(ctx, inst, completeAfter); err != nil {
						g.log.Error(err, "completing instance", "instance", inst.ID)
					}
				})
			}
		}
	}
}

// refreshEgressInBackground runs refreshEgress unless a lifecycle operation holds the instance; a resume
// refreshes egress itself, and anything else is caught on the next backstop.
func (g *Gateway) refreshEgressInBackground(inst *Instance) {
	if !inst.op.TryLock() {
		return
	}
	g.goBackground(func(ctx context.Context) {
		defer inst.op.Unlock()
		if err := g.refreshEgress(ctx, inst); err != nil {
			g.log.Error(err, "refreshing egress policy", "instance", inst.ID)
		}
	})
}

// unresponsiveProbes is how many Health calls, unresponsiveProbeInterval apart, a daemon whose event stream went
// silent gets before it is suspended as unresponsive.
var (
	unresponsiveProbes        = 3
	unresponsiveProbeInterval = 10 * time.Second
)

// confirmUnresponsive asks the daemon directly before suspending it as unresponsive: silence on the event stream
// can be the stream's fault, and suspending a box mid-turn without PrepareSuspend loses the agents' work. A daemon
// that answers gets a fresh forwarder instead.
func (g *Gateway) confirmUnresponsive(inst *Instance) {
	inst.mu.Lock()
	if inst.probing || inst.suspending {
		inst.mu.Unlock()
		return
	}
	inst.probing = true
	inst.mu.Unlock()
	g.goBackground(func(ctx context.Context) {
		defer func() {
			inst.mu.Lock()
			inst.probing = false
			inst.mu.Unlock()
		}()
		daemon := g.deps.Router.Daemon(inst.ActorID())
		var health *devboxv1.HealthResponse
		var err error
		for i := range unresponsiveProbes {
			if i > 0 && !sleep(ctx, unresponsiveProbeInterval) {
				return
			}
			hctx, cancel := context.WithTimeout(ctx, 5*time.Second)
			health, err = daemon.Health(hctx, &devboxv1.HealthRequest{})
			cancel()
			if err == nil {
				break
			}
		}
		if inst.status() != devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING {
			return
		}
		if msg := health.GetHomeError(); err == nil && msg != "" {
			// A hung home blocks the daemon's event log, so a new stream would go silent too.
			g.log.Info("daemon answers but its event stream went silent while its home is hung", "instance", inst.ID, "why", msg)
			inst.mu.Lock()
			inst.lastContact = g.now()
			inst.conditions[homeCondition] = homeConditionDetail(msg)
			inst.mu.Unlock()
			g.remountHome(inst, msg)
			return
		}
		if err == nil {
			g.log.Info("daemon answers but its event stream went silent; restarting the forwarder", "instance", inst.ID)
			inst.mu.Lock()
			inst.lastContact = g.now()
			inst.mu.Unlock()
			inst.stopForwarder()
			g.startForwarder(inst)
			return
		}
		g.log.Error(err, "daemon unresponsive; suspending", "instance", inst.ID)
		g.requestSuspend(inst, devboxv1.SuspendReason_SUSPEND_REASON_DAEMON_UNRESPONSIVE)
	})
}

func (i *Instance) viewerLease(now time.Time) bool {
	i.mu.Lock()
	defer i.mu.Unlock()
	for _, l := range i.leases {
		if l.GetKind() == devboxv1.LeaseKind_LEASE_KIND_VIEWER && (l.GetExpiresAt() == nil || l.GetExpiresAt().AsTime().After(now)) {
			return true
		}
	}
	return false
}

// runEvictionWatch suspends running instances whose Substrate worker is draining (DBX-34), synchronously so the
// snapshot is durable before the worker goes away.
func (g *Gateway) runEvictionWatch(ctx context.Context) {
	t := time.NewTicker(g.cfg.EvictionInterval)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
		}
		if !g.evictions(ctx) {
			return
		}
	}
}

// evictions runs one eviction pass; false means the watch can't work (no permission to list workers).
func (g *Gateway) evictions(ctx context.Context) bool {
	draining, err := g.deps.Actors.DrainingWorkers(ctx)
	if status.Code(err) == codes.PermissionDenied || status.Code(err) == codes.Unimplemented {
		g.log.Error(err, "can't list Substrate workers; eviction watch disabled (Substrate still drains workers itself)")
		g.evictionDisabled = true
		return false
	}
	if err != nil {
		g.log.Error(err, "listing draining workers")
		return true
	}
	if len(draining) == 0 {
		return true
	}
	atespaces := map[string]bool{}
	for _, inst := range g.list() {
		if inst.status() == devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING {
			atespaces[inst.ref().Atespace] = true
		}
	}
	for atespace := range atespaces {
		list, err := g.deps.Actors.ListActors(ctx, atespace)
		if err != nil {
			g.log.Error(err, "listing actors", "atespace", atespace)
			continue
		}
		for _, a := range list {
			if a.GetStatus().GetState() != ateapi.ActorState_ACTOR_STATE_RUNNING {
				continue
			}
			if !draining[a.GetStatus().GetWorkerAssignment().GetWorker().GetName()] {
				continue
			}
			inst := g.byActorID(a.GetMetadata().GetAtespace() + "/" + a.GetMetadata().GetName())
			if inst == nil {
				continue
			}
			g.log.Info("worker draining; evicting instance", "instance", inst.ID, "worker", a.GetStatus().GetWorkerAssignment().GetWorker().GetName())
			g.requestSuspend(inst, devboxv1.SuspendReason_SUSPEND_REASON_EVICTION)
		}
	}
	return true
}

func sleep(ctx context.Context, d time.Duration) bool {
	select {
	case <-ctx.Done():
		return false
	case <-time.After(d):
		return true
	}
}
