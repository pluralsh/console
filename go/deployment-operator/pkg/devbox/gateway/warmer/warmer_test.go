package warmer

import (
	"context"
	"errors"
	"testing"

	"github.com/go-logr/logr"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/actors"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/core"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate/ateapi"
)

const atespace = "devbox-large"

type fakeActors struct {
	workers  []*ateapi.Worker
	selector map[string]string
	existing []*ateapi.Actor
	// place picks the node of the i-th boot.
	place     func(i int) string
	resumeErr error
	listErr   error

	boots   []actors.Spec
	deleted []string
}

func (f *fakeActors) ListWorkers(context.Context) ([]*ateapi.Worker, error) {
	return f.workers, f.listErr
}

func (f *fakeActors) ListActors(context.Context, string) ([]*ateapi.Actor, error) {
	return f.existing, nil
}

func (f *fakeActors) GetActorTemplate(context.Context, actors.Ref) (*ateapi.ActorTemplate, error) {
	return &ateapi.ActorTemplate{
		WorkerSelector: &ateapi.Selector{MatchLabels: f.selector},
		Resources:      &ateapi.ResourceRequirements{Limits: &ateapi.Resources{CpuMillicores: 4000, MemoryBytes: 16 << 30}},
	}, nil
}

func (f *fakeActors) CreateActor(_ context.Context, spec actors.Spec) (*ateapi.Actor, error) {
	f.boots = append(f.boots, spec)
	return &ateapi.Actor{}, nil
}

func (f *fakeActors) Resume(context.Context, actors.Ref) error { return f.resumeErr }

func (f *fakeActors) WaitState(context.Context, actors.Ref, ...ateapi.ActorState) (*ateapi.Actor, error) {
	node := f.place(len(f.boots) - 1)
	return &ateapi.Actor{Status: &ateapi.ActorStatus{
		State:            ateapi.ActorState_ACTOR_STATE_RUNNING,
		WorkerAssignment: &ateapi.WorkerAssignment{NodeName: node},
	}}, nil
}

func (f *fakeActors) DeleteActor(_ context.Context, ref actors.Ref) error {
	f.deleted = append(f.deleted, ref.Name)
	return nil
}

func worker(node string, used int32, poolLabels map[string]string) *ateapi.Worker {
	return &ateapi.Worker{
		Metadata: &ateapi.ResourceMetadata{Name: "w-" + node},
		NodeName: node,
		Labels:   poolLabels,
		Status: &ateapi.WorkerStatus{
			State:           ateapi.WorkerState_WORKER_STATE_ACTIVE,
			RegisteredEpoch: 1,
			Capacity:        &ateapi.WorkerResources{CpuMillicores: 4000, MemoryBytes: 16 << 30, Actors: 100},
			Allocated:       &ateapi.WorkerResources{CpuMillicores: int64(used) * 4000, MemoryBytes: int64(used) * 16 << 30, Actors: used},
		},
	}
}

type staticRunners []*core.Runner

func (s staticRunners) List(context.Context) ([]*core.Runner, error) { return s, nil }

func runner(template string) *core.Runner {
	return &core.Runner{Name: "devbox-large", Atespace: atespace, Template: template, GoldenTag: template + "-golden"}
}

var large = map[string]string{"pool": "large"}

func newWarmer(f *fakeActors, runners ...*core.Runner) *Warmer {
	return New(Config{}, Deps{Actors: f, Runners: staticRunners(runners), Log: logr.Discard()})
}

func mustPass(t *testing.T, w *Warmer) {
	t.Helper()
	if err := w.pass(context.Background()); err != nil {
		t.Fatal(err)
	}
}

func TestFirstPassOnlyRecordsNodesAndRemovesStaleWarmActors(t *testing.T) {
	f := &fakeActors{
		workers:  []*ateapi.Worker{worker("node-a", 0, large)},
		selector: large,
		existing: []*ateapi.Actor{
			{Metadata: &ateapi.ResourceMetadata{Name: substrate.WarmActorPrefix + "left-behind"}},
			{Metadata: &ateapi.ResourceMetadata{Name: "dbx-instance"}},
		},
	}
	w := newWarmer(f, runner("devbox-large-r2"))
	mustPass(t, w)
	mustPass(t, w)
	if len(f.boots) != 0 {
		t.Fatalf("booted %v on nodes that existed at startup", f.boots)
	}
	if len(f.deleted) != 1 || f.deleted[0] != substrate.WarmActorPrefix+"left-behind" {
		t.Fatalf("deleted %v, want only the stale warm actor", f.deleted)
	}
}

func TestWarmsANewNodeUntilAnActorLandsThere(t *testing.T) {
	f := &fakeActors{workers: []*ateapi.Worker{worker("node-a", 0, large)}, selector: large}
	w := newWarmer(f, runner("devbox-large-r2"))
	mustPass(t, w)

	f.workers = append(f.workers, worker("node-b", 0, large))
	f.place = func(i int) string { return []string{"node-a", "node-b"}[i] }
	mustPass(t, w)
	if len(f.boots) != 2 {
		t.Fatalf("booted %d warm actors, want 2 (the first landed on the warm node)", len(f.boots))
	}
	spec := f.boots[0]
	if spec.Template != "devbox-large-r2" || spec.SourceTag != "devbox-large-r2-golden" || spec.Preview {
		t.Fatalf("warm actor spec %+v, want the template's golden tag", spec)
	}
	if !substrate.IsWarmActor(spec.Ref.Name) || spec.Ref.Atespace != atespace {
		t.Fatalf("warm actor %s isn't a warm actor of the runner's atespace", spec.Ref)
	}
	if len(f.deleted) != 2 {
		t.Fatalf("deleted %v, want every warm actor deleted", f.deleted)
	}

	mustPass(t, w)
	if len(f.boots) != 2 {
		t.Fatalf("warmed node-b again")
	}
}

