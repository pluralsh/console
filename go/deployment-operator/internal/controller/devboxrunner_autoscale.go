package controller

import (
	"context"
	"fmt"
	"sort"
	"time"

	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate/ateapi"
)

const (
	// podDeletionCostAnnotation ranks pods for removal when a ReplicaSet scales down, lowest first.
	podDeletionCostAnnotation = "controller.kubernetes.io/pod-deletion-cost"
	drainedPodDeletionCost    = "-1000"

	requeueDevboxAutoscale = 30 * time.Second
)

// devboxWorkerPod is a live pod of the managed WorkerPool and the Substrate worker it registered, if any.
type devboxWorkerPod struct {
	pod    corev1.Pod
	worker *ateapi.Worker
	// warm is the gateway's warm actors on the worker, which aren't instances.
	warm int64
}

func (p devboxWorkerPod) state() ateapi.WorkerState {
	return p.worker.GetStatus().GetState()
}

func (p devboxWorkerPod) actors() int64 {
	return max(int64(p.worker.GetStatus().GetAllocated().GetActors())-p.warm, 0)
}

func (p devboxWorkerPod) ready() bool {
	return podReady(p.pod)
}

// devboxPoolView splits the managed pool's live pods by what the autoscaler may do with them.
type devboxPoolView struct {
	// schedulable pods take new instances, or will once their worker registers or becomes available again. An
	// empty unavailable worker counts here, so a pool whose workers can't come up waits on them rather than
	// adding more.
	schedulable []devboxWorkerPod
	// drainedIdle pods are drained and empty, and are removed by lowering replicas.
	drainedIdle []devboxWorkerPod
	// held pods are drained or unavailable with instances still on them. They are kept and don't count toward
	// capacity.
	held []devboxWorkerPod
}

func (v devboxPoolView) used() int64 {
	return lo.SumBy(v.schedulable, devboxWorkerPod.actors)
}

// undurableSnapshotNodes are the nodes holding the only copy of a snapshot: a suspended actor's local snapshot
// that hasn't finished uploading. Its resume is pinned to the node, so removing the node loses the actor's state.
func undurableSnapshotNodes(actors []*ateapi.Actor) map[string]bool {
	nodes := map[string]bool{}
	for _, actor := range actors {
		for _, snap := range actor.GetStatus().GetSnapshots() {
			if snap.GetLocality() != "" && snap.GetDurableSnapshot().GetState() != ateapi.SnapshotStorageState_SNAPSHOT_STORAGE_STATE_COMPLETED {
				nodes[snap.GetLocality()] = true
			}
		}
	}
	return nodes
}

// suspendedActorNodes counts the suspended actors Substrate resumes on each node: those whose snapshot stays local
// there (Status.AssignedNode, for about 30 minutes after the suspend). The resume falls back to any worker when the
// node has none with room, and then also moves the actor's block-storage home off that node.
func suspendedActorNodes(actors []*ateapi.Actor) map[string]int {
	nodes := map[string]int{}
	for _, actor := range actors {
		if node := actor.GetStatus().GetAssignedNode(); node != "" && actor.GetStatus().GetState() == ateapi.ActorState_ACTOR_STATE_SUSPENDED {
			nodes[node]++
		}
	}
	return nodes
}

// warmActorsByWorker counts the gateway's warm actors on each worker. One lives for a single boot, so counting it
// would scale the pool up for an instance that never comes, and that new worker would be warmed in turn.
func warmActorsByWorker(actors []*ateapi.Actor) map[string]int64 {
	out := map[string]int64{}
	for _, actor := range actors {
		if worker := actor.GetStatus().GetWorkerAssignment().GetWorker().GetName(); worker != "" && substrate.IsWarmActor(actor.GetMetadata().GetName()) {
			out[worker]++
		}
	}
	return out
}

