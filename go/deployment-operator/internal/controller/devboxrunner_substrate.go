package controller

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/samber/lo"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/internal/utils"
	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/egress/rules"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/egress/scmpath"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/guest"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/probe"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/runtimemanifest"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate/ateapi"
)

// WorkerPools are managed as unstructured objects so the operator doesn't depend on go.ate.dev/substrate.
var workerPoolGVK = schema.GroupVersionKind{Group: "ate.dev", Version: "v1", Kind: "WorkerPool"}

// devboxCapabilities are added to the devbox container's capability set. The box runs as dev (non-root), so its
// processes hold none of them; they only bound what setuid-root helpers gain. newuidmap/newgidmap need SETUID,
// SETGID and (to map uid 0) SETFCAP to give rootless Podman its subuid/subgid ranges; without them the kernel
// refuses the multi-range uid_map and `docker` fails to start any container.
var devboxCapabilities = []string{"SETUID", "SETGID", "SETFCAP"}

// workerPodAnnotations keep node autoscalers from evicting workers: a worker's boxes run outside any pod, so a
// node with only a worker on it looks underused, and evicting the worker kills every box on it unsaved.
var workerPodAnnotations = map[string]string{
	"cluster-autoscaler.kubernetes.io/safe-to-evict": "false",
	"karpenter.sh/do-not-disrupt":                    "true",
	// do-not-disrupt's name before Karpenter v0.32
	"karpenter.sh/do-not-evict": "true",
}

const (
	devboxContainerName  = "devbox"
	runtimeContainerName = "plural-runtime"
	devboxHomeVolume     = "home"
	devboxHomeMount      = "/home/dev"
	// runtimeHomeMount is where the runtime sidecar mounts the home volume. It differs from devboxHomeMount on
	// purpose: gVisor keys a volume's checkpoint by the first container mounting it and its mount path.
	runtimeHomeMount = "/mnt/home"
	// runtimeInstallDir is where the sidecar installs the runtime, relative to the home volume.
	runtimeInstallDir = ".plural-runtime"
	devboxTrustVolume = "egress-trust"
	devboxActorVolume = "actor-metadata"
	// devboxEgressTrustMount is the first of the daemon's DefaultEgressCAGlobs.
	devboxEgressTrustMount = "/run/ate/egress-trust-bundle"
	devboxActorMetaMount   = "/run/ate/actor"
	devboxReadyzPort       = 80
	// devboxReadyzTimeout is how long a box without golden boot work may take to answer its wakeup probe. It
	// outlasts the devbox container's wait for the runtime (devboxWaitAndExec, about 270 s) by a minute, for the
	// polls' own cost and the daemon's start, so a runtime that never installed is reported as such. Copying
	// claude and codex into a home takes about 10 s under gVisor; several installs on one worker at once took up
	// to 108 s. Golden boot work gets its own timeout on top.
	devboxReadyzTimeout = 330 * time.Second
	// substrateEnvValueLimit is Substrate's per-value env limit.
	substrateEnvValueLimit = 32 * 1024
	// dns1123Limit bounds atespace, template and WorkerPool names.
	dns1123Limit = 63
)

func devboxGuestAgents(runner *v1alpha1.DevboxRunner) []guest.Agent {
	return lo.Map(runner.Spec.Agents, func(a v1alpha1.DevboxAgent, _ int) guest.Agent {
		return guest.Agent{
			Type:           string(a.Type),
			Default:        lo.FromPtr(a.Default),
			AdapterVersion: lo.FromPtr(a.AdapterVersion),
			Models:         a.Models,
			DefaultModel:   lo.FromPtr(a.DefaultModel),
			ACPV2:          lo.FromPtr(a.ACPV2),
		}
	})
}

// devboxAtespaceName embeds part of the runner UID: Substrate atespace names must never be reused,
// so a deleted and recreated runner gets a fresh one.
func devboxAtespaceName(runner *v1alpha1.DevboxRunner) string {
	uid := strings.ReplaceAll(string(runner.UID), "-", "")
	if len(uid) > 8 {
		uid = uid[:8]
	}
	return truncateName("devbox-"+runner.Name, dns1123Limit-len(uid)-1) + "-" + uid
}

func devboxWorkerPoolName(runner *v1alpha1.DevboxRunner) string {
	return truncateName("devbox-"+runner.Name, dns1123Limit)
}

func devboxTemplateName(runner *v1alpha1.DevboxRunner, revision int64) string {
	suffix := fmt.Sprintf("-r%d", revision)
	return truncateName(runner.Name, dns1123Limit-len(suffix)) + suffix
}

func truncateName(name string, limit int) string {
	if len(name) <= limit {
		return name
	}
	return strings.TrimRight(name[:limit], "-.")
}

func devboxSelectorLabels(runner *v1alpha1.DevboxRunner) map[string]string {
	return map[string]string{v1alpha1.DevboxRunnerNameLabel: runner.Name}
}

// devboxWorkerSelectorKey is the WorkerPool label the runner's ActorTemplates select workers by. Its key, not its
// value, names the runner, so a pool shared by several runners can carry all of their labels.
func devboxWorkerSelectorKey(runner *v1alpha1.DevboxRunner) string {
	name := "runner." + runner.Name
	if len(name) > dns1123Limit {
		sum := sha256.Sum256([]byte(runner.Name))
		suffix := "-" + hex.EncodeToString(sum[:])[:10]
		name = truncateName(name, dns1123Limit-len(suffix)) + suffix
	}
	return "devboxes.plural.sh/" + name
}

func devboxWorkerSelector(runner *v1alpha1.DevboxRunner) map[string]string {
	return map[string]string{devboxWorkerSelectorKey(runner): stringTrue}
}

func (r *DevboxRunnerReconciler) sandboxClass(runner *v1alpha1.DevboxRunner) v1alpha1.DevboxSandboxClass {
	if wp := runner.Spec.WorkerPool; wp != nil && wp.SandboxClass != nil {
		return *wp.SandboxClass
	}
	return v1alpha1.DevboxSandboxGVisor
}

