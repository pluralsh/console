package controller

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/samber/lo"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate/ateapi"
)

const (
	// zerofsNodeDaemonSet is the agent-substrate chart's ZeroFS node plugin. It updates OnDelete, since its pod
	// owns every home staged on the node.
	zerofsNodeDaemonSet = "devbox-zerofs-node"
	// zerofsRolloutAnnotation marks the outdated node plugin pod being replaced, with when the rollout started.
	zerofsRolloutAnnotation = "devboxes.plural.sh/zerofs-rollout"
	// zerofsDrainedAnnotation marks a worker pod the rollout drained. Draining is one-way, so the pod is deleted
	// once its node runs the new plugin, and its WorkerPool starts a fresh worker.
	zerofsDrainedAnnotation = "devboxes.plural.sh/zerofs-drained"
)

//+kubebuilder:rbac:groups=apps,resources=daemonsets;controllerrevisions,verbs=get;list
//+kubebuilder:rbac:groups="",resources=pods,verbs=delete

// usesZeroFS reports whether any of the runner's revisions keeps homes on ZeroFS.
func usesZeroFS(runner *v1alpha1.DevboxRunner) bool {
	return runner.Spec.HomeStorage() == v1alpha1.DevboxHomeZeroFS || lo.SomeBy(runner.Status.Revisions, func(rev v1alpha1.DevboxRevision) bool {
		return lo.FromPtr(rev.HomeStorage) == v1alpha1.DevboxHomeZeroFS
	})
}

// rollZeroFSNodes replaces outdated ZeroFS node plugin pods one node at a time without breaking a home: it drains
// the node's workers that can host ZeroFS homes, so the gateway suspends their instances (unstaging the homes) and
// nothing new lands there, and deletes the plugin pod once they're empty or the drain timeout passed. Once the
// node runs the new plugin, the worker pods it drained are deleted for fresh ones. Every step is idempotent, so any
// ZeroFS runner's reconcile can take the next one.
func (r *DevboxRunnerReconciler) rollZeroFSNodes(ctx context.Context, api substrate.API) error {
	ds := &appsv1.DaemonSet{}
	if err := r.APIReader.Get(ctx, client.ObjectKey{Namespace: r.Config.SubstrateNamespace, Name: zerofsNodeDaemonSet}, ds); err != nil {
		return client.IgnoreNotFound(err)
	}
	latest, err := r.latestDaemonSetRevision(ctx, ds)
	if err != nil || latest == "" {
		return err
	}
	selector, err := metav1.LabelSelectorAsSelector(ds.Spec.Selector)
	if err != nil {
		return err
	}
	pods := &corev1.PodList{}
	if err := r.APIReader.List(ctx, pods, client.InNamespace(ds.Namespace), client.MatchingLabelsSelector{Selector: selector}); err != nil {
		return fmt.Errorf("listing ZeroFS node pods: %w", err)
	}

	updated := map[string]bool{}
	var outdated []corev1.Pod
	for _, pod := range pods.Items {
		switch {
		case pod.DeletionTimestamp != nil:
		case pod.Labels[appsv1.DefaultDaemonSetUniqueLabelKey] == latest:
			if podReady(pod) {
				updated[pod.Spec.NodeName] = true
			}
		default:
			outdated = append(outdated, pod)
		}
	}

	runners := &v1alpha1.DevboxRunnerList{}
	if err := r.List(ctx, runners); err != nil {
		return fmt.Errorf("listing devbox runners: %w", err)
	}
	zerofs := lo.FilterMap(runners.Items, func(runner v1alpha1.DevboxRunner, _ int) (string, bool) {
		return devboxWorkerSelectorKey(&runner), usesZeroFS(&runner)
	})
	allWorkers, err := api.ListWorkers(ctx)
	if err != nil {
		return fmt.Errorf("listing Substrate workers: %w", err)
	}
	workers := lo.Filter(allWorkers, func(w *ateapi.Worker, _ int) bool {
		return lo.SomeBy(zerofs, func(key string) bool { return w.GetLabels()[key] == stringTrue })
	})

	if err := r.replaceDrainedWorkers(ctx, workers, updated); err != nil {
		return err
	}
	if len(outdated) == 0 {
		return nil
	}

	target := r.zerofsRolloutTarget(outdated, workers)
	started, err := time.Parse(time.RFC3339, target.Annotations[zerofsRolloutAnnotation])
	if err != nil {
		started = time.Now()
		if err := r.annotatePod(ctx, target, zerofsRolloutAnnotation, started.UTC().Format(time.RFC3339)); err != nil {
			return err
		}
		log.FromContext(ctx).Info("rolling the ZeroFS node plugin", "node", target.Spec.NodeName, "pod", target.Name, "revision", latest)
	}

	var busy int64
	for _, w := range workers {
		if w.GetNodeName() != target.Spec.NodeName {
			continue
		}
		if w.GetStatus().GetState() != ateapi.WorkerState_WORKER_STATE_DRAINING {
			if err := r.drainForZeroFS(ctx, api, w); err != nil {
				return err
			}
		}
		busy += int64(w.GetStatus().GetAllocated().GetActors())
	}
	if busy > 0 && time.Since(started) < r.Config.DrainTimeout {
		return nil
	}
	if busy > 0 {
		log.FromContext(ctx).Info("drain timed out; replacing the ZeroFS node plugin under running instances", "node", target.Spec.NodeName, "instances", busy)
	}
	if err := r.Delete(ctx, &target); client.IgnoreNotFound(err) != nil {
		return fmt.Errorf("deleting ZeroFS node pod %s: %w", target.Name, err)
	}
	log.FromContext(ctx).Info("replaced the ZeroFS node plugin", "node", target.Spec.NodeName, "pod", target.Name)
	return nil
}

