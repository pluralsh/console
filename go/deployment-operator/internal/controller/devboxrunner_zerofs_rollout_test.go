package controller

import (
	"context"
	"testing"
	"time"

	. "github.com/onsi/gomega"
	"github.com/samber/lo"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate/ateapi"
)

const (
	rolloutSubstrateNS = "ate-system"
	rolloutWorkerNS    = "workers"
)

type zerofsRollout struct {
	t         *testing.T
	client    client.Client
	substrate *fakeSubstrate
	r         *DevboxRunnerReconciler
}

func newZeroFSRollout(t *testing.T) *zerofsRollout {
	t.Helper()
	scheme := runtime.NewScheme()
	if err := clientgoscheme.AddToScheme(scheme); err != nil {
		t.Fatal(err)
	}
	if err := v1alpha1.AddToScheme(scheme); err != nil {
		t.Fatal(err)
	}
	ds := &appsv1.DaemonSet{
		ObjectMeta: metav1.ObjectMeta{Name: zerofsNodeDaemonSet, Namespace: rolloutSubstrateNS, UID: "ds-uid"},
		Spec:       appsv1.DaemonSetSpec{Selector: &metav1.LabelSelector{MatchLabels: map[string]string{"app": zerofsNodeDaemonSet}}},
	}
	revision := func(hash string, n int64) *appsv1.ControllerRevision {
		return &appsv1.ControllerRevision{
			ObjectMeta: metav1.ObjectMeta{
				Name: zerofsNodeDaemonSet + "-" + hash, Namespace: rolloutSubstrateNS,
				Labels:          map[string]string{appsv1.DefaultDaemonSetUniqueLabelKey: hash},
				OwnerReferences: []metav1.OwnerReference{{APIVersion: "apps/v1", Kind: "DaemonSet", Name: ds.Name, UID: ds.UID, Controller: lo.ToPtr(true)}},
			},
			Revision: n,
		}
	}
	zerofs := lo.ToPtr(v1alpha1.DevboxHomeZeroFS)
	c := fake.NewClientBuilder().WithScheme(scheme).WithObjects(
		ds, revision("old", 1), revision("new", 2),
		&v1alpha1.DevboxRunner{ObjectMeta: metav1.ObjectMeta{Name: "zfs"}, Spec: v1alpha1.DevboxRunnerSpec{Home: &v1alpha1.DevboxHome{Storage: zerofs}}},
		&v1alpha1.DevboxRunner{ObjectMeta: metav1.ObjectMeta{Name: "snap"}},
	).Build()
	f := newFakeSubstrate()
	return &zerofsRollout{
		t: t, client: c, substrate: f,
		r: &DevboxRunnerReconciler{Client: c, APIReader: c, Config: DevboxConfig{SubstrateNamespace: rolloutSubstrateNS, DrainTimeout: time.Hour}},
	}
}

func (z *zerofsRollout) pluginPod(name, node, hash string) {
	z.t.Helper()
	pod := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: rolloutSubstrateNS, Labels: map[string]string{
			"app": zerofsNodeDaemonSet, appsv1.DefaultDaemonSetUniqueLabelKey: hash,
		}},
		Spec:   corev1.PodSpec{NodeName: node},
		Status: corev1.PodStatus{Conditions: []corev1.PodCondition{{Type: corev1.PodReady, Status: corev1.ConditionTrue}}},
	}
	if err := z.client.Create(context.Background(), pod); err != nil {
		z.t.Fatal(err)
	}
}

// worker adds a Substrate worker of runner on node, and its pod.
func (z *zerofsRollout) worker(name, node, runner string, actors int32) {
	z.t.Helper()
	if err := z.client.Create(context.Background(), &corev1.Pod{ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: rolloutWorkerNS}}); err != nil {
		z.t.Fatal(err)
	}
	z.substrate.workers[name] = &ateapi.Worker{
		Metadata:        &ateapi.ResourceMetadata{Name: name},
		NodeName:        node,
		WorkerNamespace: rolloutWorkerNS,
		WorkerPod:       name,
		Labels:          devboxWorkerSelector(&v1alpha1.DevboxRunner{ObjectMeta: metav1.ObjectMeta{Name: runner}}),
		Status: &ateapi.WorkerStatus{
			State:     ateapi.WorkerState_WORKER_STATE_ACTIVE,
			Capacity:  &ateapi.WorkerResources{Actors: 10},
			Allocated: &ateapi.WorkerResources{Actors: actors},
		},
	}
}

