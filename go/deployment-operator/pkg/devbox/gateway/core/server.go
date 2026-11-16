package core

import (
	"context"
	"slices"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/actors"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate"
)

// ---- instance lifecycle ----

func (g *Gateway) CreateInstance(ctx context.Context, req *devboxv1.CreateInstanceRequest) (*devboxv1.CreateInstanceResponse, error) {
	return g.create(ctx, req, nil)
}

func (g *Gateway) StartFromSnapshot(ctx context.Context, req *devboxv1.StartFromSnapshotRequest) (*devboxv1.CreateInstanceResponse, error) {
	if req.GetInstance() == nil || req.GetSnapshot().GetTag() == "" {
		return nil, status.Error(codes.InvalidArgument, "instance and snapshot.tag are required")
	}
	return g.create(ctx, req.GetInstance(), &startSource{snapshot: req.GetSnapshot()})
}

func (g *Gateway) CancelInstance(ctx context.Context, req *devboxv1.InstanceActionRequest) (*devboxv1.InstanceActionResponse, error) {
	inst := g.get(req.GetInstanceId())
	if inst == nil {
		// Already gone (or never got here): make sure no actor is left behind.
		if rec, err := g.loadRecord(ctx, req.GetInstanceId()); err == nil && rec != nil && rec.Actor != "" {
			_ = g.deps.Actors.DeleteActor(ctx, actors.Ref{Atespace: rec.Atespace, Name: rec.Actor})
		}
		return &devboxv1.InstanceActionResponse{InstanceId: req.GetInstanceId(), Status: devboxv1.InstanceStatus_INSTANCE_STATUS_CANCELLED}, nil
	}
	if err := g.end(ctx, inst, devboxv1.InstanceStatus_INSTANCE_STATUS_CANCELLED, req.GetMessage()); err != nil {
		return nil, status.Errorf(codes.Unavailable, "%v", err)
	}
	return &devboxv1.InstanceActionResponse{InstanceId: inst.ID, Status: devboxv1.InstanceStatus_INSTANCE_STATUS_CANCELLED}, nil
}

func (g *Gateway) SuspendInstance(ctx context.Context, req *devboxv1.InstanceActionRequest) (*devboxv1.InstanceActionResponse, error) {
	inst := g.get(req.GetInstanceId())
	if inst == nil {
		return nil, errNotFound(req.GetInstanceId())
	}
	reason := req.GetReason()
	if reason == devboxv1.SuspendReason_SUSPEND_REASON_UNSPECIFIED {
		reason = devboxv1.SuspendReason_SUSPEND_REASON_USER
	}
	st, err := g.suspend(ctx, inst, reason)
	if err != nil {
		return nil, status.Errorf(codes.Unavailable, "%v", err)
	}
	return &devboxv1.InstanceActionResponse{InstanceId: inst.ID, Status: st}, nil
}

func (g *Gateway) ResumeInstance(ctx context.Context, req *devboxv1.InstanceActionRequest) (*devboxv1.InstanceActionResponse, error) {
	inst := g.get(req.GetInstanceId())
	if inst == nil {
		return nil, errNotFound(req.GetInstanceId())
	}
	st, err := g.resume(ctx, inst)
	if err != nil {
		return nil, err
	}
	return &devboxv1.InstanceActionResponse{InstanceId: inst.ID, Status: st}, nil
}

func (g *Gateway) SnapshotInstance(_ context.Context, req *devboxv1.SnapshotInstanceRequest) (*devboxv1.SnapshotInstanceResponse, error) {
	inst := g.get(req.GetInstanceId())
	if inst == nil {
		return nil, errNotFound(req.GetInstanceId())
	}
	if req.GetSnapshotId() == "" {
		return nil, status.Error(codes.InvalidArgument, "snapshot_id is required")
	}
	switch st := inst.status(); st {
	case devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING, devboxv1.InstanceStatus_INSTANCE_STATUS_SUSPENDED,
		devboxv1.InstanceStatus_INSTANCE_STATUS_SNAPSHOTTING:
	default:
		return nil, status.Errorf(codes.FailedPrecondition, "instance %s is %s", inst.ID, st)
	}
	g.goBackground(func(ctx context.Context) { g.snapshot(ctx, inst, req) })
	return &devboxv1.SnapshotInstanceResponse{SnapshotId: req.GetSnapshotId(), Accepted: true}, nil
}

