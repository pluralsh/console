package controller

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"strings"

	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate/ateapi"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/zones"
)

func devboxZonalPoolName(runner *v1alpha1.DevboxRunner, zone string) string {
	suffix := "-" + zone
	return truncateName("devbox-"+runner.Name, dns1123Limit-len(suffix)) + suffix
}

// devboxFindsZones reports whether the operator finds the runner's zones on its nodes: zonal homes without
// spec.workerPool.zones.
func devboxFindsZones(runner *v1alpha1.DevboxRunner) bool {
	return runner.Spec.HomeStorage().Zonal() && len(runner.Spec.WorkerZones()) == 0
}

// devboxWorkerZones are the zones the runner runs a WorkerPool in: spec.workerPool.zones, or the zones it finds
// on its nodes (devboxNodeZones). found is whether the zones were found rather than listed in the spec. Nodes are
// read from the manager's cache, whose Node informer the metrics scraper already runs, and never modified, so they
// aren't copied.
func (r *DevboxRunnerReconciler) devboxWorkerZones(ctx context.Context, runner *v1alpha1.DevboxRunner) (zoneList []string, found bool, err error) {
	if !devboxFindsZones(runner) {
		return runner.Spec.WorkerZones(), false, nil
	}
	nodes := &corev1.NodeList{}
	if err := r.List(ctx, nodes, client.UnsafeDisableDeepCopy); err != nil {
		return nil, true, fmt.Errorf("listing nodes: %w", err)
	}
	return devboxNodeZones(runner, nodes.Items), true, nil
}

// devboxNodeZones are the zones of the nodes matching spec.workerPool.nodeSelector, or of every node while none
// does (before the pool's first node), sorted. Empty runs a single pool, as on clusters whose nodes carry no zone.
func devboxNodeZones(runner *v1alpha1.DevboxRunner, nodes []corev1.Node) []string {
	selector := labels.SelectorFromSet(lo.FromPtr(runner.Spec.WorkerPool).NodeSelector)
	var matching, all []string
	for _, n := range nodes {
		zone := n.Labels[zones.NodeLabel]
		if zone == "" {
			continue
		}
		all = append(all, zone)
		if selector.Matches(labels.Set(n.Labels)) {
			matching = append(matching, zone)
		}
	}
	found := matching
	if len(found) == 0 {
		found = all
	}
	found = lo.Uniq(found)
	slices.Sort(found)
	return found
}

// zoneChangedRunners maps a node event to the runners finding their zones whose found zones no longer match
// status.zones, so a zone gaining or losing the runner's nodes is acted on at once while ordinary node churn
// reconciles nothing. A zone kept for its homes differs too, which only costs a reconcile that changes nothing.
func (r *DevboxRunnerReconciler) zoneChangedRunners(ctx context.Context, _ client.Object) []reconcile.Request {
	runners := &v1alpha1.DevboxRunnerList{}
	if err := r.List(ctx, runners); err != nil {
		return nil
	}
	finding := lo.Filter(runners.Items, func(runner v1alpha1.DevboxRunner, _ int) bool { return devboxFindsZones(&runner) })
	if len(finding) == 0 {
		return nil
	}
	nodes := &corev1.NodeList{}
	if err := r.List(ctx, nodes, client.UnsafeDisableDeepCopy); err != nil {
		return nil
	}
	var out []reconcile.Request
	for i := range finding {
		runner := &finding[i]
		if !slices.Equal(devboxNodeZones(runner, nodes.Items), runner.Status.Zones) {
			out = append(out, reconcile.Request{NamespacedName: types.NamespacedName{Name: runner.Name}})
		}
	}
	return out
}

func (r *DevboxRunnerReconciler) zoneDemand() *zones.Demand {
	return &zones.Demand{Client: r.Client, Namespace: r.Config.OperatorNamespace}
}

// devboxPoolTarget is one WorkerPool the runner runs: its single pool, or one zone's.
type devboxPoolTarget struct {
	// zone is "" for the single pool.
	zone string
	// retired zones were dropped from the runner's zones but still hold homes, so their pool stays to resume
	// those instances; no new instance goes there.
	retired bool
	pool    *unstructured.Unstructured
	// current is the pool's spec.replicas and found whether it has one; ready its ready replicas, read before
	// CreateOrPatch strips status.
	current int64
	found   bool
	ready   int64
	// replicas is what the pool is set to.
	replicas int64

	view           devboxPoolView
	homes, waiting int64
}