// newDevboxPoolView classifies the pool's live pods. A drained, empty worker on a node in pinned is held rather
// than removed, since its node holds undurable snapshots. warm counts the warm actors on each worker by name.
func newDevboxPoolView(pods []corev1.Pod, workers []*ateapi.Worker, namespace, pool string, pinned map[string]bool, warm map[string]int64) devboxPoolView {
	byPod := map[string]*ateapi.Worker{}
	for _, w := range workers {
		if w.GetWorkerNamespace() == namespace && w.GetWorkerPool() == pool {
			byPod[w.GetWorkerPodUid()] = w
		}
	}

	var view devboxPoolView
	for _, pod := range pods {
		if pod.DeletionTimestamp != nil {
			continue
		}
		p := devboxWorkerPod{pod: pod, worker: byPod[string(pod.UID)]}
		p.warm = warm[p.worker.GetMetadata().GetName()]
		switch {
		case p.state() == ateapi.WorkerState_WORKER_STATE_DRAINING && p.actors() == 0 && !pinned[pod.Spec.NodeName]:
			view.drainedIdle = append(view.drainedIdle, p)
		case p.state() == ateapi.WorkerState_WORKER_STATE_DRAINING,
			p.state() == ateapi.WorkerState_WORKER_STATE_UNAVAILABLE && p.actors() > 0:
			view.held = append(view.held, p)
		default:
			view.schedulable = append(view.schedulable, p)
		}
	}
	return view
}

// additionalFreeInstances is how many more instances fit on the active workers of the runner's AdditionalPools.
func additionalFreeInstances(workers []*ateapi.Worker, pools map[string]bool, class v1alpha1.DevboxSandboxClass, capacity devboxCapacity) int64 {
	booking := actorMemoryBooking(class, capacity.Memory)
	var free int64
	for _, w := range workers {
		if !pools[w.GetWorkerNamespace()+"/"+w.GetWorkerPool()] || w.GetStatus().GetState() != ateapi.WorkerState_WORKER_STATE_ACTIVE {
			continue
		}
		total, used := w.GetStatus().GetCapacity(), w.GetStatus().GetAllocated()
		n := min((total.GetCpuMillicores()-used.GetCpuMillicores())/capacity.CPU, (total.GetMemoryBytes()-used.GetMemoryBytes())/booking)
		if total.GetActors() > 0 {
			n = min(n, int64(total.GetActors()-used.GetActors()))
		}
		free += max(n, 0)
	}
	return free
}

// desiredDevboxWorkers is the managed workers needed to host the instances running on it with spare free slots,
// after the spare capacity of AdditionalPools.
func desiredDevboxWorkers(as *v1alpha1.DevboxWorkerAutoscaling, perWorker, used, additionalFree int64) int64 {
	need := used + max(int64(lo.FromPtrOr(as.SpareInstances, 1))-additionalFree, 0)
	workers := (need + perWorker - 1) / perWorker
	return min(max(workers, int64(lo.FromPtrOr(as.MinReplicas, 1))), int64(as.MaxReplicas))
}

// scaleUpWorkers is the schedulable workers to run for desired, adding pods only while the pool's live pods,
// retained ones included, stay within maxReplicas. It never drops below the schedulable pods already running.
func scaleUpWorkers(desired, schedulable, retained int64, maxReplicas int32) int64 {
	return max(schedulable, min(desired, int64(maxReplicas)-retained))
}