func (g *Gateway) DeleteSnapshot(ctx context.Context, req *devboxv1.DeleteSnapshotRequest) (*devboxv1.DeleteSnapshotResponse, error) {
	tag := req.GetSnapshot().GetTag()
	if tag == "" {
		return nil, status.Error(codes.InvalidArgument, "snapshot.tag is required")
	}
	ref := actors.ParseRef(tag, "")
	if ref.Atespace == "" {
		return nil, status.Errorf(codes.InvalidArgument, "snapshot tag %q must be <atespace>/<name>", tag)
	}
	if err := g.deps.Actors.DeleteTag(ctx, ref); err != nil {
		if substrate.IsNotFound(err) {
			return &devboxv1.DeleteSnapshotResponse{Deleted: false}, nil
		}
		return nil, status.Errorf(codes.Unavailable, "deleting tag %s: %v", ref, err)
	}
	return &devboxv1.DeleteSnapshotResponse{Deleted: true}, nil
}

func (g *Gateway) SetAgentBilling(ctx context.Context, req *devboxv1.SetAgentBillingRequest) (*devboxv1.SetAgentBillingResponse, error) {
	inst := g.get(req.GetInstanceId())
	if inst == nil {
		return nil, errNotFound(req.GetInstanceId())
	}
	rec := inst.updateRequest(func(r *devboxv1.CreateInstanceRequest) {
		r.Agents = slices.DeleteFunc(r.Agents, func(a *devboxv1.AgentLaunch) bool { return a.GetAgent() == req.GetAgent().GetAgent() })
		r.Agents = append(r.Agents, req.GetAgent())
	})
	if err := g.persist(ctx, &rec); err != nil {
		return nil, errRecord(err)
	}
	// Billing selects the AI proxy or subscription rules, so the egress policy changes with it.
	if err := g.applyEgress(ctx, inst); err != nil {
		return nil, status.Errorf(codes.Unavailable, "%v", err)
	}
	if inst.status() != devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING {
		return &devboxv1.SetAgentBillingResponse{}, nil
	}
	return g.deps.Router.Daemon(inst.ActorID()).SetAgentBilling(ctx, req)
}

// ---- threads and turns ----

func (g *Gateway) CreateThread(ctx context.Context, req *devboxv1.CreateThreadRequest) (*devboxv1.ThreadResponse, error) {
	_, d, err := g.running(ctx, req.GetInstanceId(), req.GetResumeIfSuspended())
	if err != nil {
		return nil, err
	}
	return d.CreateThread(ctx, req)
}

func (g *Gateway) ListThreads(ctx context.Context, req *devboxv1.ListThreadsRequest) (*devboxv1.ListThreadsResponse, error) {
	_, d, err := g.running(ctx, req.GetInstanceId(), false)
	if err != nil {
		return nil, err
	}
	return d.ListThreads(ctx, req)
}

func (g *Gateway) ImportThread(ctx context.Context, req *devboxv1.ImportThreadRequest) (*devboxv1.ThreadResponse, error) {
	_, d, err := g.running(ctx, req.GetInstanceId(), req.GetResumeIfSuspended())
	if err != nil {
		return nil, err
	}
	return d.ImportThread(ctx, req)
}

func (g *Gateway) ResumeThread(ctx context.Context, req *devboxv1.ResumeThreadRequest) (*devboxv1.ThreadResponse, error) {
	_, d, err := g.running(ctx, req.GetThread().GetInstanceId(), req.GetResumeIfSuspended())
	if err != nil {
		return nil, err
	}
	return d.ResumeThread(ctx, req)
}

func (g *Gateway) CloseThread(ctx context.Context, req *devboxv1.ThreadActionRequest) (*devboxv1.ThreadResponse, error) {
	_, d, err := g.running(ctx, req.GetThread().GetInstanceId(), req.GetResumeIfSuspended())
	if err != nil {
		return nil, err
	}
	return d.CloseThread(ctx, req)
}

func (g *Gateway) DeleteThread(ctx context.Context, req *devboxv1.ThreadActionRequest) (*devboxv1.DeleteThreadResponse, error) {
	_, d, err := g.running(ctx, req.GetThread().GetInstanceId(), req.GetResumeIfSuspended())
	if err != nil {
		return nil, err
	}
	return d.DeleteThread(ctx, req)
}

func (g *Gateway) ForkThread(ctx context.Context, req *devboxv1.ForkThreadRequest) (*devboxv1.ThreadResponse, error) {
	_, d, err := g.running(ctx, req.GetThread().GetInstanceId(), req.GetResumeIfSuspended())
	if err != nil {
		return nil, err
	}
	return d.ForkThread(ctx, req)
}

