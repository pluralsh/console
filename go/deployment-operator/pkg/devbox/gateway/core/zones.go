package core

import (
	"context"
	"fmt"
	"slices"

	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate/ateapi"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/zones"
)

// instanceZone is the zone a new instance's home goes to, kept in its record so a retried provision reuses it.
// New instances pack into the zone already holding the most homes while it has a free slot, so the autoscaler's
// spare capacity and minimum stay in few zones.
func (g *Gateway) instanceZone(ctx context.Context, inst *Instance, runner *Runner) (string, error) {
	inst.mu.Lock()
	zone := inst.rec.Zone
	inst.mu.Unlock()
	if zone != "" {
		return zone, nil
	}

	actors, err := g.deps.Actors.ListActors(ctx, runner.Atespace)
	if err != nil {
		return "", fmt.Errorf("listing actors: %w", err)
	}
	homes := map[string]int64{}
	for _, a := range actors {
		if z := zones.OfActor(a); z != "" {
			homes[z]++
		}
	}
	workers, err := g.deps.Actors.ListWorkers(ctx)
	if err != nil {
		return "", fmt.Errorf("listing workers: %w", err)
	}
	zone = zones.Pick(runner.Zones, homes, freeSlotsByZone(workers, runner))

	inst.mu.Lock()
	inst.rec.Zone = zone
	inst.mu.Unlock()
	return zone, nil
}

// repin moves an instance whose zone the runner no longer lists to one it does, before the instance wakes. Its
// home follows: the block driver moves the disk through a snapshot on its first attach in the new zone. Holds
// inst.op.
func (g *Gateway) repin(ctx context.Context, inst *Instance) error {
	inst.mu.Lock()
	runner, old := inst.runner, inst.rec.Zone
	inst.mu.Unlock()
	if runner == nil || !runner.HomeStorage.Zonal() || len(runner.Zones) == 0 || old == "" || slices.Contains(runner.Zones, old) {
		return nil
	}
	inst.mu.Lock()
	inst.rec.Zone = ""
	inst.mu.Unlock()
	zone, err := g.instanceZone(ctx, inst, runner)
	if err == nil {
		err = g.deps.Actors.SetZone(ctx, inst.ref(), zone)
	}
	if err != nil {
		inst.mu.Lock()
		inst.rec.Zone = old
		inst.mu.Unlock()
		return err
	}
	rec := inst.record()
	if err := g.persist(ctx, &rec); err != nil {
		return err
	}
	g.log.Info("moved instance out of a dropped zone", "instance", inst.ID, "from", old, "to", zone)
	return nil
}

// freeSlotsByZone counts the instances that still fit on the active workers of each of the runner's zonal pools.
func freeSlotsByZone(workers []*ateapi.Worker, runner *Runner) map[string]int64 {
	out := map[string]int64{}
	for _, w := range workers {
		zone, ok := runner.ZonePools[w.GetWorkerNamespace()+"/"+w.GetWorkerPool()]
		if !ok || w.GetStatus().GetState() != ateapi.WorkerState_WORKER_STATE_ACTIVE {
			continue
		}
		total, used := w.GetStatus().GetCapacity(), w.GetStatus().GetAllocated()
		free := int64(1)
		if runner.InstanceCPU > 0 {
			free = (total.GetCpuMillicores() - used.GetCpuMillicores()) / runner.InstanceCPU
		}
		if total.GetActors() > 0 {
			free = min(free, int64(total.GetActors()-used.GetActors()))
		}
		out[zone] += max(free, 0)
	}
	return out
}
