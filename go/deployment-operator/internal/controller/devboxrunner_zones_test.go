package controller

import (
	"context"
	"testing"

	. "github.com/onsi/gomega"
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate/ateapi"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/zones"
)

func TestPlanZonalWorkers(t *testing.T) {
	g := NewWithT(t)
	as := &v1alpha1.DevboxWorkerAutoscaling{MinReplicas: lo.ToPtr(int32(1)), MaxReplicas: 6, SpareInstances: lo.ToPtr(int32(1))}
	load := func(zone string, homes, used, waiting, schedulable int64) devboxZoneLoad {
		return devboxZoneLoad{zone: zone, homes: homes, used: used, waiting: waiting, schedulable: schedulable, placeable: true}
	}

	desired, active := planZonalWorkers(as, 3, 0, []devboxZoneLoad{load("a", 0, 0, 0, 0), load("b", 0, 0, 0, 0), load("c", 0, 0, 0, 0)})
	g.Expect(desired).To(Equal([]int64{1, 0, 0}), "min 1 and the spare land in one zone")
	g.Expect(active).To(Equal([]int64{1, 0, 0}))

	desired, _ = planZonalWorkers(as, 3, 0, []devboxZoneLoad{load("a", 1, 0, 0, 0), load("b", 4, 3, 0, 1), load("c", 0, 0, 0, 0)})
	g.Expect(desired).To(Equal([]int64{0, 2, 0}), "the spare goes to the zone with most homes, which also takes the minimum")

	desired, _ = planZonalWorkers(&v1alpha1.DevboxWorkerAutoscaling{MinReplicas: lo.ToPtr(int32(3)), MaxReplicas: 6}, 3, 0,
		[]devboxZoneLoad{load("a", 1, 0, 0, 0), load("b", 4, 0, 0, 0), load("c", 0, 0, 0, 0)})
	g.Expect(desired).To(Equal([]int64{1, 2, 0}), "the minimum is dealt over zones holding homes only")

	desired, _ = planZonalWorkers(as, 3, 0, []devboxZoneLoad{load("a", 0, 0, 0, 0), load("b", 3, 0, 0, 0), load("c", 1, 0, 2, 0)})
	g.Expect(desired).To(Equal([]int64{0, 1, 1}), "waiting instances need a worker in their zone")

	desired, _ = planZonalWorkers(as, 3, 2, []devboxZoneLoad{load("a", 2, 3, 0, 1)})
	g.Expect(desired).To(Equal([]int64{1}), "free slots on additional pools cover the spare")

	desired, active = planZonalWorkers(&v1alpha1.DevboxWorkerAutoscaling{MinReplicas: lo.ToPtr(int32(0)), MaxReplicas: 3}, 1, 0,
		[]devboxZoneLoad{load("a", 1, 1, 1, 1), load("b", 5, 3, 0, 1)})
	g.Expect(desired).To(Equal([]int64{2, 4}))
	g.Expect(active).To(Equal([]int64{1, 2}), "maxReplicas caps all pools, filling the placement zone first and never dropping running workers")

	retired := devboxZoneLoad{zone: "old", homes: 9, used: 0}
	desired, _ = planZonalWorkers(as, 3, 0, []devboxZoneLoad{load("a", 1, 0, 0, 0), retired})
	g.Expect(desired).To(Equal([]int64{1, 1}), "a retired zone shares the minimum but never takes the spare")
}

func TestSetFixedReplicas(t *testing.T) {
	g := NewWithT(t)
	targets := []*devboxPoolTarget{{zone: "a"}, {zone: "b", homes: 2}, {zone: "c", homes: 1}, {zone: "old", homes: 0, retired: true}}
	setFixedReplicas(targets, 3)
	g.Expect(lo.Map(targets, func(t *devboxPoolTarget, _ int) int64 { return t.replicas })).To(Equal([]int64{0, 2, 1, 0}))

	single := []*devboxPoolTarget{{}}
	setFixedReplicas(single, 4)
	g.Expect(single[0].replicas).To(Equal(int64(4)))
}

