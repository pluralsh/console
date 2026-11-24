package core

import (
	"context"
	"slices"
	"strings"
	"testing"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate/ateapi"
)

const testActor = testAtespace + "/dbx-inst-1"

// release publishes revision 3 (a new daemon) as the runner's current revision.
func (h *harness) release(updateOnResume bool) {
	h.t.Helper()
	runners := h.g.deps.Runners.(StaticRunners)
	next := *runners[testRunner]
	next.Template, next.Revision, next.GoldenTag = "tmpl-r3", 3, "golden-r3"
	next.ImageDigest, next.DaemonVersion = "sha256:env", "0.12.1"
	next.UpdateOnResume = updateOnResume
	next.Revisions = map[int64]RunnerRevision{
		2: {Template: "tmpl-r2", GoldenTag: "golden-r2", ImageDigest: "sha256:env", DaemonVersion: "0.12.0"},
		3: {Template: "tmpl-r3", GoldenTag: "golden-r3", ImageDigest: "sha256:env", DaemonVersion: "0.12.1"},
	}
	runners[testRunner] = &next
}

func (h *harness) rebase(id string, revision int64) *devboxv1.RebaseInstanceResponse {
	h.t.Helper()
	resp, err := h.g.RebaseInstance(context.Background(), &devboxv1.RebaseInstanceRequest{InstanceId: id, TargetRevision: revision, Reason: "test"})
	if err != nil {
		h.t.Fatal(err)
	}
	return resp
}

func (h *harness) suspended(inst *Instance) {
	h.t.Helper()
	if _, err := h.g.SuspendInstance(context.Background(), &devboxv1.InstanceActionRequest{InstanceId: inst.ID}); err != nil {
		h.t.Fatal(err)
	}
	if st := inst.status(); st != devboxv1.InstanceStatus_INSTANCE_STATUS_SUSPENDED {
		h.t.Fatalf("instance is %s", st)
	}
}

func (h *harness) template(actor string) string {
	h.t.Helper()
	atespace, name, _ := strings.Cut(actor, "/")
	a, err := h.ate.GetActor(context.Background(), &ateapi.GetActorRequest{Actor: &ateapi.ObjectRef{Atespace: atespace, Name: name}})
	if err != nil {
		h.t.Fatal(err)
	}
	return a.GetActorTemplate().GetName()
}

// calls returns the Substrate calls for the test actor since index from.
func (h *harness) calls(from int) []string {
	var out []string
	for _, c := range h.ate.CallsSnapshot()[from:] {
		if method, ref, _ := strings.Cut(c, " "); ref == testActor && method != "GetActor" {
			out = append(out, method)
		}
	}
	return out
}

func rebaseStateOf(rec Record) devboxv1.RebaseState { return rec.rebaseState() }

func TestRebaseRunningInstance(t *testing.T) {
	h := newHarness(t, nil)
	inst := h.running("inst-1")
	h.release(false)
	mark := len(h.ate.CallsSnapshot())

	resp := h.rebase("inst-1", 0)
	if !resp.GetAccepted() || resp.GetTargetRevision() != 3 {
		t.Fatalf("RebaseInstance = %v", resp)
	}
	h.eventually("running on revision 3", func() bool {
		rec := inst.record()
		return rec.status() == devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING && rec.TemplateRevision == 3 && rec.Rebase == nil
	})

	if got := h.calls(mark); !slices.Equal(got, []string{"SuspendActor", "UpdateActor", "ResumeActor"}) {
		t.Fatalf("substrate calls = %v", got)
	}
	modes := h.ate.SuspendModesSnapshot()
	if modes[len(modes)-1] != ateapi.DurabilityMode_DURABILITY_MODE_SYNCHRONOUS {
		t.Fatalf("an update must suspend synchronously, got %v", modes)
	}
	if got := h.template(testActor); got != "tmpl-r3" {
		t.Fatalf("actor template = %s", got)
	}
	h.daemon.mu.Lock()
	prep := h.daemon.prepares[len(h.daemon.prepares)-1]
	inits := len(h.daemon.initialized)
	h.daemon.mu.Unlock()
	if prep.GetReason() != devboxv1.SuspendReason_SUSPEND_REASON_UPDATE {
		t.Fatalf("PrepareSuspend = %v", prep)
	}
	if inits != 2 {
		t.Fatalf("the daemon must be initialized again after the cold boot, got %d Initialize calls", inits)
	}

	rec := inst.record()
	if rec.Template != "tmpl-r3" || rec.DaemonVersion != "0.12.1" || rebaseStateOf(rec) != devboxv1.RebaseState_REBASE_STATE_SUCCEEDED || rec.RebaseRevision != 3 {
		t.Fatalf("record = %+v", rec)
	}
	last := h.ingest.lastStatus()
	if last.GetStatus() != devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING || last.GetTemplateRevision() != 3 || last.GetDaemonVersion() != "0.12.1" ||
		last.GetRebaseState() != devboxv1.RebaseState_REBASE_STATE_SUCCEEDED || last.GetRebaseRevision() != 3 {
		t.Fatalf("last status report = %v", last)
	}
	persisted, err := h.records.Get(context.Background(), "inst-1")
	if err != nil || persisted.TemplateRevision != 3 || persisted.Rebase != nil {
		t.Fatalf("persisted record = %+v, %v", persisted, err)
	}

	if again := h.rebase("inst-1", 0); again.GetAccepted() {
		t.Fatalf("an instance on the target revision has nothing to do: %v", again)
	}
}

