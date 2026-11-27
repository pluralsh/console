package core

import (
	"context"
	"testing"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/actors"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate/ateapi"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/zones"
)

func zoneWorker(pool string, state ateapi.WorkerState, cpu, usedCPU int64, actors, usedActors int32) *ateapi.Worker {
	return &ateapi.Worker{
		Metadata:        &ateapi.ResourceMetadata{Name: pool + "-w"},
		WorkerNamespace: "ns",
		WorkerPool:      pool,
		Status: &ateapi.WorkerStatus{
			State:     state,
			Capacity:  &ateapi.WorkerResources{CpuMillicores: cpu, Actors: actors},
			Allocated: &ateapi.WorkerResources{CpuMillicores: usedCPU, Actors: usedActors},
		},
	}
}

func TestFreeSlotsByZone(t *testing.T) {
	runner := &Runner{ZonePools: map[string]string{"ns/pool-a": "a", "ns/pool-b": "b"}, InstanceCPU: 2000}
	workers := []*ateapi.Worker{
		zoneWorker("pool-a", ateapi.WorkerState_WORKER_STATE_ACTIVE, 8000, 2000, 0, 0),
		zoneWorker("pool-a", ateapi.WorkerState_WORKER_STATE_DRAINING, 8000, 0, 0, 0),
		zoneWorker("pool-b", ateapi.WorkerState_WORKER_STATE_ACTIVE, 8000, 0, 2, 1),
		zoneWorker("other", ateapi.WorkerState_WORKER_STATE_ACTIVE, 8000, 0, 0, 0),
	}
	got := freeSlotsByZone(workers, runner)
	if got["a"] != 3 || got["b"] != 1 || len(got) != 2 {
		t.Fatalf("free slots = %v, want a:3 (draining ignored) b:1 (actor cap) and no other pool", got)
	}
}

func TestBlockHomesArePinnedToAPackedZone(t *testing.T) {
	h := newHarness(t, nil)
	runner := h.g.deps.Runners.(StaticRunners)[testRunner]
	runner.HomeStorage = v1alpha1.DevboxHomeBlock
	runner.Revisions[2] = RunnerRevision{Template: "tmpl-r2", GoldenTag: "golden-r2", HomeStorage: v1alpha1.DevboxHomeBlock}
	runner.Zones = []string{"a", "b", "c"}
	runner.ZonePools = map[string]string{"ns/pool-a": "a", "ns/pool-b": "b", "ns/pool-c": "c"}
	runner.InstanceCPU = 2000
	h.ate.ExternalHomes = true
	ctx := context.Background()

	// zone c holds the most homes but has no room; b has room
	if _, err := h.g.deps.Actors.CreateActor(ctx, actors.Spec{Ref: actors.Ref{Atespace: testAtespace, Name: "other"}, Template: "tmpl-r2", Zone: "c"}); err != nil {
		t.Fatal(err)
	}
	h.ate.Workers = []*ateapi.Worker{
		zoneWorker("pool-b", ateapi.WorkerState_WORKER_STATE_ACTIVE, 8000, 0, 0, 0),
		zoneWorker("pool-c", ateapi.WorkerState_WORKER_STATE_ACTIVE, 8000, 8000, 0, 0),
	}

	h.running("inst-1")
	actor, err := h.g.deps.Actors.GetActor(ctx, actors.Ref{Atespace: testAtespace, Name: "dbx-inst-1"})
	if err != nil {
		t.Fatal(err)
	}
	if got := zones.OfActor(actor); got != "b" {
		t.Fatalf("actor zone = %q, want b: the fullest zone with room", got)
	}
	if got := h.g.get("inst-1").record().Zone; got != "b" {
		t.Fatalf("record zone = %q", got)
	}

	// dropping zone b moves the instance to a zone the runner still lists before it wakes again
	if _, err := h.g.SuspendInstance(ctx, &devboxv1.InstanceActionRequest{InstanceId: "inst-1"}); err != nil {
		t.Fatal(err)
	}
	runner.Zones = []string{"a", "c"}
	h.ate.Workers = []*ateapi.Worker{
		zoneWorker("pool-a", ateapi.WorkerState_WORKER_STATE_ACTIVE, 8000, 0, 0, 0),
		zoneWorker("pool-c", ateapi.WorkerState_WORKER_STATE_ACTIVE, 8000, 8000, 0, 0),
	}
	if _, err := h.g.ResumeInstance(ctx, &devboxv1.InstanceActionRequest{InstanceId: "inst-1"}); err != nil {
		t.Fatal(err)
	}
	actor, err = h.g.deps.Actors.GetActor(ctx, actors.Ref{Atespace: testAtespace, Name: "dbx-inst-1"})
	if err != nil {
		t.Fatal(err)
	}
	if got := zones.OfActor(actor); got != "a" {
		t.Fatalf("actor zone after dropping b = %q, want a: c is full", got)
	}
	if got := h.g.get("inst-1").record().Zone; got != "a" {
		t.Fatalf("record zone after dropping b = %q", got)
	}
}