// latestDaemonSetRevision is the pod-template hash of the DaemonSet's newest ControllerRevision.
func (r *DevboxRunnerReconciler) latestDaemonSetRevision(ctx context.Context, ds *appsv1.DaemonSet) (string, error) {
	revisions := &appsv1.ControllerRevisionList{}
	if err := r.APIReader.List(ctx, revisions, client.InNamespace(ds.Namespace)); err != nil {
		return "", fmt.Errorf("listing ControllerRevisions: %w", err)
	}
	var latest *appsv1.ControllerRevision
	for i := range revisions.Items {
		rev := &revisions.Items[i]
		if !metav1.IsControlledBy(rev, ds) {
			continue
		}
		if latest == nil || rev.Revision > latest.Revision {
			latest = rev
		}
	}
	if latest == nil {
		return "", nil
	}
	if hash := latest.Labels[appsv1.DefaultDaemonSetUniqueLabelKey]; hash != "" {
		return hash, nil
	}
	return strings.TrimPrefix(latest.Name, ds.Name+"-"), nil
}

// zerofsRolloutTarget is the outdated pod already being replaced, or else the one whose node hosts the fewest
// ZeroFS instances, so idle nodes go first.
func (r *DevboxRunnerReconciler) zerofsRolloutTarget(outdated []corev1.Pod, workers []*ateapi.Worker) corev1.Pod {
	if pod, ok := lo.Find(outdated, func(p corev1.Pod) bool { return p.Annotations[zerofsRolloutAnnotation] != "" }); ok {
		return pod
	}
	load := map[string]int64{}
	for _, w := range workers {
		load[w.GetNodeName()] += int64(w.GetStatus().GetAllocated().GetActors())
	}
	sort.Slice(outdated, func(i, j int) bool {
		a, b := outdated[i].Spec.NodeName, outdated[j].Spec.NodeName
		if load[a] != load[b] {
			return load[a] < load[b]
		}
		return a < b
	})
	return outdated[0]
}

// drainForZeroFS marks the worker's pod, then drains the worker, so a drained worker is always one the rollout
// later replaces.
func (r *DevboxRunnerReconciler) drainForZeroFS(ctx context.Context, api substrate.API, w *ateapi.Worker) error {
	pod := &corev1.Pod{}
	err := r.APIReader.Get(ctx, client.ObjectKey{Namespace: w.GetWorkerNamespace(), Name: w.GetWorkerPod()}, pod)
	if apierrors.IsNotFound(err) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("getting worker pod %s: %w", w.GetWorkerPod(), err)
	}
	if err := r.annotatePod(ctx, *pod, zerofsDrainedAnnotation, stringTrue); err != nil {
		return err
	}
	drained, err := api.DrainWorker(ctx, w.GetMetadata().GetName())
	if err != nil {
		return fmt.Errorf("draining worker %s: %w", w.GetMetadata().GetName(), err)
	}
	w.Status = drained.GetStatus()
	return nil
}

// replaceDrainedWorkers deletes the empty worker pods the rollout drained on nodes that run the new plugin.
func (r *DevboxRunnerReconciler) replaceDrainedWorkers(ctx context.Context, workers []*ateapi.Worker, updated map[string]bool) error {
	for _, w := range workers {
		if !updated[w.GetNodeName()] || w.GetStatus().GetState() != ateapi.WorkerState_WORKER_STATE_DRAINING || w.GetStatus().GetAllocated().GetActors() > 0 {
			continue
		}
		pod := &corev1.Pod{}
		if err := r.APIReader.Get(ctx, client.ObjectKey{Namespace: w.GetWorkerNamespace(), Name: w.GetWorkerPod()}, pod); err != nil {
			if apierrors.IsNotFound(err) {
				continue
			}
			return fmt.Errorf("getting worker pod %s: %w", w.GetWorkerPod(), err)
		}
		if pod.Annotations[zerofsDrainedAnnotation] == "" || pod.DeletionTimestamp != nil {
			continue
		}
		if err := r.Delete(ctx, pod); client.IgnoreNotFound(err) != nil {
			return fmt.Errorf("deleting drained worker pod %s: %w", pod.Name, err)
		}
		log.FromContext(ctx).Info("replacing a worker drained for the ZeroFS rollout", "node", w.GetNodeName(), "pod", pod.Name)
	}
	return nil
}

func (r *DevboxRunnerReconciler) annotatePod(ctx context.Context, pod corev1.Pod, key, value string) error {
	patch := fmt.Sprintf(`{"metadata":{"annotations":{%q:%q}}}`, key, value)
	target := &corev1.Pod{ObjectMeta: metav1.ObjectMeta{Name: pod.Name, Namespace: pod.Namespace}}
	if err := r.Patch(ctx, target, client.RawPatch(types.MergePatchType, []byte(patch))); err != nil {
		return fmt.Errorf("annotating pod %s: %w", pod.Name, err)
	}
	return nil
}

func podReady(pod corev1.Pod) bool {
	return lo.SomeBy(pod.Status.Conditions, func(c corev1.PodCondition) bool {
		return c.Type == corev1.PodReady && c.Status == corev1.ConditionTrue
	})
}
