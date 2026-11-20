package core

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/timestamppb"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/actors"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/egress"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate/ateapi"
)

// ---- create ----

type startSource struct {
	snapshot *devboxv1.SnapshotRef
}

// create registers an instance and provisions it in the background (DBX-60, DBX-62). It is idempotent on the
// instance ID.
func (g *Gateway) create(ctx context.Context, req *devboxv1.CreateInstanceRequest, src *startSource) (*devboxv1.CreateInstanceResponse, error) {
	if req.GetInstanceId() == "" || req.GetRunnerName() == "" {
		return nil, status.Error(codes.InvalidArgument, "instance_id and runner_name are required")
	}
	if inst := g.get(req.GetInstanceId()); inst != nil {
		return g.createResponse(inst), nil
	}
	if rec, err := g.loadRecord(ctx, req.GetInstanceId()); err == nil && rec != nil && rec.Actor != "" {
		inst := g.add(newInstance(*rec))
		if !terminal(inst.status()) {
			g.goBackground(func(ctx context.Context) { g.adopt(ctx, inst) })
		}
		return g.createResponse(inst), nil
	}

	runner, err := g.deps.Runners.Get(ctx, req.GetRunnerName())
	if err != nil {
		return nil, status.Errorf(codes.FailedPrecondition, "%v", err)
	}
	if runner.Atespace == "" {
		return nil, status.Errorf(codes.FailedPrecondition, "%v: %s", ErrRunnerNotReady, runner.Name)
	}
	now := g.now()
	rec := Record{
		InstanceID:  req.GetInstanceId(),
		DevboxID:    req.GetDevboxId(),
		WorkbenchID: req.GetWorkbenchId(),
		OwnerID:     req.GetOwner().GetUserId(),
		Runner:      runner.Name,
		Atespace:    runner.Atespace,
		Actor:       ActorName(req.GetInstanceId()),
		Status:      devboxv1.InstanceStatus_INSTANCE_STATUS_PROVISIONING.String(),
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	rec.setRequest(req)
	inst := newInstance(rec)
	inst.runner = runner
	if cur := g.add(inst); cur != inst {
		return g.createResponse(cur), nil
	}
	if err := g.persist(ctx, &rec); err != nil {
		g.remove(inst)
		return nil, errRecord(err)
	}
	g.setStatus(ctx, inst, statusUpdate{status: devboxv1.InstanceStatus_INSTANCE_STATUS_PROVISIONING})
	g.goBackground(func(ctx context.Context) { g.provision(ctx, inst, src) })
	return g.createResponse(inst), nil
}

func (g *Gateway) createResponse(inst *Instance) *devboxv1.CreateInstanceResponse {
	rec := inst.record()
	return &devboxv1.CreateInstanceResponse{
		InstanceId:       rec.InstanceID,
		Status:           rec.status(),
		ActorId:          rec.ActorID(),
		TemplateRevision: rec.TemplateRevision,
		ImageDigest:      rec.ImageDigest,
		RestoreFidelity:  devboxv1.SnapshotFidelity(devboxv1.SnapshotFidelity_value[rec.RestoreFidelity]),
		Message:          rec.Message,
	}
}

func (g *Gateway) provision(ctx context.Context, inst *Instance, src *startSource) {
	inst.op.Lock()
	defer inst.op.Unlock()
	if err := g.doProvision(ctx, inst, src); err != nil {
		g.log.Error(err, "provisioning instance", "instance", inst.ID)
		g.setStatus(ctx, inst, statusUpdate{
			status:  devboxv1.InstanceStatus_INSTANCE_STATUS_FAILED,
			message: err.Error(),
			err:     detailOf(err, devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED),
		})
	}
}

func (g *Gateway) doProvision(ctx context.Context, inst *Instance, src *startSource) error {
	inst.mu.Lock()
	runner := inst.runner
	inst.mu.Unlock()
	ref := inst.ref()

	template, revision, tag := runner.Template, runner.Revision, runner.GoldenTag
	fidelity := devboxv1.SnapshotFidelity_SNAPSHOT_FIDELITY_UNSPECIFIED
	retarget := ""
	if src != nil && src.snapshot != nil {
		// Actors can only be seeded from a tag of the same template: start on the snapshot's revision, then
		// move to the current template if it changed (filesystem fidelity, cold boot).
		snapRev := src.snapshot.GetTemplateRevision()
		tag = actors.ParseRef(src.snapshot.GetTag(), ref.Atespace).Name
		fidelity = devboxv1.SnapshotFidelity_SNAPSHOT_FIDELITY_MEMORY
		if f := src.snapshot.GetFidelity(); f == devboxv1.SnapshotFidelity_SNAPSHOT_FIDELITY_FILESYSTEM {
			fidelity = f
		}
		if snapRev != 0 && snapRev != runner.Revision {
			old, ok := runner.Revisions[snapRev]
			if !ok || old.Template == "" {
				return fmt.Errorf("snapshot %s was taken on template revision %d, which no longer exists", src.snapshot.GetSnapshotId(), snapRev)
			}
			retarget, template = template, old.Template
			fidelity = devboxv1.SnapshotFidelity_SNAPSHOT_FIDELITY_FILESYSTEM
		}
	}
	if template == "" || tag == "" {
		return fmt.Errorf("%w: %s", ErrRunnerNotReady, runner.Name)
	}

	inst.mu.Lock()
	inst.rec.Template = template
	inst.rec.TemplateRevision = revision
	inst.rec.ImageDigest = runner.ImageDigest
	if src != nil && src.snapshot != nil {
		inst.rec.RestoredFrom = src.snapshot.GetSnapshotId()
		inst.rec.RestoreFidelity = fidelity.String()
	}
	inst.mu.Unlock()

	if _, err := g.deps.Actors.CreateActor(ctx, actors.Spec{Ref: ref, Template: template, SourceTag: tag}); err != nil {
		return fmt.Errorf("creating actor %s: %w", ref, err)
	}
	if retarget != "" {
		if err := g.deps.Actors.SetTemplate(ctx, ref, retarget); err != nil {
			return fmt.Errorf("moving actor %s to template %s: %w", ref, retarget, err)
		}
		inst.mu.Lock()
		inst.rec.Template = retarget
		inst.mu.Unlock()
	}
	if err := g.applyEgress(ctx, inst); err != nil {
		return err
	}
	if err := g.wake(ctx, inst); err != nil {
		return err
	}
	g.setStatus(ctx, inst, statusUpdate{status: devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING})
	g.startForwarder(inst)
	return nil
}

// applyEgress builds and applies the instance's egress policy and drops egress caches.
func (g *Gateway) applyEgress(ctx context.Context, inst *Instance) error {
	g.boxSCMHosts(ctx, inst, true)
	info, err := g.instanceInfo(ctx, inst)
	if err != nil {
		return err
	}
	if err := g.deps.Actors.ApplyEgressPolicy(ctx, inst.ref(), actors.EgressRules(egress.BuildPolicy(*info))); err != nil {
		return fmt.Errorf("applying egress policy: %w", err)
	}
	if g.deps.Egress != nil {
		g.deps.Egress.Invalidate(inst.ID)
	}
	return nil
}

// wake resumes the actor, waits for its daemon and (re)initializes it. Initialize is idempotent: a restored
// daemon keeps its threads and applies the new leases and endpoints.
func (g *Gateway) wake(ctx context.Context, inst *Instance) error {
	ref := inst.ref()
	ctx, cancel := context.WithTimeout(ctx, g.cfg.ReadyTimeout)
	defer cancel()
	if err := g.deps.Actors.Resume(ctx, ref); err != nil {
		return fmt.Errorf("resuming actor %s: %w", ref, err)
	}
	if _, err := g.deps.Actors.WaitState(ctx, ref, ateapi.ActorState_ACTOR_STATE_RUNNING); err != nil {
		return err
	}
	daemon := g.deps.Router.Daemon(ref.String())
	if err := waitHealthy(ctx, daemon); err != nil {
		return fmt.Errorf("waiting for the daemon of %s: %w", ref, err)
	}
	g.refreshRunner(ctx, inst)
	if _, err := daemon.Initialize(ctx, g.initRequest(inst)); err != nil {
		return fmt.Errorf("initializing the daemon of %s: %w", ref, err)
	}
	return nil
}

// refreshRunner rereads the instance's runner so Initialize carries current secret env; on failure the instance
// keeps the runner it has.
func (g *Gateway) refreshRunner(ctx context.Context, inst *Instance) {
	inst.mu.Lock()
	name := inst.rec.Runner
	inst.mu.Unlock()
	r, err := g.deps.Runners.Get(ctx, name)
	if err != nil {
		g.log.Error(err, "refreshing devbox runner; initializing with the cached one", "instance", inst.ID, "runner", name)
		return
	}
	inst.mu.Lock()
	inst.runner = r
	inst.mu.Unlock()
}

func waitHealthy(ctx context.Context, d devboxv1.DaemonClient) error {
	t := time.NewTicker(500 * time.Millisecond)
	defer t.Stop()
	var last error
	for {
		hctx, cancel := context.WithTimeout(ctx, 5*time.Second)
		resp, err := d.Health(hctx, &devboxv1.HealthRequest{})
		cancel()
		if err == nil && resp.GetReady() {
			return nil
		}
		if err != nil {
			last = err
		} else {
			last = fmt.Errorf("daemon not ready: %s", resp.GetStatus())
		}
		select {
		case <-ctx.Done():
			return errors.Join(ctx.Err(), last)
		case <-t.C:
		}
	}
}

func (g *Gateway) initRequest(inst *Instance) *devboxv1.InitializeRequest {
	inst.mu.Lock()
	defer inst.mu.Unlock()
	req := inst.req
	var cloud []*devboxv1.CloudIdentity
	var env map[string]string
	var autonomy *devboxv1.AutonomyPolicy
	if inst.runner != nil {
		cloud, env, autonomy = inst.runner.CloudIdentities, inst.runner.Env, inst.runner.Autonomy
	}
	return &devboxv1.InitializeRequest{
		InstanceId:           req.GetInstanceId(),
		DevboxId:             req.GetDevboxId(),
		WorkbenchId:          req.GetWorkbenchId(),
		Owner:                req.GetOwner(),
		Agent:                req.GetAgent(),
		Model:                req.GetModel(),
		ConfigOptions:        req.GetConfigOptions(),
		Agents:               req.GetAgents(),
		Repositories:         req.GetRepositories(),
		FirstThreadId:        req.GetFirstThreadId(),
		FirstThreadTitle:     req.GetFirstThreadTitle(),
		IdlePolicy:           req.GetIdlePolicy(),
		MaxRunningThreads:    req.GetMaxRunningThreads(),
		Leases:               inst.leases,
		LeaseGeneration:      inst.leaseGen,
		CloudIdentities:      cloud,
		Env:                  env,
		Autonomy:             autonomy,
		DecisionReview:       req.GetDecisionReview(),
		Endpoints:            g.endpoints(),
		RestoredFromSnapshot: inst.rec.RestoredFrom != "",
		RestoreFidelity:      devboxv1.SnapshotFidelity(devboxv1.SnapshotFidelity_value[inst.rec.RestoreFidelity]),
		RequestTokenJwks:     g.cfg.RequestTokenJWKS,
	}
}

func (g *Gateway) endpoints() *devboxv1.HarnessEndpoints {
	ep := &devboxv1.HarnessEndpoints{
		ConsoleUrl:      g.cfg.ConsoleURL,
		AiProxyUrl:      g.cfg.AIProxyURL,
		WorkbenchMcpUrl: g.cfg.WorkbenchMCPURL,
	}
	if gw := strings.TrimSuffix(g.cfg.GatewayURL, "/"); gw != "" {
		ep.DevboxMcpUrl = gw + egress.MCPPath
		ep.SandboxCredentialsUrl = gw
	}
	return ep
}

// ---- suspend and resume ----

// suspend suspends a running instance (DBX-64): PrepareSuspend settles the daemon, the forwarder drains up to
// the settled offset (so console has indexed everything and the daemon has it acknowledged), then Substrate suspends the actor.
// Evictions and snapshots suspend synchronously so the snapshot is durable before the worker goes away.
func (g *Gateway) suspend(ctx context.Context, inst *Instance, reason devboxv1.SuspendReason) (devboxv1.InstanceStatus, error) {
	inst.op.Lock()
	defer inst.op.Unlock()
	return g.suspendLocked(ctx, inst, reason, devboxv1.InstanceStatus_INSTANCE_STATUS_SUSPENDED)
}

func (g *Gateway) suspendLocked(ctx context.Context, inst *Instance, reason devboxv1.SuspendReason, final devboxv1.InstanceStatus) (devboxv1.InstanceStatus, error) {
	st := inst.status()
	if st != devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING && (st != devboxv1.InstanceStatus_INSTANCE_STATUS_SNAPSHOTTING || final != st) {
		return st, nil
	}
	ref := inst.ref()
	daemon := g.deps.Router.Daemon(ref.String())

	settled := uint64(0)
	if reason != devboxv1.SuspendReason_SUSPEND_REASON_DAEMON_UNRESPONSIVE {
		pctx, cancel := context.WithTimeout(ctx, g.cfg.PrepareTimeout)
		resp, err := daemon.PrepareSuspend(pctx, &devboxv1.PrepareSuspendRequest{
			Reason:         reason,
			SharedSnapshot: reason == devboxv1.SuspendReason_SUSPEND_REASON_SNAPSHOT && inst.sharedSnapshot(),
		})
		cancel()
		if err != nil {
			g.log.Error(err, "PrepareSuspend failed; suspending anyway", "instance", inst.ID, "reason", reason)
		} else {
			settled = resp.GetSettledOffset()
		}
	}
	if f := inst.forwarder(); f != nil {
		dctx, cancel := context.WithTimeout(ctx, g.cfg.DrainTimeout)
		if err := f.drain(dctx, settled); err != nil {
			g.log.Error(err, "event drain before suspend incomplete; the daemon keeps unacknowledged events", "instance", inst.ID, "settled", settled)
		}
		cancel()
	}
	inst.stopForwarder()

	sync := reason == devboxv1.SuspendReason_SUSPEND_REASON_EVICTION || reason == devboxv1.SuspendReason_SUSPEND_REASON_SNAPSHOT
	if err := g.deps.Actors.Suspend(ctx, ref, sync); err != nil {
		if g.recoverSuspend(ctx, inst, err) {
			g.setStatus(ctx, inst, statusUpdate{status: final, reason: reason, message: "recovered after: " + err.Error()})
			return final, nil
		}
		// Still running: keep forwarding events.
		g.startForwarder(inst)
		return devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING, fmt.Errorf("suspending actor %s: %w", ref, err)
	}
	if final == devboxv1.InstanceStatus_INSTANCE_STATUS_SUSPENDED {
		g.setStatus(ctx, inst, statusUpdate{status: final, reason: reason})
	}
	return final, nil
}

// recoverSuspend handles a failed SuspendActor: an actor that is suspended anyway is fine, and a crashed one is
// reverted to its last snapshot.
func (g *Gateway) recoverSuspend(ctx context.Context, inst *Instance, cause error) bool {
	ref := inst.ref()
	a, err := g.deps.Actors.GetActor(ctx, ref)
	if err != nil {
		return false
	}
	switch a.GetStatus().GetState() {
	case ateapi.ActorState_ACTOR_STATE_SUSPENDED, ateapi.ActorState_ACTOR_STATE_SUSPENDING:
		return true
	case ateapi.ActorState_ACTOR_STATE_CRASHED:
		if err := g.deps.Actors.Revert(ctx, ref); err != nil {
			g.log.Error(errors.Join(cause, err), "reverting crashed actor", "instance", inst.ID)
			return false
		}
		return true
	}
	return false
}

func (i *Instance) sharedSnapshot() bool {
	i.mu.Lock()
	defer i.mu.Unlock()
	return i.sharedSnap
}

// resume wakes a suspended instance (DBX-61).
func (g *Gateway) resume(ctx context.Context, inst *Instance) (devboxv1.InstanceStatus, error) {
	inst.op.Lock()
	defer inst.op.Unlock()
	return g.resumeLocked(ctx, inst)
}

func (g *Gateway) resumeLocked(ctx context.Context, inst *Instance) (devboxv1.InstanceStatus, error) {
	switch st := inst.status(); st {
	case devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING:
		return st, nil
	case devboxv1.InstanceStatus_INSTANCE_STATUS_SUSPENDED:
	default:
		return st, status.Errorf(codes.FailedPrecondition, "instance %s is %s and can't be resumed", inst.ID, st)
	}
	if err := g.wake(ctx, inst); err != nil {
		if errors.Is(err, actors.ErrCrashed) {
			_ = g.deps.Actors.Revert(ctx, inst.ref())
		}
		return devboxv1.InstanceStatus_INSTANCE_STATUS_SUSPENDED, status.Errorf(codes.Unavailable, "resuming instance %s: %v", inst.ID, err)
	}
	g.setStatus(ctx, inst, statusUpdate{status: devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING})
	g.startForwarder(inst)
	return devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING, nil
}

// running returns the daemon of a running instance, resuming it first when resumeIfSuspended is set
// (resume_if_suspended semantics of the Control API).
func (g *Gateway) running(ctx context.Context, id string, resumeIfSuspended bool) (*Instance, devboxv1.DaemonClient, error) {
	inst := g.get(id)
	if inst == nil {
		return nil, nil, errNotFound(id)
	}
	switch st := inst.status(); st {
	case devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING:
	case devboxv1.InstanceStatus_INSTANCE_STATUS_SUSPENDED:
		if !resumeIfSuspended {
			return inst, nil, errSuspended(id)
		}
		if _, err := g.resume(ctx, inst); err != nil {
			return inst, nil, err
		}
	case devboxv1.InstanceStatus_INSTANCE_STATUS_PROVISIONING, devboxv1.InstanceStatus_INSTANCE_STATUS_PENDING,
		devboxv1.InstanceStatus_INSTANCE_STATUS_SNAPSHOTTING:
		if !resumeIfSuspended {
			return inst, nil, status.Errorf(codes.Unavailable, "instance %s is %s", id, st)
		}
		// Wait for the operation in flight, then re-check.
		inst.op.Lock()
		inst.op.Unlock() // nolint: staticcheck
		return g.running(ctx, id, false)
	default:
		return inst, nil, status.Errorf(codes.FailedPrecondition, "instance %s is %s", id, st)
	}
	return inst, g.deps.Router.Daemon(inst.ActorID()), nil
}

// ---- snapshots (DBX-63) ----

func (g *Gateway) snapshot(ctx context.Context, inst *Instance, req *devboxv1.SnapshotInstanceRequest) {
	inst.op.Lock()
	defer inst.op.Unlock()
	ctx, cancel := context.WithTimeout(ctx, g.cfg.SnapshotTimeout)
	defer cancel()

	ref, err := g.takeSnapshot(ctx, inst, req)
	result := &devboxv1.ReportSnapshotRequest{
		SnapshotId:  req.GetSnapshotId(),
		InstanceId:  inst.ID,
		CompletedAt: timestamppb.New(g.now()),
	}
	if err != nil {
		g.log.Error(err, "snapshot failed", "instance", inst.ID, "snapshot", req.GetSnapshotId())
		result.State = devboxv1.SnapshotState_SNAPSHOT_STATE_FAILED
		result.Error = detailOf(err, devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED)
	} else {
		result.State = devboxv1.SnapshotState_SNAPSHOT_STATE_SUCCEEDED
		result.Snapshot = ref
	}
	rctx, rcancel := context.WithTimeout(context.WithoutCancel(ctx), 30*time.Second)
	defer rcancel()
	if _, err := g.deps.Ingest.ReportSnapshot(rctx, result); err != nil {
		g.log.Error(err, "reporting snapshot", "instance", inst.ID, "snapshot", req.GetSnapshotId())
	}
}

func (g *Gateway) takeSnapshot(ctx context.Context, inst *Instance, req *devboxv1.SnapshotInstanceRequest) (*devboxv1.SnapshotRef, error) {
	ref := inst.ref()
	wasRunning := inst.status() == devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING
	if !wasRunning && inst.status() != devboxv1.InstanceStatus_INSTANCE_STATUS_SUSPENDED {
		return nil, fmt.Errorf("instance %s is %s", inst.ID, inst.status())
	}
	if wasRunning {
		inst.mu.Lock()
		inst.sharedSnap = req.GetShared()
		inst.mu.Unlock()
		g.setStatus(ctx, inst, statusUpdate{status: devboxv1.InstanceStatus_INSTANCE_STATUS_SNAPSHOTTING})
		if _, err := g.suspendLocked(ctx, inst, devboxv1.SuspendReason_SUSPEND_REASON_SNAPSHOT, devboxv1.InstanceStatus_INSTANCE_STATUS_SNAPSHOTTING); err != nil {
			g.setStatus(ctx, inst, statusUpdate{status: devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING})
			return nil, err
		}
		// Back to running (or suspended) whatever happens to the tag.
		defer func() {
			inst.mu.Lock()
			inst.rec.Status = devboxv1.InstanceStatus_INSTANCE_STATUS_SUSPENDED.String()
			inst.sharedSnap = false
			inst.mu.Unlock()
			if _, err := g.resumeLocked(context.WithoutCancel(ctx), inst); err != nil {
				g.log.Error(err, "resuming after snapshot", "instance", inst.ID)
				g.setStatus(ctx, inst, statusUpdate{status: devboxv1.InstanceStatus_INSTANCE_STATUS_SUSPENDED, reason: devboxv1.SuspendReason_SUSPEND_REASON_SNAPSHOT, message: err.Error()})
			}
		}()
	}

	tagRef := actors.Ref{Atespace: ref.Atespace, Name: SnapshotTagName(req.GetSnapshotId())}
	if _, err := g.deps.Actors.CreateTag(ctx, tagRef, ref); err != nil {
		return nil, fmt.Errorf("tagging %s: %w", ref, err)
	}
	tag, err := g.deps.Actors.WaitTag(ctx, tagRef)
	if err != nil {
		return nil, err
	}
	fidelity := devboxv1.SnapshotFidelity_SNAPSHOT_FIDELITY_FILESYSTEM
	if actors.TagFidelity(tag) == ateapi.SnapshotFidelity_SNAPSHOT_FIDELITY_MEMORY {
		fidelity = devboxv1.SnapshotFidelity_SNAPSHOT_FIDELITY_MEMORY
	}
	return &devboxv1.SnapshotRef{
		SnapshotId:       req.GetSnapshotId(),
		Tag:              tagRef.String(),
		TemplateRevision: inst.record().TemplateRevision,
		Fidelity:         fidelity,
	}, nil
}

// ---- cancel and complete (DBX-60) ----

// end deletes the actor, and with it the box's transcript, and its egress policy, then records a terminal status.
func (g *Gateway) end(ctx context.Context, inst *Instance, final devboxv1.InstanceStatus, message string) error {
	inst.op.Lock()
	defer inst.op.Unlock()
	return g.endLocked(ctx, inst, final, message)
}

// completeStale completes a suspended instance whose completeAfter has passed. Both are rechecked under inst.op,
// since a resume may have won the lock after the backstop read them.
func (g *Gateway) completeStale(ctx context.Context, inst *Instance, completeAfter time.Duration) error {
	inst.op.Lock()
	defer inst.op.Unlock()
	inst.mu.Lock()
	st, suspendedAt := inst.rec.status(), inst.rec.SuspendedAt
	inst.mu.Unlock()
	if st != devboxv1.InstanceStatus_INSTANCE_STATUS_SUSPENDED || suspendedAt.IsZero() || g.now().Sub(suspendedAt) <= completeAfter {
		return nil
	}
	return g.endLocked(ctx, inst, devboxv1.InstanceStatus_INSTANCE_STATUS_COMPLETED, "suspended longer than completeAfter")
}

func (g *Gateway) endLocked(ctx context.Context, inst *Instance, final devboxv1.InstanceStatus, message string) error {
	if terminal(inst.status()) {
		return nil
	}
	inst.stopForwarder()
	if err := g.deps.Actors.DeleteActor(ctx, inst.ref()); err != nil && !substrate.IsNotFound(err) {
		return fmt.Errorf("deleting actor %s: %w", inst.ref(), err)
	}
	if g.deps.Egress != nil {
		g.deps.Egress.Invalidate(inst.ID)
	}
	g.streams.dropInstance(inst.ID)
	g.setStatus(ctx, inst, statusUpdate{status: final, message: message})
	g.remove(inst)
	return nil
}

// ---- adoption after a restart ----

// adopt reconciles an instance loaded from its record with the actor's actual state.
func (g *Gateway) adopt(ctx context.Context, inst *Instance) {
	inst.op.Lock()
	defer inst.op.Unlock()
	rec := inst.record()
	if runner, err := g.deps.Runners.Get(ctx, rec.Runner); err == nil {
		inst.mu.Lock()
		inst.runner = runner
		inst.mu.Unlock()
	}
	a, err := g.deps.Actors.GetActor(ctx, inst.ref())
	if substrate.IsNotFound(err) {
		if rec.status() == devboxv1.InstanceStatus_INSTANCE_STATUS_PROVISIONING {
			g.log.Info("re-provisioning instance whose actor was never created", "instance", inst.ID)
			if err := g.doProvision(ctx, inst, nil); err != nil {
				g.setStatus(ctx, inst, statusUpdate{status: devboxv1.InstanceStatus_INSTANCE_STATUS_FAILED, message: err.Error(), err: detailOf(err, 0)})
			}
			return
		}
		g.setStatus(ctx, inst, statusUpdate{status: devboxv1.InstanceStatus_INSTANCE_STATUS_FAILED, message: "the instance's actor no longer exists"})
		return
	}
	if err != nil {
		g.log.Error(err, "adopting instance", "instance", inst.ID)
		return
	}
	switch a.GetStatus().GetState() {
	case ateapi.ActorState_ACTOR_STATE_RUNNING, ateapi.ActorState_ACTOR_STATE_RESUMING:
		if err := g.wake(ctx, inst); err != nil {
			g.log.Error(err, "re-initializing adopted instance", "instance", inst.ID)
		}
		g.setStatus(ctx, inst, statusUpdate{status: devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING})
		g.startForwarder(inst)
	case ateapi.ActorState_ACTOR_STATE_CRASHED:
		if err := g.deps.Actors.Revert(ctx, inst.ref()); err != nil {
			g.log.Error(err, "reverting crashed actor", "instance", inst.ID)
		}
		g.setStatus(ctx, inst, statusUpdate{status: devboxv1.InstanceStatus_INSTANCE_STATUS_SUSPENDED, reason: devboxv1.SuspendReason_SUSPEND_REASON_DAEMON_UNRESPONSIVE, message: "actor crashed and was reverted"})
	default:
		reason := devboxv1.SuspendReason(devboxv1.SuspendReason_value[rec.SuspendReason])
		if rec.status() != devboxv1.InstanceStatus_INSTANCE_STATUS_SUSPENDED {
			g.setStatus(ctx, inst, statusUpdate{status: devboxv1.InstanceStatus_INSTANCE_STATUS_SUSPENDED, reason: reason})
		}
	}
}

// cloneLeases deep-copies leases.
func cloneLeases(in []*devboxv1.Lease) []*devboxv1.Lease {
	out := make([]*devboxv1.Lease, len(in))
	for i, l := range in {
		out[i] = proto.Clone(l).(*devboxv1.Lease)
	}
	return out
}
