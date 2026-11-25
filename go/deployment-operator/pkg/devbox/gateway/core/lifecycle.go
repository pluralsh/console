package core

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/timestamppb"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
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
	if src != nil && src.snapshot != nil {
		if home := externalHome(runner.HomeStorage, runner.Revisions[src.snapshot.GetTemplateRevision()].HomeStorage); home != "" {
			return nil, statusError(codes.Unimplemented, devboxv1.ErrorReason_ERROR_REASON_UNSUPPORTED,
				"devbox runner %s keeps homes on %s, and starting from a snapshot isn't supported for them yet", runner.Name, home)
		}
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
	// Read before provisioning starts, which can otherwise move the record past PROVISIONING before the reply.
	resp := g.createResponse(inst)
	g.goBackground(func(ctx context.Context) { g.provision(ctx, inst, src) })
	return resp, nil
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

	spec := actors.Spec{Ref: ref, Template: template, SourceTag: tag}
	if runner.HomeStorage.External() && src == nil {
		// Substrate refuses an explicit tag for templates with external volumes; the default is the golden tag.
		spec.SourceTag, spec.Preview = "", true
	}
	if _, err := g.deps.Actors.CreateActor(ctx, spec); err != nil {
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
	if err := waitServing(ctx, daemon); err != nil {
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

// waitServing waits for the daemon to answer Health. It doesn't wait for Ready: a daemon is only Ready after
// Initialize, which needs it serving.
func waitServing(ctx context.Context, d devboxv1.DaemonClient) error {
	t := time.NewTicker(500 * time.Millisecond)
	defer t.Stop()
	for {
		hctx, cancel := context.WithTimeout(ctx, 5*time.Second)
		_, err := d.Health(hctx, &devboxv1.HealthRequest{})
		cancel()
		if err == nil {
			return nil
		}
		select {
		case <-ctx.Done():
			return errors.Join(ctx.Err(), err)
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
		Endpoints:            g.endpoints(req.GetWorkbenchId()),
		RestoredFromSnapshot: inst.rec.RestoredFrom != "",
		RestoreFidelity:      devboxv1.SnapshotFidelity(devboxv1.SnapshotFidelity_value[inst.rec.RestoreFidelity]),
		RequestTokenJwks:     g.cfg.RequestTokenJWKS,
	}
}

func (g *Gateway) endpoints(workbenchID string) *devboxv1.HarnessEndpoints {
	ep := &devboxv1.HarnessEndpoints{
		ConsoleUrl: g.cfg.ConsoleURL,
		AiProxyUrl: g.cfg.AIProxyURL,
	}
	// console serves each workbench's MCP at <base>/<workbench-id>
	if base := strings.TrimSuffix(g.cfg.WorkbenchMCPURL, "/"); base != "" && workbenchID != "" {
		ep.WorkbenchMcpUrl = base + "/" + url.PathEscape(workbenchID)
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
// The box may refuse an automatic suspend (idle, max awake) that would cut off a running agent turn.
//
// Like resume, it runs in the background bounded by SuspendTimeout rather than the caller's deadline: a checkpoint
// cut off midway leaves the actor SUSPENDING. A caller whose context ends first gets the current status while the
// suspend continues; the new status is reported when it lands.
func (g *Gateway) suspend(ctx context.Context, inst *Instance, reason devboxv1.SuspendReason) (devboxv1.InstanceStatus, error) {
	type result struct {
		status devboxv1.InstanceStatus
		err    error
	}
	done := make(chan result, 1)
	g.goBackground(func(ctx context.Context) {
		ctx, cancel := context.WithTimeout(ctx, g.cfg.SuspendTimeout)
		defer cancel()
		inst.op.Lock()
		defer inst.op.Unlock()
		st, err := g.suspendLocked(ctx, inst, reason, devboxv1.InstanceStatus_INSTANCE_STATUS_SUSPENDED)
		done <- result{st, err}
	})
	wait, cancel := answerBy(ctx)
	defer cancel()
	select {
	case r := <-done:
		return r.status, r.err
	case <-wait.Done():
		return inst.status(), nil
	}
}

// replyMargin is how long before the caller's deadline a wait gives up and answers, at most a tenth of the call.
const replyMargin = 3 * time.Second

// answerBy ends replyMargin before ctx's deadline. An answer sent at the deadline itself loses the race to the
// proxy in between (KAS), which answers DeadlineExceeded in its place, so console never hears that the operation
// carries on.
func answerBy(ctx context.Context) (context.Context, context.CancelFunc) {
	dl, ok := ctx.Deadline()
	if !ok {
		return context.WithCancel(ctx)
	}
	return context.WithDeadline(ctx, dl.Add(-min(replyMargin, time.Until(dl)/10)))
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
		switch {
		case status.Code(err) == codes.FailedPrecondition && automatic(reason):
			g.log.Info("box refused an automatic suspend; it stays running", "instance", inst.ID, "reason", reason, "why", status.Convert(err).Message())
			return devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING, nil
		case err != nil:
			g.log.Error(err, "PrepareSuspend failed; suspending anyway", "instance", inst.ID, "reason", reason)
		default:
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

	// Always durable: an async suspend leaves the snapshot node-local until atelet uploads it, and a revert in that
	// window (an actor crashing on resume, say) returns the box to the previous uploaded snapshot, discarding
	// everything since. The wait is the gateway's; suspend runs in the background.
	if err := g.deps.Actors.Suspend(ctx, ref, true); err != nil {
		if msg, ok := g.recoverSuspend(ctx, inst, err); ok {
			g.setStatus(ctx, inst, statusUpdate{status: final, reason: reason, message: msg})
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

// automatic reports the suspend reasons the box may refuse: nobody asked for them, and nothing is lost by waiting.
func automatic(reason devboxv1.SuspendReason) bool {
	return reason == devboxv1.SuspendReason_SUSPEND_REASON_IDLE || reason == devboxv1.SuspendReason_SUSPEND_REASON_MAX_CONTINUOUS_AWAKE
}

// recoverSuspend handles a failed SuspendActor, returning the status message to record: an actor that is
// suspended anyway is fine, as is one left SUSPENDING, which the next resume finishes suspending first, and a
// crashed one is reverted to its last snapshot, losing what it did since.
func (g *Gateway) recoverSuspend(ctx context.Context, inst *Instance, cause error) (string, bool) {
	ref := inst.ref()
	a, err := g.deps.Actors.GetActor(ctx, ref)
	if err != nil {
		return "", false
	}
	switch a.GetStatus().GetState() {
	case ateapi.ActorState_ACTOR_STATE_SUSPENDED, ateapi.ActorState_ACTOR_STATE_SUSPENDING:
		return "suspended after: " + cause.Error(), true
	case ateapi.ActorState_ACTOR_STATE_CRASHED:
		crash := a.GetStatus().GetCrash().GetMessage()
		if err := g.deps.Actors.Revert(ctx, ref); err != nil {
			g.log.Error(errors.Join(cause, err), "reverting crashed actor", "instance", inst.ID)
			return "", false
		}
		g.log.Error(cause, "actor crashed; reverted to its last snapshot", "instance", inst.ID, "crash", crash)
		return crashedMessage(crash), true
	}
	return "", false
}

// crashedMessage tells the user a crashed box was rolled back, which loses its work since the last suspend.
func crashedMessage(crash string) string {
	msg := "the box crashed and was restored to its last suspend; work since then was lost"
	if crash != "" {
		msg += " (" + crash + ")"
	}
	return msg
}

func (i *Instance) sharedSnapshot() bool {
	i.mu.Lock()
	defer i.mu.Unlock()
	return i.sharedSnap
}

// resume wakes a suspended instance (DBX-61).
type wakeOp struct {
	done   chan struct{}
	status devboxv1.InstanceStatus
	err    error
}

// resume wakes inst in the background, bounded by ReadyTimeout rather than the caller's deadline: a cold restore
// can outlast a control call, and cancelling it midway left the actor half resumed for the next caller to restart.
// Concurrent callers share one wake; a caller whose context ends first gets errStarting while the wake continues.
func (g *Gateway) resume(ctx context.Context, inst *Instance) (devboxv1.InstanceStatus, error) {
	op := g.startWake(inst)
	wait, cancel := answerBy(ctx)
	defer cancel()
	select {
	case <-op.done:
		return op.status, op.err
	case <-wait.Done():
		return inst.status(), errStarting(inst.ID)
	}
}

func (g *Gateway) startWake(inst *Instance) *wakeOp {
	inst.mu.Lock()
	defer inst.mu.Unlock()
	if inst.waking != nil {
		return inst.waking
	}
	op := &wakeOp{done: make(chan struct{})}
	inst.waking = op
	g.goBackground(func(ctx context.Context) {
		inst.op.Lock()
		op.status, op.err = g.resumeLocked(ctx, inst)
		inst.op.Unlock()
		inst.mu.Lock()
		inst.waking = nil
		inst.mu.Unlock()
		close(op.done)
	})
	return op
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
		// not Unavailable: console reads that as the cluster being offline, which hides the real failure
		return devboxv1.InstanceStatus_INSTANCE_STATUS_SUSPENDED, status.Errorf(codes.Internal, "resuming instance %s: %v", inst.ID, err)
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
			return inst, nil, statusError(codes.Unavailable, devboxv1.ErrorReason_ERROR_REASON_INSTANCE_STARTING, "instance %s is %s", id, st)
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
	if err := g.saveHomeSeed(ctx, inst, ref, tagRef); err != nil {
		if derr := g.deps.Actors.DeleteTag(ctx, tagRef); derr != nil {
			g.log.Error(derr, "deleting the tag of a failed snapshot", "instance", inst.ID, "tag", tagRef.String())
		}
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

// saveHomeSeed copies a JuiceFS home, which isn't in the tag, into the snapshot's seed while the actor is still
// suspended, so the copy matches the tag. Seeds are JuiceFS seeds, so a ZeroFS home isn't saved.
func (g *Gateway) saveHomeSeed(ctx context.Context, inst *Instance, ref, tag actors.Ref) error {
	if g.deps.Seeds == nil {
		return nil
	}
	storage, err := g.homeStorage(ctx, inst)
	if err != nil {
		return fmt.Errorf("finding the home storage of %s: %w", ref, err)
	}
	if storage == v1alpha1.DevboxHomeZeroFS {
		return nil
	}
	a, err := g.deps.Actors.GetActor(ctx, ref)
	if err != nil {
		return fmt.Errorf("reading actor %s: %w", ref, err)
	}
	volume := actors.ExternalVolumeID(a, homeVolume)
	if volume == "" {
		return nil
	}
	if err := g.deps.Seeds.SaveSeed(ctx, SnapshotSeedID(tag), volume); err != nil {
		return fmt.Errorf("saving the home of %s: %w", ref, err)
	}
	return nil
}

// homeStorage is where the instance's revision keeps homes, reading the runner if the instance doesn't have it, as
// after an adopt that couldn't. A revision no longer in the runner's status falls back to the runner's storage.
func (g *Gateway) homeStorage(ctx context.Context, inst *Instance) (v1alpha1.DevboxHomeStorage, error) {
	inst.mu.Lock()
	runner, rec := inst.runner, inst.rec
	inst.mu.Unlock()
	if runner == nil {
		r, err := g.deps.Runners.Get(ctx, rec.Runner)
		if err != nil {
			return "", err
		}
		inst.mu.Lock()
		inst.runner = r
		inst.mu.Unlock()
		runner = r
	}
	if rev, ok := runner.Revisions[rec.TemplateRevision]; ok {
		return rev.HomeStorage, nil
	}
	return runner.HomeStorage, nil
}

// externalHome is the first of storages that's an external volume, or "".
func externalHome(storages ...v1alpha1.DevboxHomeStorage) v1alpha1.DevboxHomeStorage {
	for _, s := range storages {
		if s.External() {
			return s
		}
	}
	return ""
}

// homeVolume is the template volume mounted at /home/dev.
const homeVolume = "home"

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
		g.setStatus(ctx, inst, statusUpdate{status: devboxv1.InstanceStatus_INSTANCE_STATUS_SUSPENDED, reason: devboxv1.SuspendReason_SUSPEND_REASON_DAEMON_UNRESPONSIVE, message: crashedMessage(a.GetStatus().GetCrash().GetMessage())})
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