// reconcileWorkerPool creates or updates the runner's WorkerPool and labels its AdditionalPools. The
// ActorTemplate worker_selector matches WorkerPool metadata labels, so every pool carries the runner's worker
// selector.
func (r *DevboxRunnerReconciler) reconcileWorkerPool(ctx context.Context, api substrate.API, runner *v1alpha1.DevboxRunner) error {
	class := r.sandboxClass(runner)
	wp := lo.FromPtr(runner.Spec.WorkerPool)

	capacity, err := devboxInstanceCapacity(runner, class)
	if err != nil {
		return err
	}
	status := capacity.status()
	if wp.Autoscaling != nil && runner.Status.Capacity != nil {
		previous := runner.Status.Capacity
		status.Workers, status.DrainingWorkers, status.RunningInstances = previous.Workers, previous.DrainingWorkers, previous.RunningInstances
		status.AdditionalFreeInstances, status.DesiredWorkers, status.LastScaleTime = previous.AdditionalFreeInstances, previous.DesiredWorkers, previous.LastScaleTime
	}
	runner.Status.Capacity = status

	additionalErr := r.reconcileAdditionalPools(ctx, runner)

	image := lo.FromPtr(wp.WorkerImage)
	if image == "" {
		image = r.Config.WorkerImages[class]
	}
	if image == "" {
		if image, err = r.installedWorkerImage(ctx, class); err != nil {
			return err
		}
	}
	if image == "" {
		return fmt.Errorf("no Substrate worker image configured for sandbox class %s and none derivable from %s/%s, set devboxes.workerImages.%s in the deployment-operator chart or spec.workerPool.workerImage",
			class, r.Config.SubstrateNamespace, ateControllerName, class)
	}

	sandboxClass := map[string]any{"name": string(class)}
	if wp.SandboxConfig != nil && *wp.SandboxConfig != "" {
		sandboxClass["configRef"] = map[string]any{"name": *wp.SandboxConfig}
	}

	template := map[string]any{
		"labels":      stringMapToAny(devboxSelectorLabels(runner)),
		"annotations": stringMapToAny(lo.Assign(workerPodAnnotations, wp.PodAnnotations)),
	}
	if len(wp.NodeSelector) > 0 {
		template["nodeSelector"] = stringMapToAny(wp.NodeSelector)
	}
	if wp.NodeAffinity != nil {
		affinity, err := toUnstructured(wp.NodeAffinity)
		if err != nil {
			return err
		}
		template["nodeAffinity"] = affinity
	}
	if len(wp.Tolerations) > 0 {
		tolerations, err := toUnstructured(wp.Tolerations)
		if err != nil {
			return err
		}
		template["tolerations"] = tolerations
	}
	if wp.Resources != nil {
		resources, err := toUnstructured(wp.Resources)
		if err != nil {
			return err
		}
		template["resources"] = resources
	}
	if wp.PriorityClassName != nil {
		template["priorityClassName"] = *wp.PriorityClassName
	}

	if err := common.EnsureSpawnedCAConfigMap(ctx, r.Client, r.Config.WorkerPoolNamespace); err != nil {
		return fmt.Errorf("ensuring spawned CA configmap for worker pool namespace: %w", err)
	}

	pool := &unstructured.Unstructured{}
	pool.SetGroupVersionKind(workerPoolGVK)
	if err := r.Get(ctx, client.ObjectKey{Name: devboxWorkerPoolName(runner), Namespace: r.Config.WorkerPoolNamespace}, pool); err != nil && !apierrors.IsNotFound(err) {
		return fmt.Errorf("getting WorkerPool: %w", err)
	}
	pool.SetGroupVersionKind(workerPoolGVK)
	pool.SetName(devboxWorkerPoolName(runner))
	pool.SetNamespace(r.Config.WorkerPoolNamespace)
	// Read before CreateOrPatch, which strips status from an unstructured object it doesn't patch.
	ready, _, _ := unstructured.NestedInt64(pool.Object, "status", "readyReplicas")

	replicas := int64(lo.FromPtrOr(wp.Replicas, 1))
	var autoscaleErr error
	if wp.Autoscaling != nil {
		replicas, autoscaleErr = r.autoscaleWorkerPool(ctx, api, runner, pool, class, capacity)
	}

	_, err = controllerutil.CreateOrPatch(ctx, r.Client, pool, func() error {
		labels := pool.GetLabels()
		if labels == nil {
			labels = map[string]string{}
		}
		for k, v := range devboxSelectorLabels(runner) {
			labels[k] = v
		}
		for k, v := range devboxWorkerSelector(runner) {
			labels[k] = v
		}
		pool.SetLabels(labels)
		if err := controllerutil.SetOwnerReference(runner, pool, r.Scheme); err != nil {
			return err
		}

		spec := map[string]any{
			"replicas":       replicas,
			"workerImage":    image,
			"sandboxClasses": []any{sandboxClass},
			"template":       template,
		}
		return unstructured.SetNestedMap(pool.Object, spec, "spec")
	})
	if err != nil {
		return fmt.Errorf("reconciling WorkerPool: %w", err)
	}

	runner.Status.WorkerPool = lo.ToPtr(r.Config.WorkerPoolNamespace + "/" + pool.GetName())
	if err := errors.Join(autoscaleErr, additionalErr); err != nil {
		utils.MarkCondition(runner.SetCondition, v1alpha1.DevboxWorkerPoolReadyConditionType, metav1.ConditionFalse, v1alpha1.ErrorConditionReason, err.Error())
		return nil
	}
	if replicas > 0 && ready == 0 {
		utils.MarkCondition(runner.SetCondition, v1alpha1.DevboxWorkerPoolReadyConditionType, metav1.ConditionFalse, v1alpha1.DevboxPendingReason,
			fmt.Sprintf("WorkerPool %s has no ready workers yet", pool.GetName()))
	} else {
		utils.MarkCondition(runner.SetCondition, v1alpha1.DevboxWorkerPoolReadyConditionType, metav1.ConditionTrue, v1alpha1.ReadyConditionReason,
			fmt.Sprintf("%d/%d workers ready", ready, replicas))
	}
	return nil
}

func devboxWorkerPoolRefs(runner *v1alpha1.DevboxRunner, defaultNamespace string) []string {
	refs := lo.Map(lo.FromPtr(runner.Spec.WorkerPool).AdditionalPools, func(ref v1alpha1.DevboxWorkerPoolRef, _ int) string {
		return lo.Ternary(ref.Namespace == "", defaultNamespace, ref.Namespace) + "/" + ref.Name
	})
	return lo.Uniq(refs)
}

// reconcileAdditionalPools puts the runner's worker selector on its AdditionalPools and takes it off pools that
// left the list. Status keeps the pools labeled, so a missing pool is retried and a removed one cleaned up.
// installedWorkerImage derives a sandbox class's worker image from the installed ate-controller's, so workers
// match the Substrate release and registry: <registry>/atecontroller:<tag> becomes <registry>/ateworker-<class>:<tag>.
// It returns "" when ate-controller is missing or its image isn't a tagged atecontroller reference.
func (r *DevboxRunnerReconciler) installedWorkerImage(ctx context.Context, class v1alpha1.DevboxSandboxClass) (string, error) {
	controller := &appsv1.Deployment{}
	if err := r.Get(ctx, client.ObjectKey{Name: ateControllerName, Namespace: r.Config.SubstrateNamespace}, controller); err != nil {
		return "", client.IgnoreNotFound(err)
	}
	for _, c := range controller.Spec.Template.Spec.Containers {
		if image := workerImageFor(c.Image, class); image != "" {
			return image, nil
		}
	}
	return "", nil
}

