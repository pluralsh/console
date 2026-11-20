package controller

import (
	"context"
	"testing"

	. "github.com/onsi/gomega"
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate/ateapi"
)

func capacityRunner(cpu, memory string, disk *string) *v1alpha1.DevboxRunner {
	runner := &v1alpha1.DevboxRunner{Spec: v1alpha1.DevboxRunnerSpec{WorkerPool: &v1alpha1.DevboxWorkerPool{}}}
	if cpu != "" || memory != "" {
		limits := corev1.ResourceList{}
		if cpu != "" {
			limits[corev1.ResourceCPU] = resource.MustParse(cpu)
		}
		if memory != "" {
			limits[corev1.ResourceMemory] = resource.MustParse(memory)
		}
		runner.Spec.WorkerPool.Resources = &corev1.ResourceRequirements{Limits: limits}
	}
	if disk != nil {
		runner.Spec.WorkerPool.DiskSize = lo.ToPtr(resource.MustParse(*disk))
	}
	return runner
}

func TestDevboxInstanceCapacity(t *testing.T) {
	t.Run("without worker limits instances keep spec.resources", func(t *testing.T) {
		g := NewWithT(t)
		c, err := devboxInstanceCapacity(capacityRunner("", "", nil), v1alpha1.DevboxSandboxGVisor)
		g.Expect(err).NotTo(HaveOccurred())
		g.Expect(c).To(Equal(devboxCapacity{CPU: 2000, Memory: 4 * gib}))
	})

	t.Run("CPU bound workers spread their memory across instances", func(t *testing.T) {
		g := NewWithT(t)
		c, err := devboxInstanceCapacity(capacityRunner("16", "64Gi", nil), v1alpha1.DevboxSandboxGVisor)
		g.Expect(err).NotTo(HaveOccurred())
		g.Expect(c.PerWorker).To(Equal(int64(8)))
		g.Expect(c.LimitedBy).To(Equal(devboxLimitedByCPU))
		g.Expect(c.CPU).To(Equal(int64(2000)))
		g.Expect(c.Memory).To(Equal((64*gib - devboxWorkerMemoryReserve) / 8 / mib * mib))
	})

	t.Run("disk bounds instances, which get the worker's CPU and memory to enforce it", func(t *testing.T) {
		g := NewWithT(t)
		c, err := devboxInstanceCapacity(capacityRunner("16", "64Gi", lo.ToPtr("200Gi")), v1alpha1.DevboxSandboxGVisor)
		g.Expect(err).NotTo(HaveOccurred())
		// 80% of 200Gi over 20Gi home plus 4Gi snapshots for the instance and one suspended instance.
		g.Expect(c.PerWorker).To(Equal(int64(5)))
		g.Expect(c.LimitedBy).To(Equal(devboxLimitedByDisk))
		g.Expect(c.CPU).To(Equal(int64(16000 / 5)))
		g.Expect(c.CPU * c.PerWorker).To(BeNumerically("<=", 16000))
		g.Expect(c.Memory * c.PerWorker).To(BeNumerically("<=", 64*gib-devboxWorkerMemoryReserve))
		g.Expect(c.Disk).To(Equal(160 * gib / 5))
		// A sixth instance no longer fits the worker's CPU.
		g.Expect(c.CPU * (c.PerWorker + 1)).To(BeNumerically(">", 16000))
	})

	t.Run("suspended snapshots per instance scale the disk need", func(t *testing.T) {
		g := NewWithT(t)
		runner := capacityRunner("64", "256Gi", lo.ToPtr("200Gi"))
		runner.Spec.WorkerPool.SuspendedSnapshotsPerInstance = lo.ToPtr(int32(0))
		c, err := devboxInstanceCapacity(runner, v1alpha1.DevboxSandboxGVisor)
		g.Expect(err).NotTo(HaveOccurred())
		g.Expect(c.PerWorker).To(Equal(int64(6)), "160Gi over 24Gi")
		runner.Spec.WorkerPool.SuspendedSnapshotsPerInstance = lo.ToPtr(int32(3))
		c, err = devboxInstanceCapacity(runner, v1alpha1.DevboxSandboxGVisor)
		g.Expect(err).NotTo(HaveOccurred())
		g.Expect(c.PerWorker).To(Equal(int64(4)), "160Gi over 36Gi")
	})

	t.Run("microVM memory bookings include VMM overhead", func(t *testing.T) {
		g := NewWithT(t)
		c, err := devboxInstanceCapacity(capacityRunner("64", "32Gi", nil), v1alpha1.DevboxSandboxMicroVM)
		g.Expect(err).NotTo(HaveOccurred())
		g.Expect(c.LimitedBy).To(Equal(devboxLimitedByMemory))
		g.Expect(c.PerWorker).To(Equal(int64(7)))
		budget := (32*gib - devboxWorkerMemoryReserve) / 7
		g.Expect(actorMemoryBooking(v1alpha1.DevboxSandboxMicroVM, c.Memory)).To(BeNumerically("<=", budget))
		g.Expect(actorMemoryBooking(v1alpha1.DevboxSandboxMicroVM, c.Memory+mib)).To(BeNumerically(">", budget))
	})

	t.Run("a worker too small for one instance is an error", func(t *testing.T) {
		g := NewWithT(t)
		_, err := devboxInstanceCapacity(capacityRunner("16", "64Gi", lo.ToPtr("20Gi")), v1alpha1.DevboxSandboxGVisor)
		g.Expect(err).To(MatchError(ContainSubstring("one worker's disk fits no instance")))
	})

	t.Run("diskSize needs worker limits to be enforced", func(t *testing.T) {
		g := NewWithT(t)
		_, err := devboxInstanceCapacity(capacityRunner("", "", lo.ToPtr("200Gi")), v1alpha1.DevboxSandboxGVisor)
		g.Expect(err).To(MatchError(ContainSubstring("needs spec.workerPool.resources.limits")))
	})
}