func (g *Gateway) Prompt(ctx context.Context, req *devboxv1.PromptRequest) (*devboxv1.PromptResponse, error) {
	_, d, err := g.running(ctx, req.GetThread().GetInstanceId(), req.GetResumeIfSuspended())
	if err != nil {
		return nil, err
	}
	return d.Prompt(ctx, req)
}

func (g *Gateway) CancelPrompt(ctx context.Context, req *devboxv1.CancelPromptRequest) (*devboxv1.CancelPromptResponse, error) {
	inst, d, err := g.running(ctx, req.GetThread().GetInstanceId(), false)
	if err != nil {
		if inst != nil && inst.status() == devboxv1.InstanceStatus_INSTANCE_STATUS_SUSPENDED {
			// Nothing runs in a suspended box.
			return &devboxv1.CancelPromptResponse{Cancelled: false}, nil
		}
		return nil, err
	}
	return d.CancelPrompt(ctx, req)
}

func (g *Gateway) SetThreadConfigOption(ctx context.Context, req *devboxv1.SetThreadConfigOptionRequest) (*devboxv1.SetThreadConfigOptionResponse, error) {
	_, d, err := g.running(ctx, req.GetThread().GetInstanceId(), req.GetResumeIfSuspended())
	if err != nil {
		return nil, err
	}
	return d.SetThreadConfigOption(ctx, req)
}

func (g *Gateway) RespondInteraction(ctx context.Context, req *devboxv1.RespondInteractionRequest) (*devboxv1.RespondInteractionResponse, error) {
	_, d, err := g.running(ctx, req.GetInstanceId(), req.GetResumeIfSuspended())
	if err != nil {
		return nil, err
	}
	return d.RespondInteraction(ctx, req)
}

func (g *Gateway) ListCommands(ctx context.Context, req *devboxv1.ListCommandsRequest) (*devboxv1.ListCommandsResponse, error) {
	_, d, err := g.running(ctx, req.GetThread().GetInstanceId(), false)
	if err != nil {
		return nil, err
	}
	return d.ListCommands(ctx, req)
}

// ---- workspace and files ----

func (g *Gateway) AddRepository(ctx context.Context, req *devboxv1.AddRepositoryRequest) (*devboxv1.AddRepositoryResponse, error) {
	_, d, err := g.running(ctx, req.GetInstanceId(), false)
	if err != nil {
		return nil, err
	}
	return d.AddRepository(ctx, req)
}

func (g *Gateway) ListRepositories(ctx context.Context, req *devboxv1.ListRepositoriesRequest) (*devboxv1.ListRepositoriesResponse, error) {
	_, d, err := g.running(ctx, req.GetInstanceId(), false)
	if err != nil {
		return nil, err
	}
	return d.ListRepositories(ctx, req)
}

func (g *Gateway) ListFiles(ctx context.Context, req *devboxv1.ListFilesRequest) (*devboxv1.ListFilesResponse, error) {
	_, d, err := g.running(ctx, req.GetInstanceId(), false)
	if err != nil {
		return nil, err
	}
	return d.ListFiles(ctx, req)
}

func (g *Gateway) ReadFile(ctx context.Context, req *devboxv1.ReadFileRequest) (*devboxv1.ReadFileResponse, error) {
	_, d, err := g.running(ctx, req.GetInstanceId(), false)
	if err != nil {
		return nil, err
	}
	return d.ReadFile(ctx, req)
}

func (g *Gateway) WriteFile(ctx context.Context, req *devboxv1.WriteFileRequest) (*devboxv1.WriteFileResponse, error) {
	_, d, err := g.running(ctx, req.GetInstanceId(), false)
	if err != nil {
		return nil, err
	}
	return d.WriteFile(ctx, req)
}

func (g *Gateway) GetChanges(ctx context.Context, req *devboxv1.GetChangesRequest) (*devboxv1.GetChangesResponse, error) {
	_, d, err := g.running(ctx, req.GetInstanceId(), false)
	if err != nil {
		return nil, err
	}
	return d.GetChanges(ctx, req)
}

// ---- history (served by the box) ----

func (g *Gateway) GetTimeline(ctx context.Context, req *devboxv1.GetTimelineRequest) (*devboxv1.GetTimelineResponse, error) {
	if req.GetInstanceId() == "" || req.GetSessionId() == "" {
		return nil, status.Error(codes.InvalidArgument, "instance_id and session_id are required")
	}
	_, d, err := g.running(ctx, req.GetInstanceId(), req.GetResumeIfSuspended())
	if err != nil {
		return nil, err
	}
	return d.GetTimeline(ctx, req)
}