func (t *devboxPoolTarget) placeable() bool {
	return !t.retired
}

// devboxPools is the runner's WorkerPools for this pass.
type devboxPools struct {
	// zones are the runner's zones, from devboxWorkerZones.
	zones   []string
	targets []*devboxPoolTarget
	// single is the single pool's namespace/name while it exists, which is also while a runner moving to zones
	// still has instances running on it.
	single *string
	actors []*ateapi.Actor
	// listed is whether actors were listed; they aren't for a single pool without autoscaling.
	listed bool
	// cleanupErr is a failure to remove a pool no longer needed, retried next pass.
	cleanupErr error
	// lingering are zonal pools that failed to be removed, kept in status to retry.
	lingering []v1alpha1.DevboxWorkerPoolZone
}

func (p *devboxPools) zonal() bool {
	return len(p.targets) > 0 && p.targets[0].zone != ""
}

func (p *devboxPools) zoneStatus() []v1alpha1.DevboxWorkerPoolZone {
	out := append([]v1alpha1.DevboxWorkerPoolZone(nil), p.lingering...)
	for _, t := range p.targets {
		if t.zone != "" {
			out = append(out, v1alpha1.DevboxWorkerPoolZone{Zone: t.zone, WorkerPool: t.pool.GetNamespace() + "/" + t.pool.GetName()})
		}
	}
	return out
}

// devboxHomesByZone counts the instances pinned to each zone. Warm actors live for one boot and are never pinned.
func devboxHomesByZone(actors []*ateapi.Actor) map[string]int64 {
	out := map[string]int64{}
	for _, actor := range actors {
		if zone := zones.OfActor(actor); zone != "" && !substrate.IsWarmActor(actor.GetMetadata().GetName()) {
			out[zone]++
		}
	}
	return out
}

// devboxWaitingByZone counts the instances the gateway is waiting to find a worker for, by zone, leaving out any
// that already got one.
func devboxWaitingByZone(actors []*ateapi.Actor, waiting map[string]zones.Waiting) map[string]int64 {
	state := map[string]ateapi.ActorState{}
	for _, actor := range actors {
		state[actor.GetMetadata().GetName()] = actor.GetStatus().GetState()
	}
	out := map[string]int64{}
	for name, w := range waiting {
		s, ok := state[name]
		if !ok || s == ateapi.ActorState_ACTOR_STATE_RUNNING || s == ateapi.ActorState_ACTOR_STATE_RESUMING {
			continue
		}
		out[w.Zone]++
	}
	return out
}