func workerImageFor(controllerImage string, class v1alpha1.DevboxSandboxClass) string {
	ref, _, _ := strings.Cut(controllerImage, "@")
	slash := strings.LastIndex(ref, "/")
	name, tag, ok := strings.Cut(ref[slash+1:], ":")
	if !ok || tag == "" || name != "atecontroller" {
		return ""
	}
	return ref[:slash+1] + "ateworker-" + string(class) + ":" + tag
}

func (r *DevboxRunnerReconciler) reconcileAdditionalPools(ctx context.Context, runner *v1alpha1.DevboxRunner) error {
	desired := devboxWorkerPoolRefs(runner, r.Config.WorkerPoolNamespace)
	var errs []error
	var labeled []string
	for _, ref := range desired {
		if err := r.setWorkerSelector(ctx, runner, ref, true); err != nil {
			errs = append(errs, fmt.Errorf("labeling additional WorkerPool %s: %w", ref, err))
			continue
		}
		labeled = append(labeled, ref)
	}
	for _, ref := range runner.Status.AdditionalWorkerPools {
		if lo.Contains(desired, ref) {
			continue
		}
		if err := r.setWorkerSelector(ctx, runner, ref, false); err != nil {
			errs = append(errs, fmt.Errorf("unlabeling WorkerPool %s: %w", ref, err))
			labeled = append(labeled, ref)
		}
	}
	runner.Status.AdditionalWorkerPools = labeled
	return errors.Join(errs...)
}

func (r *DevboxRunnerReconciler) releaseAdditionalPools(ctx context.Context, runner *v1alpha1.DevboxRunner) error {
	for _, ref := range runner.Status.AdditionalWorkerPools {
		if err := r.setWorkerSelector(ctx, runner, ref, false); err != nil {
			return fmt.Errorf("unlabeling WorkerPool %s: %w", ref, err)
		}
	}
	runner.Status.AdditionalWorkerPools = nil
	return nil
}

func (r *DevboxRunnerReconciler) setWorkerSelector(ctx context.Context, runner *v1alpha1.DevboxRunner, ref string, on bool) error {
	namespace, name, _ := strings.Cut(ref, "/")
	pool := &unstructured.Unstructured{}
	pool.SetGroupVersionKind(workerPoolGVK)
	if err := r.Get(ctx, client.ObjectKey{Name: name, Namespace: namespace}, pool); err != nil {
		if !on && (apierrors.IsNotFound(err) || isNoKindMatch(err)) {
			return nil
		}
		return err
	}

	key := devboxWorkerSelectorKey(runner)
	_, has := pool.GetLabels()[key]
	if has == on {
		return nil
	}
	value := any(nil)
	if on {
		value = stringTrue
	}
	patch, err := json.Marshal(map[string]any{"metadata": map[string]any{"labels": map[string]any{key: value}}})
	if err != nil {
		return err
	}
	return r.Patch(ctx, pool, client.RawPatch(types.MergePatchType, patch))
}

func (r *DevboxRunnerReconciler) deleteWorkerPool(ctx context.Context, runner *v1alpha1.DevboxRunner) error {
	if err := r.releaseAdditionalPools(ctx, runner); err != nil {
		return err
	}
	pool := &unstructured.Unstructured{}
	pool.SetGroupVersionKind(workerPoolGVK)
	pool.SetName(devboxWorkerPoolName(runner))
	pool.SetNamespace(r.Config.WorkerPoolNamespace)
	if err := r.Delete(ctx, pool); err != nil && !apierrors.IsNotFound(err) && !isNoKindMatch(err) {
		return err
	}
	return nil
}

func isNoKindMatch(err error) bool {
	return err != nil && strings.Contains(err.Error(), "no matches for kind")
}

func stringMapToAny(in map[string]string) map[string]any {
	out := make(map[string]any, len(in))
	for k, v := range in {
		out[k] = v
	}
	return out
}

func toUnstructured(v any) (any, error) {
	raw, err := json.Marshal(v)
	if err != nil {
		return nil, err
	}
	var out any
	return out, json.Unmarshal(raw, &out)
}

// ensureAtespace creates the runner's atespace and grants the gateway editor on it, so the gateway can create
// instance actors, tags and egress policies, and global viewer, which listing workers needs: without it the
// gateway can't see a worker draining, and the boxes on it die unsaved with the worker. The operator itself
// creates atespaces as a global owner, a Substrate install setting (DBX-23).
func (r *DevboxRunnerReconciler) ensureAtespace(ctx context.Context, api substrate.API, runner *v1alpha1.DevboxRunner) (string, error) {
	atespace := lo.FromPtr(runner.Status.Atespace)
	if atespace == "" {
		atespace = devboxAtespaceName(runner)
	}
	if err := api.EnsureAtespace(ctx, atespace); err != nil {
		return "", fmt.Errorf("ensuring atespace %s: %w", atespace, err)
	}
	if err := api.EnsureAtespaceAccessPolicy(ctx, atespace, substrate.RoleEditor, r.Config.GatewayPrincipal()); err != nil {
		return "", fmt.Errorf("granting the gateway editor on atespace %s: %w", atespace, err)
	}
	if err := api.EnsureGlobalAccessPolicy(ctx, substrate.RoleViewer, r.Config.GatewayPrincipal()); err != nil {
		return "", fmt.Errorf("granting the gateway global viewer: %w", err)
	}
	runner.Status.Atespace = &atespace
	return atespace, nil
}

// devboxWaitAndExec is the devbox container's command: it waits for the runtime sidecar to publish the ready
// marker for the template's install ID (runtimemanifest.InstallID: the runtime digest and the runner's agents),
// then execs the daemon the sidecar installed in the home volume, so the daemon is PID 1 as before, and tells it
// where the runtime (and its agents) is. Arguments: the install ID, the install root and the ID's directory.
// It is POSIX sh with builtins only, apart from sleep, so it runs in any environment image with a shell. It waits
// about 270 s (1350 polls of 0.2 s, or of 1 s counted as 5 where sleep takes whole seconds) for the first install
// of the runner's agents into a home, and then says so, before Substrate's wakeup probe gives up. The marker is
// compared with the ID because the home volume outlives a template change: after an update it still holds the
// previous install until the sidecar replaces it.
const devboxWaitAndExec = `d=$1; r=$2; i=0
while [ "$i" -lt 1350 ]; do
  v=; [ -r "$r/ready" ] && read -r v < "$r/ready"
  [ "$v" = "$d" ] && export DEVBOX_RUNTIME_DIR="$r/$3" && exec "$r/$3/bin/devbox-daemon"
  if sleep 0.2 2>/dev/null; then i=$((i+1)); else sleep 1; i=$((i+5)); fi
done
echo "plural runtime $d was not installed in $r" >&2
exit 1`