func TestGivesUpOnANodeAfterItsAttempts(t *testing.T) {
	f := &fakeActors{workers: []*ateapi.Worker{worker("node-a", 0, large)}, selector: large}
	w := newWarmer(f, runner("devbox-large-r2"))
	mustPass(t, w)

	f.workers = append(f.workers, worker("node-b", 0, large))
	f.place = func(int) string { return "node-a" }
	mustPass(t, w)
	mustPass(t, w)
	if len(f.boots) != defaultAttempts {
		t.Fatalf("booted %d warm actors, want %d", len(f.boots), defaultAttempts)
	}
}

func TestSkipsNodesTheTemplateAlreadyRunsOn(t *testing.T) {
	f := &fakeActors{workers: []*ateapi.Worker{worker("node-a", 0, large)}, selector: large}
	w := newWarmer(f, runner("devbox-large-r2"))
	mustPass(t, w)

	f.workers = append(f.workers, worker("node-b", 0, large))
	f.existing = []*ateapi.Actor{{
		Metadata:      &ateapi.ResourceMetadata{Name: "dbx-instance"},
		ActorTemplate: &ateapi.ObjectRef{Name: "devbox-large-r2"},
		Status: &ateapi.ActorStatus{
			State:            ateapi.ActorState_ACTOR_STATE_RUNNING,
			WorkerAssignment: &ateapi.WorkerAssignment{NodeName: "node-b"},
		},
	}}
	mustPass(t, w)
	if len(f.boots) != 0 {
		t.Fatalf("booted %v on a node an instance already pulled the image on", f.boots)
	}
}

func TestSkipsWorkersOfOtherPoolsAndWorkersWithoutRoom(t *testing.T) {
	f := &fakeActors{workers: []*ateapi.Worker{worker("node-a", 0, large)}, selector: large}
	w := newWarmer(f, runner("devbox-large-r2"))
	mustPass(t, w)

	f.workers = append(f.workers, worker("node-small", 0, map[string]string{"pool": "small"}), worker("node-full", 1, large))
	mustPass(t, w)
	if len(f.boots) != 0 {
		t.Fatalf("booted %v for workers the template can't use now", f.boots)
	}

	f.workers[2] = worker("node-full", 0, large)
	f.place = func(int) string { return "node-full" }
	mustPass(t, w)
	if len(f.boots) != 1 {
		t.Fatalf("booted %d warm actors once the worker had room, want 1", len(f.boots))
	}
}

func TestWarmsANewTemplateOnExistingNodes(t *testing.T) {
	f := &fakeActors{workers: []*ateapi.Worker{worker("node-a", 0, large)}, selector: large}
	r := runner("devbox-large-r2")
	w := newWarmer(f, r)
	mustPass(t, w)

	r.Template, r.GoldenTag = "devbox-large-r3", "devbox-large-r3-golden"
	r.HomeStorage = v1alpha1.DevboxHomeZeroFS
	f.place = func(int) string { return "node-a" }
	mustPass(t, w)
	if len(f.boots) != 1 || f.boots[0].Template != "devbox-large-r3" {
		t.Fatalf("boots %v, want one of the new revision", f.boots)
	}
	if f.boots[0].SourceTag != "" || !f.boots[0].Preview {
		t.Fatalf("an external-home template takes its default golden tag under preview, got %+v", f.boots[0])
	}
	if _, ok := w.templates[atespace+"/devbox-large-r2"]; ok {
		t.Fatal("kept the state of a template the runner no longer uses")
	}
}

func TestRetriesAFailedBootNextPass(t *testing.T) {
	f := &fakeActors{workers: []*ateapi.Worker{worker("node-a", 0, large)}, selector: large}
	w := newWarmer(f, runner("devbox-large-r2"))
	mustPass(t, w)

	f.workers = append(f.workers, worker("node-b", 0, large))
	f.resumeErr = errors.New("no worker has room")
	mustPass(t, w)
	if len(f.boots) != 1 || len(f.deleted) != 1 {
		t.Fatalf("boots %d deleted %v, want one failed boot cleaned up", len(f.boots), f.deleted)
	}
	f.resumeErr = nil
	f.place = func(int) string { return "node-b" }
	mustPass(t, w)
	if len(f.boots) != 2 {
		t.Fatalf("booted %d warm actors, want a retry after the failure", len(f.boots))
	}
}

func TestRunStopsWithoutPermissionToListWorkers(t *testing.T) {
	f := &fakeActors{listErr: status.Error(codes.PermissionDenied, "nope")}
	w := newWarmer(f)
	if err := w.Run(context.Background()); err != nil {
		t.Fatal(err)
	}
}