// devboxPoolTargets works out the pools to run: the single pool, or one per zone plus retired zones still
// holding homes. Retired zones without homes lose their pool. A single pool left from before the runner moved to
// zones is kept as it is until no instance runs on it.
func (r *DevboxRunnerReconciler) devboxPoolTargets(ctx context.Context, api substrate.API, runner *v1alpha1.DevboxRunner) (*devboxPools, error) {
	runnerZones, found, err := r.devboxWorkerZones(ctx, runner)
	if err != nil {
		return nil, err
	}
	pools := &devboxPools{}
	zonal := len(runnerZones) > 0 || len(runner.Status.WorkerPoolZones) > 0
	atespace := lo.FromPtr(runner.Status.Atespace)
	if (zonal || lo.FromPtr(runner.Spec.WorkerPool).Autoscaling != nil) && atespace != "" {
		actors, err := api.ListActors(ctx, atespace)
		if err != nil {
			return nil, fmt.Errorf("listing actors: %w", err)
		}
		pools.actors, pools.listed = actors, true
	}
	homes := devboxHomesByZone(pools.actors)
	if found {
		// A found zone whose nodes all scaled away stays while it holds homes: the gateway moves the home of a box
		// resuming in a zone the runner no longer has.
		for _, zone := range runner.Status.Zones {
			if homes[zone] > 0 && !lo.Contains(runnerZones, zone) {
				runnerZones = append(runnerZones, zone)
			}
		}
		slices.Sort(runnerZones)
	}
	pools.zones = runnerZones
	var waiting map[string]int64
	if zonal && atespace != "" {
		entries, err := r.zoneDemand().Waiting(ctx, atespace)
		if err != nil {
			return nil, err
		}
		waiting = devboxWaitingByZone(pools.actors, entries)
	}

	add := func(zone string, retired bool) error {
		name := devboxWorkerPoolName(runner)
		if zone != "" {
			name = devboxZonalPoolName(runner, zone)
		}
		t := &devboxPoolTarget{zone: zone, retired: retired, homes: homes[zone], waiting: waiting[zone]}
		pool, err := r.getWorkerPool(ctx, name)
		if err != nil {
			return err
		}
		t.pool = pool
		t.current, t.found, _ = unstructured.NestedInt64(pool.Object, "spec", "replicas")
		t.ready, _, _ = unstructured.NestedInt64(pool.Object, "status", "readyReplicas")
		pools.targets = append(pools.targets, t)
		return nil
	}

	if len(runnerZones) == 0 {
		if err := add("", false); err != nil {
			return nil, err
		}
		pools.single = lo.ToPtr(r.Config.WorkerPoolNamespace + "/" + devboxWorkerPoolName(runner))
	}
	for _, zone := range runnerZones {
		if err := add(zone, false); err != nil {
			return nil, err
		}
	}
	var errs []error
	for _, p := range runner.Status.WorkerPoolZones {
		if lo.Contains(runnerZones, p.Zone) {
			continue
		}
		if homes[p.Zone] > 0 {
			if err := add(p.Zone, true); err != nil {
				return nil, err
			}
			continue
		}
		_, name, _ := strings.Cut(p.WorkerPool, "/")
		if err := r.deletePool(ctx, name); err != nil {
			errs = append(errs, err)
			pools.lingering = append(pools.lingering, p)
		}
	}
	if len(runnerZones) > 0 {
		single, err := r.retireSinglePool(ctx, api, runner, pools.actors)
		if err != nil {
			errs = append(errs, err)
		}
		pools.single = single
	}
	pools.cleanupErr = errors.Join(errs...)
	return pools, nil
}

func (r *DevboxRunnerReconciler) getWorkerPool(ctx context.Context, name string) (*unstructured.Unstructured, error) {
	pool := &unstructured.Unstructured{}
	pool.SetGroupVersionKind(workerPoolGVK)
	if err := r.Get(ctx, client.ObjectKey{Name: name, Namespace: r.Config.WorkerPoolNamespace}, pool); err != nil && !apierrors.IsNotFound(err) {
		return nil, fmt.Errorf("getting WorkerPool %s: %w", name, err)
	}
	pool.SetGroupVersionKind(workerPoolGVK)
	pool.SetName(name)
	pool.SetNamespace(r.Config.WorkerPoolNamespace)
	return pool, nil
}

// retireSinglePool removes the single pool of a runner that moved to zones once no instance runs on it, and
// returns its namespace/name while it remains. Until then it is left as it is: its instances aren't pinned, so
// they resume in a zonal pool once suspended.
func (r *DevboxRunnerReconciler) retireSinglePool(ctx context.Context, api substrate.API, runner *v1alpha1.DevboxRunner, actors []*ateapi.Actor) (*string, error) {
	name := devboxWorkerPoolName(runner)
	pool, err := r.getWorkerPool(ctx, name)
	if err != nil {
		return nil, err
	}
	if pool.GetUID() == "" {
		return nil, nil
	}
	ref := lo.ToPtr(r.Config.WorkerPoolNamespace + "/" + name)
	running := runningActors(actors)
	if len(running) > 0 {
		workers, err := api.ListWorkers(ctx)
		if err != nil {
			return ref, fmt.Errorf("listing Substrate workers: %w", err)
		}
		onPool := map[string]bool{}
		for _, w := range workers {
			if w.GetWorkerNamespace() == r.Config.WorkerPoolNamespace && w.GetWorkerPool() == name {
				onPool[w.GetMetadata().GetName()] = true
			}
		}
		for _, actor := range running {
			if !substrate.IsWarmActor(actor.GetMetadata().GetName()) && onPool[actor.GetStatus().GetWorkerAssignment().GetWorker().GetName()] {
				return ref, nil
			}
		}
	}
	if err := r.deletePool(ctx, name); err != nil {
		return ref, err
	}
	return nil, nil
}