// autoscaleWorkerPools sets the replicas of the runner's WorkerPools. Scaling up is immediate. Scaling down
// waits ScaleDownDelay after the last scaling event, and only ever removes workers that host no instance and whose
// node holds no snapshot that is yet to be uploaded (once the worker goes, the node autoscaler may remove it): it
// drains them in Substrate so nothing new lands on them, re-checks they are still empty, and gives their pods
// the lowest deletion cost before lowering replicas so the ReplicaSet removes exactly those pods. On an error each
// pool keeps its replicas.
func (r *DevboxRunnerReconciler) autoscaleWorkerPools(ctx context.Context, api substrate.API, runner *v1alpha1.DevboxRunner, pools *devboxPools, class v1alpha1.DevboxSandboxClass, capacity devboxCapacity) error {
	wp := lo.FromPtr(runner.Spec.WorkerPool)
	as := wp.Autoscaling
	status := lo.FromPtr(runner.Status.Capacity)
	for _, t := range pools.targets {
		if !t.found {
			t.current = int64(lo.FromPtrOr(as.MinReplicas, 1))
		}
		t.replicas = t.current
	}
	if capacity.PerWorker == 0 {
		return fmt.Errorf("autoscaling sizes workers by instance slots, so it needs spec.workerPool.resources.limits")
	}
	if !pools.zonal() && !pools.targets[0].observable() {
		pools.targets[0].replicas = desiredDevboxWorkers(as, capacity.PerWorker, 0, 0)
		return nil
	}

	workers, err := api.ListWorkers(ctx)
	if err != nil {
		return fmt.Errorf("listing Substrate workers: %w", err)
	}
	actors := pools.actors
	if !pools.listed {
		if atespace := lo.FromPtr(runner.Status.Atespace); atespace != "" {
			if actors, err = api.ListActors(ctx, atespace); err != nil {
				return fmt.Errorf("listing actors: %w", err)
			}
		}
	}
	pinned := undurableSnapshotNodes(actors)
	suspended := suspendedActorNodes(actors)
	warm := warmActorsByWorker(actors)
	for _, t := range pools.targets {
		if !t.observable() {
			continue
		}
		selector, _, _ := unstructured.NestedString(t.pool.Object, "status", "selector")
		parsed, err := labels.Parse(selector)
		if err != nil {
			return fmt.Errorf("parsing WorkerPool selector %q: %w", selector, err)
		}
		pods := &corev1.PodList{}
		if err := r.APIReader.List(ctx, pods, client.InNamespace(t.pool.GetNamespace()), client.MatchingLabelsSelector{Selector: parsed}); err != nil {
			return fmt.Errorf("listing worker pods: %w", err)
		}
		t.view = newDevboxPoolView(pods.Items, workers, t.pool.GetNamespace(), t.pool.GetName(), pinned, warm)
	}

	additional := lo.SliceToMap(runner.Status.AdditionalWorkerPools, func(p string) (string, bool) { return p, true })
	additionalFree := additionalFreeInstances(workers, additional, class, capacity)
	var desired, active []int64
	if pools.zonal() {
		loads := lo.Map(pools.targets, func(t *devboxPoolTarget, _ int) devboxZoneLoad {
			return devboxZoneLoad{
				zone: t.zone, homes: t.homes, used: t.view.used(), waiting: t.waiting,
				schedulable: int64(len(t.view.schedulable)), retained: int64(len(t.view.held) + len(t.view.drainedIdle)),
				placeable: t.placeable(),
			}
		})
		desired, active = planZonalWorkers(as, capacity.PerWorker, additionalFree, loads)
	} else {
		view := pools.targets[0].view
		d := desiredDevboxWorkers(as, capacity.PerWorker, view.used(), additionalFree)
		desired = []int64{d}
		active = []int64{scaleUpWorkers(d, int64(len(view.schedulable)), int64(len(view.held)+len(view.drainedIdle)), as.MaxReplicas)}
	}

	scaleDownDelay := lo.FromPtrOr(as.ScaleDownDelay, metav1.Duration{Duration: 10 * time.Minute}).Duration
	cooledDown := status.LastScaleTime == nil || time.Since(status.LastScaleTime.Time) >= scaleDownDelay
	scaled := false
	var totals devboxPoolView
	var zoneStatus []v1alpha1.DevboxZoneCapacity
	for i, t := range pools.targets {
		next, err := r.scalePool(ctx, api, t, desired[i], active[i], cooledDown, pinned, suspended)
		if err != nil {
			return err
		}
		scaled = scaled || next || t.replicas != t.current
		totals.schedulable = append(totals.schedulable, t.view.schedulable...)
		totals.held = append(totals.held, t.view.held...)
		totals.drainedIdle = append(totals.drainedIdle, t.view.drainedIdle...)
		if t.zone != "" {
			zoneStatus = append(zoneStatus, v1alpha1.DevboxZoneCapacity{
				Zone: t.zone, Workers: int32(len(t.view.schedulable)), DesiredWorkers: int32(desired[i]),
				Homes: int32(t.homes), RunningInstances: int32(t.view.used()), WaitingInstances: int32(t.waiting),
			})
		}
	}

	status.Workers = int32(len(totals.schedulable))
	status.DrainingWorkers = int32(len(totals.drainedIdle) + len(totals.held))
	status.RunningInstances = int32(totals.used())
	status.AdditionalFreeInstances = int32(additionalFree)
	status.DesiredWorkers = lo.ToPtr(int32(min(lo.Sum(desired), int64(as.MaxReplicas))))
	status.Zones = zoneStatus
	if scaled {
		status.LastScaleTime = lo.ToPtr(metav1.Now())
	}
	runner.Status.Capacity = &status
	return nil
}

// observable reports whether the pool exists and reports the selector its pods are listed by.
func (t *devboxPoolTarget) observable() bool {
	selector, _, _ := unstructured.NestedString(t.pool.Object, "status", "selector")
	return t.pool.GetUID() != "" && selector != ""
}