// An idle instance is not woken to be updated: it is only pointed at the new template.
func TestRebaseSuspendedInstanceStartsOnTheRevisionAtItsNextResume(t *testing.T) {
	h := newHarness(t, nil)
	inst := h.running("inst-1")
	h.suspended(inst)
	suspendedAt := inst.record().SuspendedAt
	h.release(false)
	mark := len(h.ate.CallsSnapshot())

	h.rebase("inst-1", 3)
	h.eventually("moved", func() bool { return rebaseStateOf(inst.record()) == devboxv1.RebaseState_REBASE_STATE_SUCCEEDED })
	if got := h.calls(mark); !slices.Equal(got, []string{"UpdateActor"}) {
		t.Fatalf("substrate calls = %v", got)
	}
	rec := inst.record()
	if rec.status() != devboxv1.InstanceStatus_INSTANCE_STATUS_SUSPENDED || rec.TemplateRevision != 3 || rec.Rebase == nil ||
		rec.Rebase.FromTemplate != "tmpl-r2" || rec.Rebase.FromRevision != 2 || !rec.SuspendedAt.Equal(suspendedAt) ||
		rec.SuspendReason != devboxv1.SuspendReason_SUSPEND_REASON_USER.String() {
		t.Fatalf("record = %+v", rec)
	}
	if last := h.ingest.lastStatus(); last.GetStatus() != devboxv1.InstanceStatus_INSTANCE_STATUS_SUSPENDED || last.GetTemplateRevision() != 3 ||
		last.GetSuspendReason() != devboxv1.SuspendReason_SUSPEND_REASON_USER {
		t.Fatalf("last status report = %v", last)
	}

	if _, err := h.g.ResumeInstance(context.Background(), &devboxv1.InstanceActionRequest{InstanceId: "inst-1"}); err != nil {
		t.Fatal(err)
	}
	if rec := inst.record(); rec.status() != devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING || rec.Rebase != nil || rec.TemplateRevision != 3 {
		t.Fatalf("record after resume = %+v", rec)
	}
}

func TestRebaseRollsBackAnInstanceThatCrashesOnTheNewRevision(t *testing.T) {
	h := newHarness(t, nil)
	inst := h.running("inst-1")
	h.release(true)
	h.ate.CrashOnTemplate = "tmpl-r3"
	mark := len(h.ate.CallsSnapshot())

	h.rebase("inst-1", 0)
	h.eventually("rolled back and running", func() bool {
		rec := inst.record()
		return rebaseStateOf(rec) == devboxv1.RebaseState_REBASE_STATE_FAILED && rec.status() == devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING
	})

	want := []string{"SuspendActor", "UpdateActor", "ResumeActor", "RevertActor", "UpdateActor", "ResumeActor"}
	if got := h.calls(mark); !slices.Equal(got, want) {
		t.Fatalf("substrate calls = %v", got)
	}
	if got := h.template(testActor); got != "tmpl-r2" {
		t.Fatalf("actor template = %s", got)
	}
	rec := inst.record()
	if rec.Template != "tmpl-r2" || rec.TemplateRevision != 2 || rec.Rebase != nil || rec.SkipRevision != 3 || rec.RebaseRevision != 3 || rec.RebaseMessage == "" {
		t.Fatalf("record = %+v", rec)
	}
	last := h.ingest.lastStatus()
	if last.GetStatus() != devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING || last.GetTemplateRevision() != 2 ||
		last.GetRebaseState() != devboxv1.RebaseState_REBASE_STATE_FAILED || !strings.Contains(last.GetMessage(), "rolled back") {
		t.Fatalf("last status report = %v", last)
	}

	// The onResume policy doesn't walk the instance into the same crash at every resume.
	h.suspended(inst)
	mark = len(h.ate.CallsSnapshot())
	if _, err := h.g.ResumeInstance(context.Background(), &devboxv1.InstanceActionRequest{InstanceId: "inst-1"}); err != nil {
		t.Fatal(err)
	}
	if got := h.calls(mark); !slices.Equal(got, []string{"ResumeActor"}) {
		t.Fatalf("substrate calls on the next resume = %v", got)
	}

	// An explicit request tries again.
	h.ate.CrashOnTemplate = ""
	h.rebase("inst-1", 3)
	h.eventually("running on revision 3", func() bool {
		rec := inst.record()
		return rec.status() == devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING && rec.TemplateRevision == 3 && rec.SkipRevision == 0
	})
}

