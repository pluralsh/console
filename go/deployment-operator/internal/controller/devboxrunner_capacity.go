package controller

import (
	"fmt"

	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/api/resource"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
)

const (
	mib = int64(1) << 20
	gib = int64(1) << 30

	// devboxWorkerMemoryReserve is kept out of instance sizing on every worker: Substrate reserves 64MiB of the
	// worker's limit for itself, the rest is headroom for snapshot writes.
	devboxWorkerMemoryReserve = 128 * mib
	// A microVM actor books its memory limit plus 4MiB and 8MiB per GiB of the limit for the VMM.
	microVMFixedOverhead  = 4 * mib
	microVMOverheadPerGiB = 8 * mib

	devboxDefaultDiskReservePercent = 20
	devboxDefaultSuspendedSnapshots = 1

	devboxLimitedByCPU    = "cpu"
	devboxLimitedByMemory = "memory"
	devboxLimitedByDisk   = "disk"
)

// devboxCapacity is how the runner's instances are sized against one worker of its managed WorkerPool.
type devboxCapacity struct {
	// PerWorker is the instances one worker hosts, zero when the pool has no limits to size against.
	PerWorker int64
	LimitedBy string
	// CPU (millicores) and Memory (bytes) are each instance's limits.
	CPU    int64
	Memory int64
	// Disk is each instance's share of the worker's budgeted disk, zero without DiskSize.
	Disk int64
}

func (c devboxCapacity) status() *v1alpha1.DevboxCapacityStatus {
	out := &v1alpha1.DevboxCapacityStatus{
		InstancesPerWorker: int32(c.PerWorker),
		InstanceCPU:        resource.NewMilliQuantity(c.CPU, resource.DecimalSI),
		InstanceMemory:     resource.NewQuantity(c.Memory, resource.BinarySI),
	}
	if c.LimitedBy != "" {
		out.LimitedBy = lo.ToPtr(c.LimitedBy)
	}
	if c.Disk > 0 {
		out.InstanceDisk = resource.NewQuantity(c.Disk, resource.BinarySI)
	}
	return out
}

func actorMemoryBooking(class v1alpha1.DevboxSandboxClass, memory int64) int64 {
	if class != v1alpha1.DevboxSandboxMicroVM {
		return memory
	}
	return memory + microVMFixedOverhead + memory*microVMOverheadPerGiB/gib
}

// largestActorMemory is the largest memory limit whose booking fits in budget.
func largestActorMemory(class v1alpha1.DevboxSandboxClass, budget int64) int64 {
	if class == v1alpha1.DevboxSandboxMicroVM {
		budget = (budget - microVMFixedOverhead) * gib / (gib + microVMOverheadPerGiB)
	}
	return budget / mib * mib
}

// devboxInstanceCapacity sizes instances against the managed WorkerPool. spec.resources are each instance's
// minimum, and a slot's disk need is the durable home dir (unless it's on JuiceFS) plus memory-sized snapshots: the instance's own and
// those of SuspendedSnapshotsPerInstance suspended instances still on the node. The instances per worker is
// the most that fit the worker's CPU and memory limits and its budgeted disk, and each instance is then given
// an even share of the worker's CPU and memory, so Substrate, which places by limits, never puts more instances
// on a worker than its disk was budgeted for.
func devboxInstanceCapacity(runner *v1alpha1.DevboxRunner, class v1alpha1.DevboxSandboxClass) (devboxCapacity, error) {
	res := lo.FromPtr(runner.Spec.Resources)
	cpuQ, memoryQ, diskQ := lo.FromPtrOr(res.CPU, resource.MustParse("2")), lo.FromPtrOr(res.Memory, resource.MustParse("4Gi")), lo.FromPtrOr(res.Disk, resource.MustParse("20Gi"))
	minCPU, minMemory, disk := cpuQ.MilliValue(), memoryQ.Value(), diskQ.Value()
	switch runner.Spec.HomeStorage() {
	case v1alpha1.DevboxHomeJuiceFS:
		// The home lives in object storage. Its node cache is bounded by JuiceFS, which stops caching before the
		// disk fills, so it takes no budget.
		disk = 0
	case v1alpha1.DevboxHomeZeroFS:
		// A ZeroFS home's writer caches on the node's disk a share of the home's size (the node plugin's
		// --cache-disk-percent), so budgeting the whole home covers it.
		home := runner.Spec.HomeSize()
		disk = home.Value()
	}
	out := devboxCapacity{CPU: minCPU, Memory: minMemory}

	wp := lo.FromPtr(runner.Spec.WorkerPool)
	var limits map[string]resource.Quantity
	if wp.Resources != nil {
		limits = map[string]resource.Quantity{}
		for name, q := range wp.Resources.Limits {
			limits[string(name)] = q
		}
	}

	type bound struct {
		name string
		n    int64
	}
	var bounds []bound
	workerCPU, hasCPU := limits["cpu"]
	if hasCPU {
		bounds = append(bounds, bound{devboxLimitedByCPU, workerCPU.MilliValue() / minCPU})
	}
	workerMemory, hasMemory := limits["memory"]
	memoryBudget := workerMemory.Value() - devboxWorkerMemoryReserve
	if hasMemory {
		bounds = append(bounds, bound{devboxLimitedByMemory, max(memoryBudget, 0) / actorMemoryBooking(class, minMemory)})
	}
	var diskBudget int64
	if wp.DiskSize != nil {
		reserve := int64(lo.FromPtrOr(wp.DiskReservePercent, devboxDefaultDiskReservePercent))
		diskBudget = wp.DiskSize.Value() * (100 - reserve) / 100
		snapshots := 1 + int64(lo.FromPtrOr(wp.SuspendedSnapshotsPerInstance, devboxDefaultSuspendedSnapshots))
		bounds = append(bounds, bound{devboxLimitedByDisk, diskBudget / (disk + snapshots*minMemory)})
	}
	if !hasCPU && !hasMemory {
		// Without limits the worker's capacity is its node's, which the operator can't see.
		if wp.DiskSize != nil {
			return out, fmt.Errorf("spec.workerPool.diskSize is enforced through instance CPU and memory, so it needs spec.workerPool.resources.limits")
		}
		return out, nil
	}

	limiting := lo.MinBy(bounds, func(a, b bound) bool { return a.n < b.n })
	if limiting.n < 1 {
		return out, fmt.Errorf("one worker's %s fits no instance of %s CPU, %s memory and %s disk, raise spec.workerPool.resources.limits or diskSize, or lower spec.resources",
			limiting.name, resource.NewMilliQuantity(minCPU, resource.DecimalSI), resource.NewQuantity(minMemory, resource.BinarySI), resource.NewQuantity(disk, resource.BinarySI))
	}
	out.PerWorker = limiting.n
	out.LimitedBy = limiting.name
	if hasCPU {
		out.CPU = workerCPU.MilliValue() / out.PerWorker
	}
	if hasMemory {
		out.Memory = max(largestActorMemory(class, memoryBudget/out.PerWorker), minMemory)
	}
	if diskBudget > 0 {
		out.Disk = diskBudget / out.PerWorker
	}
	return out, nil
}