// devboxZoneOrder is the zones in the order the minimum and fixed replicas are dealt to them: the zones holding
// homes, most first, or the zone new instances go to when none does.
func devboxZoneOrder(targets []*devboxPoolTarget) []string {
	homes := make(map[string]int64, len(targets))
	all := make([]string, 0, len(targets))
	var withHomes []string
	for _, t := range targets {
		homes[t.zone] = t.homes
		all = append(all, t.zone)
		if t.homes > 0 {
			withHomes = append(withHomes, t.zone)
		}
	}
	if len(withHomes) > 0 {
		return zones.Order(withHomes, homes)
	}
	if place := devboxPlacementZone(targets); place != nil {
		return []string{place.zone}
	}
	return all[:min(len(all), 1)]
}

// devboxPlacementZone is the pool new instances go to and where the spare instance slots are kept: the placeable
// zone holding the most homes, the first listed between equals.
func devboxPlacementZone(targets []*devboxPoolTarget) *devboxPoolTarget {
	var best *devboxPoolTarget
	for _, t := range targets {
		if t.placeable() && (best == nil || t.homes > best.homes) {
			best = t
		}
	}
	return best
}

// setFixedReplicas deals spec.workerPool.replicas to the pools: all of it to a single pool, or round-robin over the
// zones holding homes. Retired zones get one worker at least while they hold homes.
func setFixedReplicas(targets []*devboxPoolTarget, replicas int64) {
	if len(targets) == 1 && targets[0].zone == "" {
		targets[0].replicas = replicas
		return
	}
	dealt := zones.Spread(replicas, devboxZoneOrder(targets))
	for _, t := range targets {
		t.replicas = dealt[t.zone]
		if t.retired && t.homes > 0 {
			t.replicas = max(t.replicas, 1)
		}
	}
}

// devboxZoneLoad is one zonal pool as the autoscaler plans it.
type devboxZoneLoad struct {
	zone string
	// homes, used and waiting are the instances whose home is in the zone, running there, and waiting for a
	// worker there.
	homes, used, waiting int64
	// schedulable and retained are the pool's pods taking instances, and drained or held ones.
	schedulable, retained int64
	placeable             bool
}

// planZonalWorkers plans the zonal pools' workers. Each zone needs enough for its running and waiting instances;
// the spare slots (after free slots on AdditionalPools) go to the placement zone; the minimum is dealt round-robin
// over the zones holding homes, so it isn't repeated in every zone. It returns each zone's desired workers and the
// workers to run when scaling up, which adds pods in placement order only while all pools' live pods stay within
// maxReplicas and never drops below the schedulable pods already running.
func planZonalWorkers(as *v1alpha1.DevboxWorkerAutoscaling, perWorker, additionalFree int64, loads []devboxZoneLoad) (desired, active []int64) {
	targets := make([]*devboxPoolTarget, len(loads))
	index := map[string]int{}
	homes := map[string]int64{}
	for i, l := range loads {
		targets[i] = &devboxPoolTarget{zone: l.zone, homes: l.homes, retired: !l.placeable}
		index[l.zone] = i
		homes[l.zone] = l.homes
	}
	spare := max(int64(lo.FromPtrOr(as.SpareInstances, 1))-additionalFree, 0)
	place := devboxPlacementZone(targets)
	minimum := zones.Spread(int64(lo.FromPtrOr(as.MinReplicas, 1)), devboxZoneOrder(targets))

	desired = make([]int64, len(loads))
	active = make([]int64, len(loads))
	budget := int64(as.MaxReplicas)
	for i, l := range loads {
		need := l.used + l.waiting
		if place != nil && place.zone == l.zone {
			need += spare
		}
		desired[i] = max((need+perWorker-1)/perWorker, minimum[l.zone])
		active[i] = l.schedulable
		budget -= l.schedulable + l.retained
	}
	order := zones.Order(lo.Map(loads, func(l devboxZoneLoad, _ int) string { return l.zone }), homes)
	if place != nil {
		order = append([]string{place.zone}, lo.Without(order, place.zone)...)
	}
	for _, zone := range order {
		i := index[zone]
		if add := min(desired[i]-active[i], budget); add > 0 {
			active[i] += add
			budget -= add
		}
	}
	return desired, active
}