func TestUpdateOnResumePolicy(t *testing.T) {
	ctx := context.Background()

	t.Run("onResume moves a suspended instance that is behind", func(t *testing.T) {
		h := newHarness(t, nil)
		inst := h.running("inst-1")
		h.suspended(inst)
		h.release(true)
		mark := len(h.ate.CallsSnapshot())
		if _, err := h.g.ResumeInstance(ctx, &devboxv1.InstanceActionRequest{InstanceId: "inst-1"}); err != nil {
			t.Fatal(err)
		}
		if got := h.calls(mark); !slices.Equal(got, []string{"UpdateActor", "ResumeActor"}) {
			t.Fatalf("substrate calls = %v", got)
		}
		rec := inst.record()
		if rec.TemplateRevision != 3 || rec.Rebase != nil || rebaseStateOf(rec) != devboxv1.RebaseState_REBASE_STATE_SUCCEEDED {
			t.Fatalf("record = %+v", rec)
		}
		if last := h.ingest.lastStatus(); last.GetTemplateRevision() != 3 || last.GetMessage() != "updated to revision 3" {
			t.Fatalf("last status report = %v", last)
		}
	})

	t.Run("manual leaves it on its revision", func(t *testing.T) {
		h := newHarness(t, nil)
		inst := h.running("inst-1")
		h.suspended(inst)
		h.release(false)
		mark := len(h.ate.CallsSnapshot())
		if _, err := h.g.ResumeInstance(ctx, &devboxv1.InstanceActionRequest{InstanceId: "inst-1"}); err != nil {
			t.Fatal(err)
		}
		if got := h.calls(mark); !slices.Equal(got, []string{"ResumeActor"}) {
			t.Fatalf("substrate calls = %v", got)
		}
		if rec := inst.record(); rec.TemplateRevision != 2 {
			t.Fatalf("record = %+v", rec)
		}
	})

	// A snapshot suspends and resumes a running instance; that resume must bring back what was suspended.
	t.Run("a snapshot's own resume doesn't update", func(t *testing.T) {
		h := newHarness(t, nil)
		inst := h.running("inst-1")
		h.release(true)
		if _, err := h.g.SnapshotInstance(ctx, &devboxv1.SnapshotInstanceRequest{InstanceId: "inst-1", SnapshotId: "snap-1"}); err != nil {
			t.Fatal(err)
		}
		h.eventually("snapshot reported", func() bool {
			h.ingest.mu.Lock()
			defer h.ingest.mu.Unlock()
			return len(h.ingest.snapshots) > 0
		})
		h.eventually("running again", func() bool { return inst.status() == devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING })
		if rec := inst.record(); rec.TemplateRevision != 2 || h.template(testActor) != "tmpl-r2" {
			t.Fatalf("record = %+v", rec)
		}
	})

	t.Run("a crash on the new revision is rolled back and the instance still resumes", func(t *testing.T) {
		h := newHarness(t, nil)
		inst := h.running("inst-1")
		h.suspended(inst)
		h.release(true)
		h.ate.CrashOnTemplate = "tmpl-r3"
		st, err := h.g.ResumeInstance(ctx, &devboxv1.InstanceActionRequest{InstanceId: "inst-1"})
		if err != nil || st.GetStatus() != devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING {
			t.Fatalf("ResumeInstance = %v, %v", st, err)
		}
		if rec := inst.record(); rec.TemplateRevision != 2 || rec.SkipRevision != 3 || rebaseStateOf(rec) != devboxv1.RebaseState_REBASE_STATE_FAILED {
			t.Fatalf("record = %+v", rec)
		}
	})
}