func TestDevboxHomesAndWaitingByZone(t *testing.T) {
	g := NewWithT(t)
	actor := func(name, zone string, state ateapi.ActorState) *ateapi.Actor {
		a := &ateapi.Actor{Metadata: &ateapi.ResourceMetadata{Name: name}, Status: &ateapi.ActorStatus{State: state}}
		if zone != "" {
			a.WorkerSelector = zones.Selector(zone)
		}
		return a
	}
	actors := []*ateapi.Actor{
		actor("box-1", "a", ateapi.ActorState_ACTOR_STATE_SUSPENDED),
		actor("box-2", "a", ateapi.ActorState_ACTOR_STATE_RUNNING),
		actor("box-3", "b", ateapi.ActorState_ACTOR_STATE_SUSPENDED),
		actor("golden", "", ateapi.ActorState_ACTOR_STATE_RUNNING),
	}
	g.Expect(devboxHomesByZone(actors)).To(Equal(map[string]int64{"a": 2, "b": 1}))
	waiting := map[string]zones.Waiting{
		"box-1": {Zone: "a"}, "box-2": {Zone: "a"}, "box-3": {Zone: "b"}, "deleted": {Zone: "b"},
	}
	g.Expect(devboxWaitingByZone(actors, waiting)).To(Equal(map[string]int64{"a": 1, "b": 1}), "running and deleted instances don't wait")
}

func TestDevboxWorkerZones(t *testing.T) {
	g := NewWithT(t)
	scheme := runtime.NewScheme()
	g.Expect(clientgoscheme.AddToScheme(scheme)).To(Succeed())
	node := func(name, zone string, labels map[string]string) *corev1.Node {
		n := &corev1.Node{ObjectMeta: metav1.ObjectMeta{Name: name, Labels: lo.Assign(labels)}}
		if zone != "" {
			n.Labels[zones.NodeLabel] = zone
		}
		return n
	}
	devbox := map[string]string{"plural.sh/devbox-pool": "devbox"}
	runner := func(storage v1alpha1.DevboxHomeStorage, spec ...string) *v1alpha1.DevboxRunner {
		return &v1alpha1.DevboxRunner{Spec: v1alpha1.DevboxRunnerSpec{
			Home:       &v1alpha1.DevboxHome{Storage: lo.ToPtr(storage)},
			WorkerPool: &v1alpha1.DevboxWorkerPool{NodeSelector: devbox, Zones: spec},
		}}
	}
	zonesOf := func(r *v1alpha1.DevboxRunner, nodes ...client.Object) []string {
		c := fake.NewClientBuilder().WithScheme(scheme).WithObjects(nodes...).Build()
		found, _, err := (&DevboxRunnerReconciler{Client: c, APIReader: c}).devboxWorkerZones(context.Background(), r)
		g.Expect(err).NotTo(HaveOccurred())
		return found
	}
	system := []client.Object{node("sys-1", "us-east-2a", nil), node("sys-2", "us-east-2b", nil), node("sys-3", "us-east-2c", nil)}

	g.Expect(zonesOf(runner(v1alpha1.DevboxHomeBlock), append(system,
		node("box-1", "us-east-2b", devbox), node("box-2", "us-east-2a", devbox), node("box-3", "us-east-2b", devbox))...)).
		To(Equal([]string{"us-east-2a", "us-east-2b"}), "the zones of the runner's nodes")
	g.Expect(zonesOf(runner(v1alpha1.DevboxHomeBlock), system...)).
		To(Equal([]string{"us-east-2a", "us-east-2b", "us-east-2c"}), "every node's zones before the pool has a node")
	g.Expect(zonesOf(runner(v1alpha1.DevboxHomeBlock), node("kind", "", devbox))).To(BeEmpty(), "no zones runs a single pool")
	g.Expect(zonesOf(runner(v1alpha1.DevboxHomeBlock, "us-east-2c"), system...)).To(Equal([]string{"us-east-2c"}), "spec zones win")
	g.Expect(zonesOf(runner(v1alpha1.DevboxHomeZeroFS), system...)).To(BeEmpty(), "only zonal homes find zones")

	// Zone b's nodes scaled away, but a box's home is still there: b stays, so the box resumes there instead of
	// having its home moved. Zone c held no home and goes.
	c := fake.NewClientBuilder().WithScheme(scheme).WithObjects(node("box-1", "us-east-2a", devbox)).Build()
	api := newFakeSubstrate()
	api.actors["space"] = map[string]*ateapi.Actor{"box": {
		Metadata:       &ateapi.ResourceMetadata{Name: "box"},
		WorkerSelector: zones.Selector("us-east-2b"),
		Status:         &ateapi.ActorStatus{State: ateapi.ActorState_ACTOR_STATE_SUSPENDED},
	}}
	r := runner(v1alpha1.DevboxHomeBlock)
	r.Status.Atespace = lo.ToPtr("space")
	r.Status.Zones = []string{"us-east-2a", "us-east-2b", "us-east-2c"}
	rec := &DevboxRunnerReconciler{Client: c, APIReader: c, Config: DevboxConfig{OperatorNamespace: "ops", WorkerPoolNamespace: "ate"}}
	pools, err := rec.devboxPoolTargets(context.Background(), api, r)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(pools.zones).To(Equal([]string{"us-east-2a", "us-east-2b"}))
}