func TestDevboxWorkerSelectorKey(t *testing.T) {
	g := NewWithT(t)
	short := &v1alpha1.DevboxRunner{ObjectMeta: metav1.ObjectMeta{Name: "platform"}}
	g.Expect(devboxWorkerSelectorKey(short)).To(Equal("devboxes.plural.sh/runner.platform"))

	long := &v1alpha1.DevboxRunner{ObjectMeta: metav1.ObjectMeta{Name: "a-very-long-runner-name-that-goes-on-and-on-past-the-label-limit"}}
	other := &v1alpha1.DevboxRunner{ObjectMeta: metav1.ObjectMeta{Name: long.Name + "-2"}}
	key := devboxWorkerSelectorKey(long)
	g.Expect(len(key) - len("devboxes.plural.sh/")).To(BeNumerically("<=", dns1123Limit))
	g.Expect(key).NotTo(Equal(devboxWorkerSelectorKey(other)))
}

func testWorker(pool, podUID string, state ateapi.WorkerState, actors int32) *ateapi.Worker {
	return &ateapi.Worker{
		Metadata:        &ateapi.ResourceMetadata{Name: "w-" + podUID},
		WorkerNamespace: "ns",
		WorkerPool:      pool,
		WorkerPodUid:    podUID,
		Status: &ateapi.WorkerStatus{
			State:     state,
			Capacity:  &ateapi.WorkerResources{CpuMillicores: 8000, MemoryBytes: 32 * gib, Actors: 1000},
			Allocated: &ateapi.WorkerResources{CpuMillicores: int64(actors) * 2000, MemoryBytes: int64(actors) * 4 * gib, Actors: actors},
		},
	}
}

func TestDevboxPoolView(t *testing.T) {
	g := NewWithT(t)
	pod := func(uid string, deleting bool) corev1.Pod {
		p := corev1.Pod{ObjectMeta: metav1.ObjectMeta{Name: uid, UID: types.UID(uid)}, Spec: corev1.PodSpec{NodeName: "node-" + uid}}
		if deleting {
			p.DeletionTimestamp = lo.ToPtr(metav1.Now())
		}
		return p
	}
	pods := []corev1.Pod{pod("busy", false), pod("idle", false), pod("drained", false), pod("pinned", false), pod("draining", false), pod("starting", false), pod("gone", true)}
	workers := []*ateapi.Worker{
		testWorker("pool", "busy", ateapi.WorkerState_WORKER_STATE_ACTIVE, 2),
		testWorker("pool", "idle", ateapi.WorkerState_WORKER_STATE_ACTIVE, 0),
		testWorker("pool", "drained", ateapi.WorkerState_WORKER_STATE_DRAINING, 0),
		testWorker("pool", "pinned", ateapi.WorkerState_WORKER_STATE_DRAINING, 0),
		testWorker("pool", "draining", ateapi.WorkerState_WORKER_STATE_DRAINING, 1),
		testWorker("pool", "gone", ateapi.WorkerState_WORKER_STATE_DRAINING, 0),
		testWorker("other", "starting", ateapi.WorkerState_WORKER_STATE_ACTIVE, 3),
	}

	view := newDevboxPoolView(pods, workers, "ns", "pool", map[string]bool{"node-pinned": true})
	names := func(ps []devboxWorkerPod) []string {
		return lo.Map(ps, func(p devboxWorkerPod, _ int) string { return p.pod.Name })
	}
	g.Expect(names(view.schedulable)).To(ConsistOf("busy", "idle", "starting"))
	g.Expect(names(view.drainedIdle)).To(ConsistOf("drained"))
	g.Expect(names(view.held)).To(ConsistOf("draining", "pinned"), "a drained worker whose node holds undurable snapshots is kept")
	g.Expect(view.used()).To(Equal(int64(2)), "a worker of another pool sharing a pod UID is not counted")
}