// scalePool sets one pool's replicas from its desired workers and the workers to run when scaling up, and reports
// whether it scaled.
func (r *DevboxRunnerReconciler) scalePool(ctx context.Context, api substrate.API, t *devboxPoolTarget, desired, scaleUp int64, cooledDown bool, pinned map[string]bool, suspended map[string]int) (bool, error) {
	view := &t.view
	scaled := false
	active := int64(len(view.schedulable))
	switch {
	case desired > active:
		scaled = scaleUp > active
		active = scaleUp
	case desired < active && cooledDown:
		drained, err := r.drainIdleWorkers(ctx, api, view, active-desired, pinned, suspended)
		if err != nil {
			return false, err
		}
		active -= drained
		scaled = drained > 0
	}

	// A ReplicaSet removes unready pods before looking at deletion cost, so drained workers wait while new ones
	// start. Otherwise they are removed first, and a scale up waits a pass: a ReplicaSet only removes pods when
	// replicas drop below its live pods.
	replicas := active + int64(len(view.held)) + int64(len(view.drainedIdle))
	if len(view.drainedIdle) > 0 && !lo.SomeBy(view.schedulable, func(p devboxWorkerPod) bool { return !p.ready() }) {
		if err := r.markForDeletion(ctx, view.drainedIdle); err != nil {
			return false, err
		}
		replicas = int64(len(view.schedulable) + len(view.held))
	}
	t.replicas = replicas
	return scaled, nil
}

// drainIdleWorkers drains up to n active or unavailable workers that host no instance and whose node holds no
// undurable snapshot, unavailable ones first, then those on nodes with the fewest suspended actors to resume there
// (see suspendedActorNodes), moving them to view.drainedIdle, or to view.held if an instance landed on one before the drain took
// effect. It returns how many left schedulable.
func (r *DevboxRunnerReconciler) drainIdleWorkers(ctx context.Context, api substrate.API, view *devboxPoolView, n int64, pinned map[string]bool, suspended map[string]int) (int64, error) {
	idle := lo.Filter(view.schedulable, func(p devboxWorkerPod, _ int) bool {
		state := p.state()
		return (state == ateapi.WorkerState_WORKER_STATE_ACTIVE || state == ateapi.WorkerState_WORKER_STATE_UNAVAILABLE) &&
			p.actors() == 0 && !pinned[p.pod.Spec.NodeName]
	})
	sort.Slice(idle, func(i, j int) bool {
		if a, b := idle[i].state() == ateapi.WorkerState_WORKER_STATE_UNAVAILABLE, idle[j].state() == ateapi.WorkerState_WORKER_STATE_UNAVAILABLE; a != b {
			return a
		}
		if a, b := suspended[idle[i].pod.Spec.NodeName], suspended[idle[j].pod.Spec.NodeName]; a != b {
			return a < b
		}
		return idle[i].pod.Name > idle[j].pod.Name
	})

	drained := map[types.UID]bool{}
	for _, p := range idle[:min(int(n), len(idle))] {
		worker, err := api.DrainWorker(ctx, p.worker.GetMetadata().GetName())
		if err != nil {
			return 0, fmt.Errorf("draining worker %s: %w", p.worker.GetMetadata().GetName(), err)
		}
		p.worker = worker
		if p.actors() == 0 {
			view.drainedIdle = append(view.drainedIdle, p)
		} else {
			view.held = append(view.held, p)
		}
		drained[p.pod.UID] = true
	}
	view.schedulable = lo.Reject(view.schedulable, func(p devboxWorkerPod, _ int) bool { return drained[p.pod.UID] })
	return int64(len(drained)), nil
}

func (r *DevboxRunnerReconciler) markForDeletion(ctx context.Context, pods []devboxWorkerPod) error {
	for _, p := range pods {
		if p.pod.Annotations[podDeletionCostAnnotation] == drainedPodDeletionCost {
			continue
		}
		patch := fmt.Sprintf(`{"metadata":{"annotations":{%q:%q}}}`, podDeletionCostAnnotation, drainedPodDeletionCost)
		pod := &corev1.Pod{ObjectMeta: metav1.ObjectMeta{Name: p.pod.Name, Namespace: p.pod.Namespace}}
		if err := r.Patch(ctx, pod, client.RawPatch(types.MergePatchType, []byte(patch))); client.IgnoreNotFound(err) != nil {
			return fmt.Errorf("marking worker pod %s for removal: %w", p.pod.Name, err)
		}
	}
	return nil
}