// devboxRuntimeSelection is what the runner's runtime sidecar installs besides the daemon: the runner's agents
// and, with the browser enabled, its tools.
func devboxRuntimeSelection(runner *v1alpha1.DevboxRunner) (agents []string, browser bool) {
	agents = lo.Map(runner.Spec.Agents, func(a v1alpha1.DevboxAgent, _ int) string { return string(a.Type) })
	return agents, runner.Spec.Browser != nil && runner.Spec.Browser.Enabled
}

// devboxRuntimeArgs are the runtime sidecar's arguments: the digest it installs and the runner's agents (and
// browser), so each instance's home holds only the components the runner uses.
func devboxRuntimeArgs(runner *v1alpha1.DevboxRunner, digest string) []string {
	agents, browser := devboxRuntimeSelection(runner)
	args := []string{"--digest", digest, "--dst", runtimeHomeMount + "/" + runtimeInstallDir, "--agents", strings.Join(agents, ",")}
	if browser {
		args = append(args, "--browser")
	}
	return args
}

// buildActorTemplate renders the immutable ActorTemplate for the runner's current spec, resolved environment
// image and resolved runtime image. The returned hash covers everything but the template name, and keys the
// revision.
//
// Substrate only lets an existing actor move to a template with the same volumes and, for the containers it
// already has, the same mounts. What follows from that and from how gVisor checkpoints, all found by testing
// (PROD-5487), must hold for every revision:
//   - the devbox container is first: gVisor files the home volume's checkpoint under the first container that
//     mounts it, and an actor moved to a template with another container first loses its home
//   - the volumes and the devbox container's mounts never change
//   - the runtime sidecar stays alive (devbox-runtime-installer blocks): an actor with an exited container
//     can't be restored from a memory snapshot
func (r *DevboxRunnerReconciler) buildActorTemplate(runner *v1alpha1.DevboxRunner, atespace, image, runtime string) (*ateapi.ActorTemplate, string, error) {
	_, runtimeDigest, ok := strings.Cut(runtime, "@")
	if !ok || runtimeDigest == "" {
		return nil, "", fmt.Errorf("runtime image %q is not pinned by digest", runtime)
	}
	agents, browser := devboxRuntimeSelection(runner)
	installID := runtimemanifest.InstallID(runtimeDigest, agents, browser)
	if err := validateDevboxRepositories(runner); err != nil {
		return nil, "", err
	}
	cfg := guest.Config{
		Runner:  runner.ConsoleName(),
		Browser: runner.Spec.Browser != nil && runner.Spec.Browser.Enabled,
		Agents:  devboxGuestAgents(runner),
		Repositories: lo.Map(runner.Spec.Repositories, func(r v1alpha1.DevboxRepository, _ int) guest.Repository {
			return guest.Repository{URL: r.URL, Branch: lo.FromPtr(r.Branch), Description: lo.FromPtr(r.Description)}
		}),
	}
	cfg.BootstrapScript = lo.FromPtr(runner.Spec.BootstrapScript)
	if runner.Spec.Mise != nil {
		cfg.Mise = lo.FromPtr(runner.Spec.Mise.Config)
	}
	guestJSON, err := json.Marshal(cfg)
	if err != nil {
		return nil, "", err
	}
	if len(guestJSON) > substrateEnvValueLimit {
		return nil, "", fmt.Errorf("bootstrapScript, mise, repositories and agents add up to %d bytes, over Substrate's %d byte env limit", len(guestJSON), substrateEnvValueLimit)
	}
	// The runtime installs before the daemon starts, and the golden boot's work runs after.
	readyz := devboxReadyzTimeout
	if runner.Spec.HasGoldenBootWork() {
		readyz = min(readyz+runner.Spec.GoldenBootTimeout(), v1alpha1.DevboxMaxBootstrapTimeout)
	}

	capacity, err := devboxInstanceCapacity(runner, r.sandboxClass(runner))
	if err != nil {
		return nil, "", err
	}

	template := &ateapi.ActorTemplate{
		Metadata:       &ateapi.ResourceMetadata{Atespace: atespace},
		WorkerSelector: &ateapi.Selector{MatchLabels: devboxWorkerSelector(runner)},
		Containers: []*ateapi.Container{{
			Name:  devboxContainerName,
			Image: image,
			Command: []string{runner.RuntimeShell(), "-c", devboxWaitAndExec, "devbox-runtime",
				installID, devboxHomeMount + "/" + runtimeInstallDir, runtimemanifest.InstallDirName(installID)},
			Env: append([]*ateapi.EnvVar{{Name: guest.EnvVar, Value: string(guestJSON)}}, devboxPlainEnv(runner)...),
			WakeupProbe: &ateapi.WakeupProbe{
				HttpGet:        &ateapi.HttpGetAction{Path: "/readyz", Port: devboxReadyzPort},
				TimeoutSeconds: int32(readyz / time.Second),
			},
			VolumeMounts: []*ateapi.VolumeMount{
				{Name: devboxHomeVolume, MountPath: devboxHomeMount},
				{Name: devboxTrustVolume, MountPath: devboxEgressTrustMount},
				{Name: devboxActorVolume, MountPath: devboxActorMetaMount},
			},
			SecurityContext: &ateapi.SecurityContext{Capabilities: &ateapi.Capabilities{Add: devboxCapabilities}},
		}, {
			Name:  runtimeContainerName,
			Image: runtime,
			// The image's entrypoint is devbox-runtime-installer, which installs into runtimeHomeMount and blocks.
			Args:         devboxRuntimeArgs(runner, runtimeDigest),
			VolumeMounts: []*ateapi.VolumeMount{{Name: devboxHomeVolume, MountPath: runtimeHomeMount}},
			// It runs as root to write into a home owned by the environment image's user.
			SecurityContext: &ateapi.SecurityContext{Capabilities: &ateapi.Capabilities{Add: []string{"DAC_OVERRIDE", "FOWNER"}}},
		}},
		Volumes: []*ateapi.Volume{
			devboxHomeVolumeSource(runner),
			{Name: devboxTrustVolume, SystemInfo: &ateapi.SystemInfoVolumeSource{DataSources: []*ateapi.SystemInfoDataSource{{
				TrustBundle: &ateapi.TrustBundleDataSource{Names: []string{"egress-mitm.ate.dev"}, Path: "egress-mitm.pem"},
			}}}},
			{Name: devboxActorVolume, SystemInfo: &ateapi.SystemInfoVolumeSource{DataSources: []*ateapi.SystemInfoDataSource{{
				ActorMetadata: &ateapi.ActorMetadataDataSource{Items: []*ateapi.ActorMetadataItem{
					{Field: ateapi.ActorMetadataField_ACTOR_METADATA_FIELD_NAME, Path: "name"},
					{Field: ateapi.ActorMetadataField_ACTOR_METADATA_FIELD_ATESPACE, Path: "atespace"},
					{Field: ateapi.ActorMetadataField_ACTOR_METADATA_FIELD_UID, Path: "uid"},
				}},
			}}}},
		},
		SnapshotConfig: &ateapi.SnapshotConfig{
			PreferredFidelity:    ateapi.SnapshotFidelity_SNAPSHOT_FIDELITY_MEMORY,
			GoldenSnapshotConfig: &ateapi.GoldenSnapshotConfig{Mode: ateapi.GoldenSnapshotMode_GOLDEN_SNAPSHOT_MODE_ENABLED},
		},
		Resources: &ateapi.ResourceRequirements{Limits: &ateapi.Resources{
			CpuMillicores: capacity.CPU,
			MemoryBytes:   capacity.Memory,
		}},
		GoldenEgressPolicy: devboxGoldenEgressPolicy(runner),
	}

	hash, err := utils.HashObject(template)
	if err != nil {
		return nil, "", err
	}
	return template, hash, nil
}