// No worker has room: the actor isn't crashed, so nothing is rolled back. The instance stays suspended on the
// new revision and starts there when it is resumed again.
func TestRebaseWithoutRoomStaysOnTheNewRevision(t *testing.T) {
	h := newHarness(t, nil)
	inst := h.running("inst-1")
	h.release(false)
	h.ate.FailResume = status.Error(codes.ResourceExhausted, "no worker has room for the actor")
	h.ate.FailResumeTimes = 1

	h.rebase("inst-1", 0)
	h.eventually("suspended on revision 3", func() bool {
		rec := inst.record()
		return rec.status() == devboxv1.InstanceStatus_INSTANCE_STATUS_SUSPENDED && rec.TemplateRevision == 3 &&
			rebaseStateOf(rec) == devboxv1.RebaseState_REBASE_STATE_SUCCEEDED && strings.Contains(rec.Message, "could not be resumed")
	})
	if slices.Contains(h.ate.CallsSnapshot(), "RevertActor "+testActor) {
		t.Fatalf("an actor that isn't crashed must not be reverted: %v", h.ate.CallsSnapshot())
	}
	if rec := inst.record(); rec.Rebase == nil || rec.SuspendReason != devboxv1.SuspendReason_SUSPEND_REASON_UPDATE.String() {
		t.Fatalf("record = %+v", rec)
	}

	if _, err := h.g.ResumeInstance(context.Background(), &devboxv1.InstanceActionRequest{InstanceId: "inst-1"}); err != nil {
		t.Fatal(err)
	}
	if rec := inst.record(); rec.status() != devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING || rec.TemplateRevision != 3 || rec.Rebase != nil {
		t.Fatalf("record after resume = %+v", rec)
	}
}

func TestRebaseInstanceRejectsWhatItCantDo(t *testing.T) {
	h := newHarness(t, nil)
	h.running("inst-1")
	ctx := context.Background()

	if _, err := h.g.RebaseInstance(ctx, &devboxv1.RebaseInstanceRequest{InstanceId: "nope"}); status.Code(err) != codes.NotFound {
		t.Fatalf("unknown instance: %v", err)
	}
	if resp := h.rebase("inst-1", 0); resp.GetAccepted() {
		t.Fatalf("already current: %v", resp)
	}
	// Only the serving revision is a target: a newer one hasn't passed its probe, and an older one (revision 1
	// still exists) would undo an update.
	for _, revision := range []int64{1, 3} {
		if _, err := h.g.RebaseInstance(ctx, &devboxv1.RebaseInstanceRequest{InstanceId: "inst-1", TargetRevision: revision}); status.Code(err) != codes.FailedPrecondition {
			t.Fatalf("revision %d: %v", revision, err)
		}
	}
}

// The actor starts on the new revision but its daemon refuses Initialize: it is suspended and moved back, and
// starts again on the revision it had.
func TestRebaseRollsBackAnInstanceWhoseDaemonNeverBecomesUsable(t *testing.T) {
	h := newHarness(t, nil)
	inst := h.running("inst-1")
	h.release(true)
	h.daemon.mu.Lock()
	h.daemon.failInitialize = 1
	h.daemon.mu.Unlock()
	mark := len(h.ate.CallsSnapshot())

	h.rebase("inst-1", 0)
	h.eventually("rolled back and running", func() bool {
		rec := inst.record()
		return rebaseStateOf(rec) == devboxv1.RebaseState_REBASE_STATE_FAILED && rec.status() == devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING
	})
	want := []string{"SuspendActor", "UpdateActor", "ResumeActor", "SuspendActor", "UpdateActor", "ResumeActor"}
	if got := h.calls(mark); !slices.Equal(got, want) {
		t.Fatalf("substrate calls = %v", got)
	}
	if rec := inst.record(); rec.TemplateRevision != 2 || rec.Rebase != nil || rec.SkipRevision != 3 || h.template(testActor) != "tmpl-r2" {
		t.Fatalf("record = %+v", rec)
	}
}