func (z *zerofsRollout) roll() {
	z.t.Helper()
	if err := z.r.rollZeroFSNodes(context.Background(), z.substrate); err != nil {
		z.t.Fatal(err)
	}
}

func (z *zerofsRollout) pod(ns, name string) *corev1.Pod {
	pod := &corev1.Pod{}
	if err := z.client.Get(context.Background(), client.ObjectKey{Namespace: ns, Name: name}, pod); err != nil {
		if apierrors.IsNotFound(err) {
			return nil
		}
		z.t.Fatal(err)
	}
	return pod
}

func (z *zerofsRollout) state(worker string) ateapi.WorkerState {
	return z.substrate.workers[worker].GetStatus().GetState()
}

func TestZeroFSRolloutDrainsOneNodeAtATimeIdleFirst(t *testing.T) {
	g := NewWithT(t)
	z := newZeroFSRollout(t)
	z.pluginPod("zerofs-a", "node-a", "old")
	z.pluginPod("zerofs-b", "node-b", "old")
	z.worker("busy-a", "node-a", "zfs", 1)
	z.worker("idle-b", "node-b", "zfs", 0)
	z.worker("snap-a", "node-a", "snap", 2)

	z.roll()
	g.Expect(z.pod(rolloutSubstrateNS, "zerofs-b")).To(BeNil(), "the idle node goes first, at once")
	g.Expect(z.state("idle-b")).To(Equal(ateapi.WorkerState_WORKER_STATE_DRAINING))
	g.Expect(z.pod(rolloutWorkerNS, "idle-b").Annotations).To(HaveKey(zerofsDrainedAnnotation))
	g.Expect(z.state("busy-a")).To(Equal(ateapi.WorkerState_WORKER_STATE_ACTIVE), "one node at a time")

	z.roll()
	g.Expect(z.pod(rolloutWorkerNS, "idle-b")).NotTo(BeNil(), "the drained worker stays until its node runs the new plugin")

	z.pluginPod("zerofs-b2", "node-b", "new")
	z.roll()
	g.Expect(z.pod(rolloutWorkerNS, "idle-b")).To(BeNil(), "replaced once the node runs the new plugin")
	g.Expect(z.state("busy-a")).To(Equal(ateapi.WorkerState_WORKER_STATE_DRAINING))
	g.Expect(z.state("snap-a")).To(Equal(ateapi.WorkerState_WORKER_STATE_ACTIVE), "workers without ZeroFS homes are left alone")
	g.Expect(z.pod(rolloutSubstrateNS, "zerofs-a")).NotTo(BeNil(), "waits for the instance to be evicted")
	g.Expect(z.pod(rolloutSubstrateNS, "zerofs-a").Annotations).To(HaveKey(zerofsRolloutAnnotation))

	z.substrate.workers["busy-a"].Status.Allocated.Actors = 0
	z.roll()
	g.Expect(z.pod(rolloutSubstrateNS, "zerofs-a")).To(BeNil())
}

func TestZeroFSRolloutGivesUpWaitingAfterTheDrainTimeout(t *testing.T) {
	g := NewWithT(t)
	z := newZeroFSRollout(t)
	z.pluginPod("zerofs-a", "node-a", "old")
	z.worker("busy-a", "node-a", "zfs", 1)

	z.roll()
	g.Expect(z.pod(rolloutSubstrateNS, "zerofs-a")).NotTo(BeNil())

	z.r.Config.DrainTimeout = 0
	z.roll()
	g.Expect(z.pod(rolloutSubstrateNS, "zerofs-a")).To(BeNil())
}

func TestZeroFSRolloutLeavesCurrentNodesAndUnmarkedWorkersAlone(t *testing.T) {
	g := NewWithT(t)
	z := newZeroFSRollout(t)
	z.pluginPod("zerofs-a", "node-a", "new")
	z.worker("busy-a", "node-a", "zfs", 1)
	z.worker("drained-a", "node-a", "zfs", 0)
	z.substrate.workers["drained-a"].Status.State = ateapi.WorkerState_WORKER_STATE_DRAINING

	z.roll()
	g.Expect(z.state("busy-a")).To(Equal(ateapi.WorkerState_WORKER_STATE_ACTIVE))
	g.Expect(z.pod(rolloutWorkerNS, "drained-a")).NotTo(BeNil(), "a worker the autoscaler drained isn't the rollout's to replace")
}