// validateDevboxRepositories rejects repositories the golden boot couldn't clone: off the allowlist, which egress
// enforces on the golden boot too, or listed twice.
func validateDevboxRepositories(runner *v1alpha1.DevboxRunner) error {
	seen := map[string]bool{}
	for _, repo := range runner.Spec.Repositories {
		if !rules.RepositoryAllowed(runner.Spec.AllowedRepositories, repo.URL) {
			return fmt.Errorf("repository %s isn't on allowedRepositories (entries name the host, like github.com/owner/repo)", repo.URL)
		}
		id := scmpath.Normalize(repo.URL)
		if seen[id] {
			return fmt.Errorf("repository %s is listed twice", repo.URL)
		}
		seen[id] = true
	}
	return nil
}

// devboxHomeVolumeSource is /home/dev: a durable dir carried in the instance's snapshots, or a JuiceFS or ZeroFS
// volume of the home's size, of the runner's StorageClass in every revision (see devboxGoldenHomeSeed).
func devboxHomeVolumeSource(runner *v1alpha1.DevboxRunner) *ateapi.Volume {
	if !runner.Spec.HomeStorage().External() {
		return &ateapi.Volume{Name: devboxHomeVolume, DurableDir: &ateapi.DurableDirVolumeSource{}}
	}
	size := runner.Spec.HomeSize()
	return &ateapi.Volume{Name: devboxHomeVolume, External: &ateapi.ExternalVolumeSource{Template: &ateapi.ExternalVolumeTemplate{
		CapacityBytes:    size.Value(),
		StorageClassName: runner.Spec.HomeStorageClass(),
	}}}
}

// devboxTemplateNeedsPreview reports whether creating the template uses Substrate preview features.
func devboxTemplateNeedsPreview(template *ateapi.ActorTemplate) bool {
	if template.GoldenEgressPolicy != nil {
		return true
	}
	return lo.ContainsBy(template.Volumes, func(v *ateapi.Volume) bool { return v.External != nil })
}

// devboxGoldenEgressPolicy lets the golden boot reach what it needs: the hosts of spec.repositories with the box's
// SCM credentials injected (through the gateway's credential provider), then for the bootstrap script and mise the
// runner's package servers, OCI registries and HTTP allowlist plus mise's own download hosts. Without customization
// the golden boot needs no egress.
func devboxGoldenEgressPolicy(runner *v1alpha1.DevboxRunner) *ateapi.EgressPolicyTemplate {
	if !runner.Spec.HasGoldenBootWork() {
		return nil
	}
	hasMise := runner.Spec.Mise != nil && lo.FromPtr(runner.Spec.Mise.Config) != ""

	repos := lo.Map(runner.Spec.Repositories, func(r v1alpha1.DevboxRepository, _ int) string { return r.URL })
	scm := rules.ATE(rules.BuildGoldenPolicy(runner.Name, repos))
	// Substrate rejects two rules on one host and port, and the SCM rule must win where they meet.
	taken := map[string]bool{}
	for _, r := range scm {
		for _, host := range r.GetHttps().GetHostnames() {
			for _, port := range r.GetHttps().GetPorts().GetNumbers() {
				taken[fmt.Sprintf("%s:%d", strings.ToLower(host), port)] = true
			}
		}
	}
	free := func(host string, port int32) bool { return !taken[fmt.Sprintf("%s:%d", strings.ToLower(host), port)] }

	https := map[int32][]string{}
	var passthrough []*ateapi.EgressRule
	if hasMise {
		https[443] = append(https[443], "*.github.com", "*.githubusercontent.com")
		https[443] = append(https[443], v1alpha1.MiseHosts...)
	}
	https[443] = append(https[443], runner.Spec.PackageServerHosts()...)
	https[443] = append(https[443], runner.Spec.OCIRegistryHosts()...)
	for _, entry := range runner.Spec.HTTPAllowlist {
		port := lo.FromPtrOr(entry.Port, 443)
		if !free(entry.Host, port) {
			continue
		}
		if lo.FromPtr(entry.Passthrough) {
			passthrough = append(passthrough, &ateapi.EgressRule{TlsPassthrough: &ateapi.TlsPassthroughRule{
				Hostnames: []string{entry.Host}, Ports: &ateapi.Ports{Numbers: []int32{port}},
			}})
			continue
		}
		https[port] = append(https[port], entry.Host)
	}

	ports := lo.Keys(https)
	sort.Slice(ports, func(i, j int) bool { return ports[i] < ports[j] })
	var rules []*ateapi.EgressRule
	for _, port := range ports {
		hosts := lo.Filter(lo.Uniq(https[port]), func(h string, _ int) bool { return free(h, port) })
		if len(hosts) == 0 {
			continue
		}
		rules = append(rules, &ateapi.EgressRule{Https: &ateapi.HttpsRule{
			Hostnames: hosts, Ports: &ateapi.Ports{Numbers: []int32{port}},
		}})
	}
	rules = append(append(rules, scm...), passthrough...)
	if len(rules) == 0 {
		return nil
	}
	return &ateapi.EgressPolicyTemplate{Rules: rules}
}