// A snapshot of a suspended instance that was moved but hasn't started yet is of the revision it had.
func TestSnapshotOfAPendingRebaseKeepsTheOldRevision(t *testing.T) {
	h := newHarness(t, nil)
	inst := h.running("inst-1")
	h.suspended(inst)
	h.release(false)
	h.rebase("inst-1", 0)
	h.eventually("moved", func() bool { return inst.record().Rebase != nil })

	if _, err := h.g.SnapshotInstance(context.Background(), &devboxv1.SnapshotInstanceRequest{InstanceId: "inst-1", SnapshotId: "snap-1"}); err != nil {
		t.Fatal(err)
	}
	h.eventually("snapshot report", func() bool {
		h.ingest.mu.Lock()
		defer h.ingest.mu.Unlock()
		return len(h.ingest.snapshots) > 0
	})
	h.ingest.mu.Lock()
	report := h.ingest.snapshots[0]
	h.ingest.mu.Unlock()
	if report.GetSnapshot().GetTemplateRevision() != 2 {
		t.Fatalf("snapshot report = %v", report)
	}
}

// The gateway stopped after the instance started on the new revision but before it recorded that.
func TestAdoptCompletesARebaseThatAlreadyStarted(t *testing.T) {
	h := newHarness(t, nil)
	inst := h.running("inst-1")
	h.suspended(inst)
	h.release(false)
	h.rebase("inst-1", 0)
	h.eventually("moved", func() bool { return inst.record().Rebase != nil })
	h.ate.SetState(testAtespace, "dbx-inst-1", ateapi.ActorState_ACTOR_STATE_RUNNING, "worker-1")

	h.g.adopt(context.Background(), inst)
	if rec := inst.record(); rec.Rebase != nil || rec.TemplateRevision != 3 || rebaseStateOf(rec) != devboxv1.RebaseState_REBASE_STATE_SUCCEEDED ||
		rec.status() != devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING {
		t.Fatalf("record = %+v", rec)
	}
}

func TestRebaseRetriesALostActorUpdate(t *testing.T) {
	h := newHarness(t, nil)
	inst := h.running("inst-1")
	h.release(false)
	h.ate.FailUpdate = status.Error(codes.Aborted, "version conflict")
	h.ate.FailUpdateTimes = 2

	h.rebase("inst-1", 0)
	h.eventually("running on revision 3", func() bool {
		rec := inst.record()
		return rec.status() == devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING && rec.TemplateRevision == 3
	})
}

// The actor can't be moved: the instance comes back on the revision it had.
func TestRebaseFailureToMoveResumesOnTheOldRevision(t *testing.T) {
	h := newHarness(t, nil)
	inst := h.running("inst-1")
	h.release(false)
	h.ate.FailUpdate = status.Error(codes.InvalidArgument, "volumes differ")
	h.ate.FailUpdateTimes = 1

	h.rebase("inst-1", 0)
	h.eventually("failed and running", func() bool {
		rec := inst.record()
		return rebaseStateOf(rec) == devboxv1.RebaseState_REBASE_STATE_FAILED && rec.status() == devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING
	})
	rec := inst.record()
	if rec.TemplateRevision != 2 || rec.Template != "tmpl-r2" || rec.Rebase != nil || !strings.Contains(rec.RebaseMessage, "volumes differ") {
		t.Fatalf("record = %+v", rec)
	}
	if persisted, _ := h.records.Get(context.Background(), "inst-1"); persisted.TemplateRevision != 2 || persisted.Rebase != nil {
		t.Fatalf("persisted record = %+v", persisted)
	}
}

// The record is written before the actor is repointed, so a gateway that stopped in between adopts an instance
// whose record is ahead of its actor.
func TestAdoptReconcilesAPendingRebaseWithTheActor(t *testing.T) {
	h := newHarness(t, nil)
	inst := h.running("inst-1")
	h.suspended(inst)
	inst.mu.Lock()
	inst.rec.Rebase = &RebaseIntent{FromTemplate: "tmpl-r2", FromRevision: 2, FromDaemonVersion: "0.12.0", ToTemplate: "tmpl-r3", ToRevision: 3}
	inst.rec.Template, inst.rec.TemplateRevision, inst.rec.DaemonVersion = "tmpl-r3", 3, "0.12.1"
	inst.rec.RebaseState = devboxv1.RebaseState_REBASE_STATE_IN_PROGRESS.String()
	inst.mu.Unlock()

	h.g.adopt(context.Background(), inst)
	rec := inst.record()
	if rec.Template != "tmpl-r2" || rec.TemplateRevision != 2 || rec.DaemonVersion != "0.12.0" || rec.Rebase != nil ||
		rebaseStateOf(rec) != devboxv1.RebaseState_REBASE_STATE_FAILED {
		t.Fatalf("record = %+v", rec)
	}
}