func TestUndurableSnapshotNodes(t *testing.T) {
	g := NewWithT(t)
	snapshot := func(locality string, state ateapi.SnapshotStorageState) *ateapi.Snapshot {
		return &ateapi.Snapshot{Locality: locality, DurableSnapshot: &ateapi.SnapshotStorage{State: state}}
	}
	actors := []*ateapi.Actor{
		{Status: &ateapi.ActorStatus{Snapshots: []*ateapi.Snapshot{snapshot("uploading", ateapi.SnapshotStorageState_SNAPSHOT_STORAGE_STATE_PENDING)}}},
		{Status: &ateapi.ActorStatus{Snapshots: []*ateapi.Snapshot{{Locality: "never-uploaded"}}}},
		{Status: &ateapi.ActorStatus{Snapshots: []*ateapi.Snapshot{snapshot("uploaded", ateapi.SnapshotStorageState_SNAPSHOT_STORAGE_STATE_COMPLETED)}}},
		{Status: &ateapi.ActorStatus{Snapshots: []*ateapi.Snapshot{snapshot("", ateapi.SnapshotStorageState_SNAPSHOT_STORAGE_STATE_COMPLETED)}}},
	}
	g.Expect(undurableSnapshotNodes(actors)).To(Equal(map[string]bool{"uploading": true, "never-uploaded": true}))
}

func TestDrainIdleWorkersSkipsPinnedNodes(t *testing.T) {
	g := NewWithT(t)
	fake := newFakeSubstrate()
	r := &DevboxRunnerReconciler{Substrate: fake}
	var view devboxPoolView
	for _, name := range []string{"a", "b"} {
		w := testWorker("pool", name, ateapi.WorkerState_WORKER_STATE_ACTIVE, 0)
		fake.workers[w.GetMetadata().GetName()] = w
		view.schedulable = append(view.schedulable, devboxWorkerPod{
			pod:    corev1.Pod{ObjectMeta: metav1.ObjectMeta{Name: name, UID: types.UID(name)}, Spec: corev1.PodSpec{NodeName: "node-" + name}},
			worker: w,
		})
	}

	drained, err := r.drainIdleWorkers(context.Background(), &view, 2, map[string]bool{"node-b": true})
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(drained).To(Equal(int64(1)))
	g.Expect(fake.workers["w-a"].Status.State).To(Equal(ateapi.WorkerState_WORKER_STATE_DRAINING))
	g.Expect(fake.workers["w-b"].Status.State).To(Equal(ateapi.WorkerState_WORKER_STATE_ACTIVE))
}

func TestDesiredDevboxWorkers(t *testing.T) {
	g := NewWithT(t)
	as := &v1alpha1.DevboxWorkerAutoscaling{MinReplicas: lo.ToPtr(int32(1)), MaxReplicas: 4, SpareInstances: lo.ToPtr(int32(2))}
	g.Expect(desiredDevboxWorkers(as, 3, 0, 0)).To(Equal(int64(1)))
	g.Expect(desiredDevboxWorkers(as, 3, 4, 0)).To(Equal(int64(2)))
	g.Expect(desiredDevboxWorkers(as, 3, 5, 0)).To(Equal(int64(3)))
	g.Expect(desiredDevboxWorkers(as, 3, 5, 2)).To(Equal(int64(2)), "free slots on additional pools count as spare")
	g.Expect(desiredDevboxWorkers(as, 3, 30, 0)).To(Equal(int64(4)), "capped at maxReplicas")
	g.Expect(desiredDevboxWorkers(&v1alpha1.DevboxWorkerAutoscaling{MinReplicas: lo.ToPtr(int32(0)), MaxReplicas: 4, SpareInstances: lo.ToPtr(int32(0))}, 3, 0, 0)).
		To(Equal(int64(0)), "scales to zero with no spare")
}

func TestAdditionalFreeInstances(t *testing.T) {
	g := NewWithT(t)
	workers := []*ateapi.Worker{
		testWorker("shared", "a", ateapi.WorkerState_WORKER_STATE_ACTIVE, 1),
		testWorker("shared", "b", ateapi.WorkerState_WORKER_STATE_DRAINING, 0),
		testWorker("unrelated", "c", ateapi.WorkerState_WORKER_STATE_ACTIVE, 0),
	}
	capacity := devboxCapacity{CPU: 2000, Memory: 4 * gib}
	// 6 cores and 28Gi left on a: CPU allows 3 more instances.
	g.Expect(additionalFreeInstances(workers, map[string]bool{"ns/shared": true}, v1alpha1.DevboxSandboxGVisor, capacity)).To(Equal(int64(3)))
}