// reconcileRevisions creates a new ActorTemplate revision when the template hash changes, then advances every
// in-flight revision: Building (waiting for the golden tag), Probing (waiting for the gateway's agent probe),
// and finally Ready or Failed. The newest Ready revision is the one new instances start from; older Ready
// revisions are Retired and kept until garbage collection finds nothing references them.
func (r *DevboxRunnerReconciler) reconcileRevisions(ctx context.Context, api substrate.API, runner *v1alpha1.DevboxRunner, atespace, image, runtime string) error {
	template, hash, err := r.buildActorTemplate(runner, atespace, image, runtime)
	if err != nil {
		utils.MarkCondition(runner.SetCondition, v1alpha1.DevboxTemplateReadyConditionType, metav1.ConditionFalse, v1alpha1.DevboxMisconfiguredReason, err.Error())
		return err
	}

	latest := runner.LatestRevision()
	// The latest revision is only Retired without a newer one when its golden boot lost its worker or its golden home
	// wasn't captured.
	if latest == nil || latest.Hash != hash || latest.Phase == v1alpha1.DevboxRevisionRetired {
		next := int64(1)
		if latest != nil {
			next = latest.Revision + 1
		}
		name := devboxTemplateName(runner, next)
		template.Metadata.Name = name
		if err := r.checkHomeStorageClass(ctx, runner); err != nil {
			utils.MarkCondition(runner.SetCondition, v1alpha1.DevboxTemplateReadyConditionType, metav1.ConditionFalse, v1alpha1.DevboxMisconfiguredReason, err.Error())
			return err
		}
		if _, err := api.CreateActorTemplate(ctx, template, devboxTemplateNeedsPreview(template)); err != nil {
			utils.MarkCondition(runner.SetCondition, v1alpha1.DevboxTemplateReadyConditionType, metav1.ConditionFalse, v1alpha1.DevboxFailedReason,
				fmt.Sprintf("creating ActorTemplate %s: %s", name, err))
			return err
		}
		// In-flight revisions were built from an older spec and must never be promoted.
		for i := range runner.Status.Revisions {
			rev := &runner.Status.Revisions[i]
			if rev.Phase == v1alpha1.DevboxRevisionBuilding || rev.Phase == v1alpha1.DevboxRevisionProbing {
				rev.Phase = v1alpha1.DevboxRevisionRetired
				rev.Message = lo.ToPtr(fmt.Sprintf("superseded by revision %d", next))
				if err := r.Probe.Cleanup(ctx, runner.Name, rev.Revision); err != nil {
					return err
				}
			}
		}
		rev := v1alpha1.DevboxRevision{
			Revision:      next,
			Name:          name,
			Hash:          hash,
			Image:         image,
			Runtime:       &runtime,
			DaemonVersion: runner.Status.DaemonVersion,
			Phase:         v1alpha1.DevboxRevisionBuilding,
			CreatedAt:     lo.ToPtr(metav1.Now()),
		}
		if latest != nil && latest.Hash == hash && strings.HasPrefix(lo.FromPtr(latest.Message), devboxHomeSeedRebuild) {
			rev.Message = new(devboxHomeSeedRebuilt)
		}
		if storage := runner.Spec.HomeStorage(); storage != v1alpha1.DevboxHomeSnapshot {
			rev.HomeStorage = &storage
			rev.HomeStorageClass = new(runner.Spec.HomeStorageClass())
			rev.HomeSize = new(runner.Spec.HomeSize())
		}
		runner.Status.Revisions = append([]v1alpha1.DevboxRevision{rev}, runner.Status.Revisions...)
	}

	for i := range runner.Status.Revisions {
		rev := &runner.Status.Revisions[i]
		switch rev.Phase {
		case v1alpha1.DevboxRevisionBuilding:
			if err := r.advanceBuilding(ctx, api, runner, atespace, rev); err != nil {
				return err
			}
		case v1alpha1.DevboxRevisionProbing:
			if err := r.advanceProbing(ctx, runner, atespace, rev); err != nil {
				return err
			}
		}
	}

	r.promoteCurrentRevision(runner)
	return nil
}

func (r *DevboxRunnerReconciler) advanceBuilding(ctx context.Context, api substrate.API, runner *v1alpha1.DevboxRunner, atespace string, rev *v1alpha1.DevboxRevision) error {
	tmpl, err := api.GetActorTemplate(ctx, atespace, rev.Name)
	if substrate.IsNotFound(err) {
		rev.Phase = v1alpha1.DevboxRevisionFailed
		rev.Message = lo.ToPtr("ActorTemplate no longer exists in Substrate")
		return nil
	}
	if err != nil {
		return fmt.Errorf("getting ActorTemplate %s: %w", rev.Name, err)
	}

	// The gateway claims the golden boot's home for this seed while the boot runs.
	if rev.HomeStorageClass != nil && rev.HomeSeed == nil {
		rev.HomeSeed = new(devboxGoldenHomeSeed(tmpl.GetMetadata().GetUid()))
	}

	golden := tmpl.GetStatus().GetGoldenSnapshotStatus()
	if msg := golden.GetErrorMessage(); msg != "" {
		if goldenLostWorker(msg) {
			rev.Phase = v1alpha1.DevboxRevisionRetired
			rev.Message = lo.ToPtr("golden boot lost its worker, rebuilding: " + msg)
			return nil
		}
		rev.Phase = v1alpha1.DevboxRevisionFailed
		rev.Message = lo.ToPtr("golden boot failed: " + msg + goldenFailureHint(runner, msg))
		return nil
	}
	tag := golden.GetGoldenTag().GetName()
	if tag == "" {
		return nil
	}

	rev.GoldenTag = &tag
	rev.Phase = v1alpha1.DevboxRevisionProbing
	return r.Probe.Request(ctx, probeRequest(runner, atespace, rev))
}

// goldenWorkerLossCrashes are Substrate's fixed actor crash messages for losing the worker or node, not a fault of
// the image, so a golden boot that failed with one is rebuilt rather than failing the revision.
var goldenWorkerLossCrashes = []string{
	"worker pod went away while hosting the actor",
	"worker restarted while hosting the actor",
	"assigned worker is draining",
	"assigned worker no longer satisfies the actor's placement constraints",
	"node holding the actor's latest snapshot no longer exists",
}