func TestZoneChangedRunners(t *testing.T) {
	g := NewWithT(t)
	scheme := runtime.NewScheme()
	g.Expect(clientgoscheme.AddToScheme(scheme)).To(Succeed())
	g.Expect(v1alpha1.AddToScheme(scheme)).To(Succeed())
	devbox := map[string]string{"plural.sh/devbox-pool": "devbox"}
	node := func(name, zone string) *corev1.Node {
		return &corev1.Node{ObjectMeta: metav1.ObjectMeta{Name: name, Labels: lo.Assign(devbox, map[string]string{zones.NodeLabel: zone})}}
	}
	runner := func(name string, storage v1alpha1.DevboxHomeStorage, status []string, spec ...string) *v1alpha1.DevboxRunner {
		return &v1alpha1.DevboxRunner{
			ObjectMeta: metav1.ObjectMeta{Name: name},
			Spec: v1alpha1.DevboxRunnerSpec{
				Home:       &v1alpha1.DevboxHome{Storage: lo.ToPtr(storage)},
				WorkerPool: &v1alpha1.DevboxWorkerPool{NodeSelector: devbox, Zones: spec},
			},
			Status: v1alpha1.DevboxRunnerStatus{Zones: status},
		}
	}
	c := fake.NewClientBuilder().WithScheme(scheme).WithObjects(
		node("box-1", "us-east-2a"), node("box-2", "us-east-2b"),
		runner("gained", v1alpha1.DevboxHomeBlock, []string{"us-east-2a"}),
		runner("current", v1alpha1.DevboxHomeBlock, []string{"us-east-2a", "us-east-2b"}),
		runner("listed", v1alpha1.DevboxHomeBlock, []string{"us-east-2c"}, "us-east-2c"),
		runner("zerofs", v1alpha1.DevboxHomeZeroFS, nil),
	).WithStatusSubresource(&v1alpha1.DevboxRunner{}).Build()
	reqs := (&DevboxRunnerReconciler{Client: c}).zoneChangedRunners(context.Background(), node("box-2", "us-east-2b"))
	g.Expect(lo.Map(reqs, func(r reconcile.Request, _ int) string { return r.Name })).To(Equal([]string{"gained"}),
		"only a runner whose found zones moved is reconciled")
}

func TestDevboxZonalPoolName(t *testing.T) {
	g := NewWithT(t)
	g.Expect(devboxZonalPoolName(&v1alpha1.DevboxRunner{ObjectMeta: metav1.ObjectMeta{Name: "platform"}}, "us-east-2a")).To(Equal("devbox-platform-us-east-2a"))
	long := devboxZonalPoolName(&v1alpha1.DevboxRunner{ObjectMeta: metav1.ObjectMeta{Name: "a-very-long-runner-name-that-goes-on-and-on-past-the-limit"}}, "us-east-2a")
	g.Expect(len(long)).To(BeNumerically("<=", dns1123Limit))
	g.Expect(long).To(HaveSuffix("-us-east-2a"))
}