func (g *Gateway) GetSessions(ctx context.Context, req *devboxv1.GetSessionsRequest) (*devboxv1.GetSessionsResponse, error) {
	_, d, err := g.running(ctx, req.GetInstanceId(), false)
	if err != nil {
		return nil, err
	}
	return d.GetSessions(ctx, req)
}

// ---- leases ----

func (g *Gateway) SetInstanceLeases(ctx context.Context, req *devboxv1.SetInstanceLeasesRequest) (*devboxv1.SetInstanceLeasesResponse, error) {
	inst := g.get(req.GetInstanceId())
	if inst == nil {
		return nil, errNotFound(req.GetInstanceId())
	}
	maxDeferral := policyDuration(inst.idlePolicy(), (*devboxv1.IdlePolicy).GetMaxDeferral)
	now := g.now()

	inst.mu.Lock()
	if req.GetGeneration() != 0 && req.GetGeneration() < inst.leaseGen {
		resp := &devboxv1.SetInstanceLeasesResponse{Leases: cloneLeases(inst.leases), Idle: inst.idle}
		inst.mu.Unlock()
		return resp, nil
	}
	leases := cloneLeases(req.GetLeases())
	for _, l := range leases {
		if l.GetKind() == devboxv1.LeaseKind_LEASE_KIND_DEFERRAL && l.GetExpiresAt() != nil {
			if limit := now.Add(maxDeferral); l.GetExpiresAt().AsTime().After(limit) {
				if l.RequestedUntil == nil {
					l.RequestedUntil = l.ExpiresAt
				}
				l.ExpiresAt = timestamppb.New(limit)
			}
		}
	}
	inst.leases = leases
	inst.leaseGen = req.GetGeneration()
	running := inst.rec.status() == devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING
	idle := inst.idle
	actor := inst.rec.ActorID()
	inst.mu.Unlock()

	if !running {
		return &devboxv1.SetInstanceLeasesResponse{Leases: leases, Idle: idle}, nil
	}
	resp, err := g.deps.Router.Daemon(actor).SetLeases(ctx, &devboxv1.SetInstanceLeasesRequest{
		InstanceId: inst.ID,
		Leases:     leases,
		Generation: req.GetGeneration(),
	})
	if err != nil {
		g.log.V(1).Info("relaying leases failed; the daemon gets them on the next Initialize", "instance", inst.ID, "error", err.Error())
		return &devboxv1.SetInstanceLeasesResponse{Leases: leases, Idle: idle}, nil
	}
	if resp.GetIdle() != nil {
		inst.mu.Lock()
		inst.idle = resp.GetIdle()
		inst.mu.Unlock()
	}
	return resp, nil
}

// ---- egress ----

func (g *Gateway) InvalidateAllowlist(ctx context.Context, req *devboxv1.InvalidateAllowlistRequest) (*devboxv1.InvalidateAllowlistResponse, error) {
	var updated int32
	for _, inst := range g.list() {
		rec := inst.record()
		if req.GetInstanceId() != "" && rec.InstanceID != req.GetInstanceId() {
			continue
		}
		if req.GetDevboxId() != "" && rec.DevboxID != req.GetDevboxId() {
			continue
		}
		if req.GetInstanceId() == "" && req.GetDevboxId() == "" {
			continue
		}
		if req.GetAllowedRepositories() != nil {
			rec = inst.updateRequest(func(r *devboxv1.CreateInstanceRequest) { r.AllowedRepositories = req.GetAllowedRepositories() })
			if err := g.persist(ctx, &rec); err != nil {
				g.log.Error(err, "persisting allowlist", "instance", inst.ID)
			}
		}
		if rs, ok := g.deps.Runners.(interface{ Invalidate(string) }); ok {
			rs.Invalidate(rec.Runner)
		}
		if runner, err := g.deps.Runners.Get(ctx, rec.Runner); err == nil {
			inst.mu.Lock()
			inst.runner = runner
			inst.mu.Unlock()
		}
		if !terminal(inst.status()) {
			if err := g.applyEgress(ctx, inst); err != nil {
				g.log.Error(err, "re-applying egress policy", "instance", inst.ID)
				continue
			}
		}
		updated++
	}
	return &devboxv1.InvalidateAllowlistResponse{InstancesUpdated: updated}, nil
}