// goldenFailureHint explains the golden boot failures that come from the environment image not being able to
// start the daemon the runtime sidecar installs.
func goldenFailureHint(runner *v1alpha1.DevboxRunner, msg string) string {
	shell := runner.RuntimeShell()
	switch {
	// Substrate v1.0.0 reports a command that can't be executed only as the devbox container failing to start
	// ("while starting \"devbox\" application container: while running `runsc start`: exit status 128").
	case strings.Contains(msg, `while starting "`+devboxContainerName+`" application container`),
		strings.Contains(msg, shell) && (strings.Contains(msg, "no such file") || strings.Contains(msg, "not found")):
		return fmt.Sprintf("; the devbox container could not start, most likely because the environment image has no POSIX shell at %s (set spec.runtime.shell if it is elsewhere)", shell)
	case strings.Contains(msg, "plural runtime"):
		return "; the " + runtimeContainerName + " container did not install devbox-daemon and the agents into the home volume in time"
	}
	return ""
}

// devboxHomeSeedRebuild starts the message of a revision retired because its golden home wasn't captured, and
// devboxHomeSeedRebuilt the message of the revision built again for it, whose own miss fails instead of rebuilding
// forever.
const (
	devboxHomeSeedRebuild = "the golden boot's home wasn't captured, rebuilding: "
	devboxHomeSeedRebuilt = "rebuilt because the golden boot's home of the previous revision wasn't captured"
)

func goldenLostWorker(msg string) bool {
	return lo.SomeBy(goldenWorkerLossCrashes, func(crash string) bool { return strings.Contains(msg, crash) })
}

func probeRequest(runner *v1alpha1.DevboxRunner, atespace string, rev *v1alpha1.DevboxRevision) DevboxProbeRequest {
	return DevboxProbeRequest{
		Request: probe.Request{
			Runner:        runner.Name,
			Atespace:      atespace,
			ActorTemplate: rev.Name,
			Revision:      rev.Revision,
			GoldenTag:     lo.FromPtr(rev.GoldenTag),
			ExternalHome:  lo.FromPtr(rev.HomeStorage).External(),
			HomeSeed:      lo.FromPtr(rev.HomeSeed),
			HomeStorage:   string(lo.FromPtr(rev.HomeStorage)),
			HomeBytes:     devboxHomeBytes(rev),
			DevboxID:      lo.FromPtr(runner.Status.ID),
		},
		Agents: devboxGuestAgents(runner),
	}
}

// devboxHomeBytes is the capacity of a revision's external home, zero for homes the golden tag carries.
func devboxHomeBytes(rev *v1alpha1.DevboxRevision) int64 {
	if rev.HomeSize == nil {
		return 0
	}
	return rev.HomeSize.Value()
}

func (r *DevboxRunnerReconciler) advanceProbing(ctx context.Context, runner *v1alpha1.DevboxRunner, atespace string, rev *v1alpha1.DevboxRevision) error {
	// Idempotent, so a request deleted by hand is recreated.
	if err := r.Probe.Request(ctx, probeRequest(runner, atespace, rev)); err != nil {
		return err
	}
	result, err := r.Probe.Result(ctx, runner.Name, rev.Revision)
	if err != nil || result == nil {
		return err
	}

	// The gateway didn't claim the golden boot's home before Substrate deleted it, so no instance can start on
	// this revision: build it again, once.
	if strings.Contains(result.Error, probe.ErrHomeSeedMissing) && !strings.HasPrefix(lo.FromPtr(rev.Message), devboxHomeSeedRebuilt) {
		rev.Phase = v1alpha1.DevboxRevisionRetired
		rev.Message = new(devboxHomeSeedRebuild + result.Error)
		return r.Probe.Cleanup(ctx, runner.Name, rev.Revision)
	}

	evaluation := EvaluateDevboxProbe(runner, result)
	if !evaluation.OK() {
		rev.Phase = v1alpha1.DevboxRevisionFailed
		rev.Message = lo.ToPtr(evaluation.Message())
		utils.MarkCondition(runner.SetCondition, v1alpha1.DevboxAgentProbeConditionType, metav1.ConditionFalse, v1alpha1.DevboxAgentMissingReason,
			fmt.Sprintf("revision %d: %s", rev.Revision, evaluation.Message()))
		return r.Probe.Cleanup(ctx, runner.Name, rev.Revision)
	}

	// The result of a Ready revision is kept: it is the catalog upserted to console while the revision serves.
	if err := r.Probe.ReleaseToken(ctx, runner.Name, rev.Revision); err != nil {
		return err
	}
	rev.Phase = v1alpha1.DevboxRevisionReady
	rev.Message = nil
	if len(evaluation.Warnings) > 0 {
		utils.MarkCondition(runner.SetCondition, v1alpha1.DevboxAgentProbeConditionType, metav1.ConditionTrue, v1alpha1.DevboxAgentProbeWarningReason,
			strings.Join(evaluation.Warnings, "; "))
	} else {
		utils.MarkCondition(runner.SetCondition, v1alpha1.DevboxAgentProbeConditionType, metav1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	}
	return nil
}

// promoteCurrentRevision points status at the newest Ready revision and retires older Ready ones.
func (r *DevboxRunnerReconciler) promoteCurrentRevision(runner *v1alpha1.DevboxRunner) {
	var current *v1alpha1.DevboxRevision
	for i := range runner.Status.Revisions {
		rev := &runner.Status.Revisions[i]
		if rev.Phase == v1alpha1.DevboxRevisionReady && (current == nil || rev.Revision > current.Revision) {
			current = rev
		}
	}
	for i := range runner.Status.Revisions {
		rev := &runner.Status.Revisions[i]
		if current != nil && rev.Phase == v1alpha1.DevboxRevisionReady && rev.Revision < current.Revision {
			rev.Phase = v1alpha1.DevboxRevisionRetired
		}
	}

	latest := runner.LatestRevision()
	switch {
	case current != nil && latest.Revision == current.Revision:
		utils.MarkCondition(runner.SetCondition, v1alpha1.DevboxTemplateReadyConditionType, metav1.ConditionTrue, v1alpha1.ReadyConditionReason,
			fmt.Sprintf("revision %d (%s) is serving", current.Revision, current.Name))
	case latest.Phase == v1alpha1.DevboxRevisionFailed:
		msg := fmt.Sprintf("revision %d failed: %s", latest.Revision, lo.FromPtr(latest.Message))
		if current != nil {
			msg += fmt.Sprintf("; revision %d keeps serving", current.Revision)
		}
		utils.MarkCondition(runner.SetCondition, v1alpha1.DevboxTemplateReadyConditionType, metav1.ConditionFalse, v1alpha1.DevboxFailedReason, msg)
	default:
		msg := fmt.Sprintf("revision %d is %s", latest.Revision, strings.ToLower(string(latest.Phase)))
		if current != nil {
			msg += fmt.Sprintf("; revision %d keeps serving", current.Revision)
		}
		utils.MarkCondition(runner.SetCondition, v1alpha1.DevboxTemplateReadyConditionType, metav1.ConditionFalse, v1alpha1.DevboxPendingReason, msg)
	}

	if current == nil {
		return
	}
	runner.Status.TemplateRevision = &current.Revision
	runner.Status.TemplateName = &current.Name
}

// gcRevisions deletes Retired and Failed revisions that no actor or tag references. Substrate is the source of
// truth for references: each instance is an actor of a template, and each snapshot is a tag whose status
// records the template UID. A revision's own golden tag does not count, and is deleted with it. The newest
// revision is always kept, since its hash is what stops a failed spec from being rebuilt on every reconcile.
// An instance that was moved to another revision and hasn't started there yet references two: the template its
// actor points at, and the one it had, which the gateway moves it back to if it doesn't start. The second is only
// in the gateway's instance record (see pendingRollbackTemplates).
func (r *DevboxRunnerReconciler) gcRevisions(ctx context.Context, api substrate.API, runner *v1alpha1.DevboxRunner, atespace string) error {
	latest := runner.LatestRevision()
	collectable := lo.Filter(runner.Status.Revisions, func(rev v1alpha1.DevboxRevision, _ int) bool {
		if latest != nil && rev.Revision == latest.Revision {
			return false
		}
		return rev.Phase == v1alpha1.DevboxRevisionRetired || rev.Phase == v1alpha1.DevboxRevisionFailed
	})
	if len(collectable) == 0 {
		return nil
	}

	referenced, err := r.referencedTemplates(ctx, api, atespace, runner)
	if err != nil {
		return err
	}

	var deleted []int64
	for _, rev := range collectable {
		if referenced[rev.Name] {
			continue
		}
		if rev.GoldenTag != nil {
			if err := api.DeleteTag(ctx, atespace, *rev.GoldenTag); err != nil {
				return fmt.Errorf("deleting golden tag %s: %w", *rev.GoldenTag, err)
			}
		}
		if err := api.DeleteActorTemplate(ctx, atespace, rev.Name); err != nil {
			return fmt.Errorf("deleting ActorTemplate %s: %w", rev.Name, err)
		}
		if lo.FromPtr(rev.HomeStorage).External() && rev.HomeStorageClass == nil {
			if err := r.deleteLegacyHomeStorageClass(ctx, atespace, rev.Name); err != nil {
				return err
			}
		}
		if err := r.Probe.Cleanup(ctx, runner.Name, rev.Revision); err != nil {
			return err
		}
		deleted = append(deleted, rev.Revision)
	}

	runner.Status.Revisions = lo.Filter(runner.Status.Revisions, func(rev v1alpha1.DevboxRevision, _ int) bool {
		return !lo.Contains(deleted, rev.Revision)
	})
	return nil
}

func (r *DevboxRunnerReconciler) referencedTemplates(ctx context.Context, api substrate.API, atespace string, runner *v1alpha1.DevboxRunner) (map[string]bool, error) {
	referenced := map[string]bool{}

	templates, err := api.ListActorTemplates(ctx, atespace)
	if err != nil {
		return nil, fmt.Errorf("listing ActorTemplates: %w", err)
	}
	nameByUID := map[string]string{}
	for _, t := range templates {
		nameByUID[t.GetMetadata().GetUid()] = t.GetMetadata().GetName()
	}

	actors, err := api.ListActors(ctx, atespace)
	if err != nil {
		return nil, fmt.Errorf("listing actors: %w", err)
	}
	for _, actor := range actors {
		// Substrate names a template's golden actor after the template's UID and deletes it with the template, so
		// it is no reference: counting it would keep a stuck golden boot holding a worker slot forever.
		if nameByUID[actor.GetMetadata().GetName()] == actor.GetActorTemplate().GetName() {
			continue
		}
		referenced[actor.GetActorTemplate().GetName()] = true
	}

	goldenTags := map[string]bool{}
	for _, rev := range runner.Status.Revisions {
		if rev.GoldenTag != nil {
			goldenTags[*rev.GoldenTag] = true
		}
	}
	rollbacks, err := r.pendingRollbackTemplates(ctx, runner)
	if err != nil {
		return nil, err
	}
	for _, name := range rollbacks {
		referenced[name] = true
	}

	tags, err := api.ListTags(ctx, atespace)
	if err != nil {
		return nil, fmt.Errorf("listing tags: %w", err)
	}
	for _, tag := range tags {
		if goldenTags[tag.GetMetadata().GetName()] {
			continue
		}
		if name, ok := nameByUID[tag.GetStatus().GetActorTemplateUid()]; ok {
			referenced[name] = true
		}
	}
	return referenced, nil
}

// pendingRollbackTemplates are the templates the runner's instances would be moved back to if they don't start on
// the revision they were moved to. The gateway keeps that in each instance's record (gateway/core.Record.Rebase,
// of which this reads the two fields it needs), written before it repoints the actor and cleared once the
// instance has started on the new revision.
func (r *DevboxRunnerReconciler) pendingRollbackTemplates(ctx context.Context, runner *v1alpha1.DevboxRunner) ([]string, error) {
	var records corev1.ConfigMapList
	if err := r.List(ctx, &records, client.InNamespace(r.Config.OperatorNamespace), client.MatchingLabels{v1alpha1.DevboxInstanceRecordLabel: "true"}); err != nil {
		return nil, fmt.Errorf("listing devbox instance records: %w", err)
	}
	var out []string
	for i := range records.Items {
		var rec struct {
			Runner string `json:"runner"`
			Rebase *struct {
				FromTemplate string `json:"fromTemplate"`
			} `json:"rebase"`
		}
		if err := json.Unmarshal([]byte(records.Items[i].Data[v1alpha1.DevboxInstanceRecordKey]), &rec); err != nil {
			continue
		}
		if rec.Runner == runner.Name && rec.Rebase != nil && rec.Rebase.FromTemplate != "" {
			out = append(out, rec.Rebase.FromTemplate)
		}
	}
	return out, nil
}

// runningActors counts actors that are not suspended or crashed, i.e. instances a delete would interrupt.
func runningActors(actors []*ateapi.Actor) []*ateapi.Actor {
	return lo.Filter(actors, func(a *ateapi.Actor, _ int) bool {
		switch a.GetStatus().GetState() {
		case ateapi.ActorState_ACTOR_STATE_RESUMING, ateapi.ActorState_ACTOR_STATE_RUNNING, ateapi.ActorState_ACTOR_STATE_SUSPENDING:
			return true
		}
		return false
	})
}
