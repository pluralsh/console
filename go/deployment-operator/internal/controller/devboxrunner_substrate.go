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

	"github.com/samber/lo"
	appsv1 "k8s.io/api/apps/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/internal/utils"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/probe"
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
	devboxContainerName = "devbox"
	devboxHomeVolume    = "home"
	devboxTrustVolume   = "egress-trust"
	devboxActorVolume   = "actor-metadata"
	// devboxEgressTrustMount is the first of the daemon's DefaultEgressCAGlobs.
	devboxEgressTrustMount = "/run/ate/egress-trust-bundle"
	devboxActorMetaMount   = "/run/ate/actor"
	devboxReadyzPort       = 80
	// devboxRunnerConfigEnv carries the runner config the daemon applies during the golden boot.
	devboxRunnerConfigEnv = "DEVBOX_RUNNER_CONFIG"
	// substrateEnvValueLimit is Substrate's per-value env limit.
	substrateEnvValueLimit = 32 * 1024
	// dns1123Limit bounds atespace, template and WorkerPool names.
	dns1123Limit = 63
)

// DevboxRunnerGuestConfig is DEVBOX_RUNNER_CONFIG, the part of the runner spec the daemon applies inside the
// guest during the golden boot. Everything else (allowlist, identities, idle policy) is enforced by the gateway
// and console, so changing it does not roll a new template revision.
type DevboxRunnerGuestConfig struct {
	Runner          string                 `json:"runner"`
	BootstrapScript string                 `json:"bootstrapScript,omitempty"`
	Mise            string                 `json:"mise,omitempty"`
	Browser         bool                   `json:"browser"`
	Agents          []DevboxGuestAgentSpec `json:"agents"`
}

type DevboxGuestAgentSpec struct {
	Type           v1alpha1.DevboxAgentType `json:"type"`
	Default        bool                     `json:"default"`
	AdapterVersion string                   `json:"adapterVersion,omitempty"`
	Models         []string                 `json:"models,omitempty"`
	DefaultModel   string                   `json:"defaultModel,omitempty"`
	ACPV2          bool                     `json:"acpV2"`
}

func devboxGuestAgents(runner *v1alpha1.DevboxRunner) []DevboxGuestAgentSpec {
	return lo.Map(runner.Spec.Agents, func(a v1alpha1.DevboxAgent, _ int) DevboxGuestAgentSpec {
		return DevboxGuestAgentSpec{
			Type:           a.Type,
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

// buildActorTemplate renders the immutable ActorTemplate for the runner's current spec and resolved image.
// The returned hash covers everything but the template name, and keys the revision.
func (r *DevboxRunnerReconciler) buildActorTemplate(runner *v1alpha1.DevboxRunner, atespace, image string) (*ateapi.ActorTemplate, string, error) {
	guest := DevboxRunnerGuestConfig{
		Runner:  runner.ConsoleName(),
		Browser: runner.Spec.Browser != nil && runner.Spec.Browser.Enabled,
		Agents:  devboxGuestAgents(runner),
	}
	guest.BootstrapScript = lo.FromPtr(runner.Spec.BootstrapScript)
	if runner.Spec.Mise != nil {
		guest.Mise = lo.FromPtr(runner.Spec.Mise.Config)
	}
	guestJSON, err := json.Marshal(guest)
	if err != nil {
		return nil, "", err
	}
	if len(guestJSON) > substrateEnvValueLimit {
		return nil, "", fmt.Errorf("bootstrapScript, mise and agents add up to %d bytes, over Substrate's %d byte env limit", len(guestJSON), substrateEnvValueLimit)
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
			Env:   append([]*ateapi.EnvVar{{Name: devboxRunnerConfigEnv, Value: string(guestJSON)}}, devboxPlainEnv(runner)...),
			WakeupProbe: &ateapi.WakeupProbe{
				HttpGet:        &ateapi.HttpGetAction{Path: "/readyz", Port: devboxReadyzPort},
				TimeoutSeconds: 120,
			},
			VolumeMounts: []*ateapi.VolumeMount{
				{Name: devboxHomeVolume, MountPath: "/home/dev"},
				{Name: devboxTrustVolume, MountPath: devboxEgressTrustMount},
				{Name: devboxActorVolume, MountPath: devboxActorMetaMount},
			},
			SecurityContext: &ateapi.SecurityContext{Capabilities: &ateapi.Capabilities{Add: devboxCapabilities}},
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

// devboxHomeVolumeSource is /home/dev: a durable dir carried in the instance's snapshots, or a JuiceFS volume
// whose quota is the home's size. A JuiceFS home names the runner's StorageClass here, which keys the template
// hash; ensureHomeStorageClass swaps in the revision's own class once the template is named.
func devboxHomeVolumeSource(runner *v1alpha1.DevboxRunner) *ateapi.Volume {
	if runner.Spec.HomeStorage() != v1alpha1.DevboxHomeJuiceFS {
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

// devboxGoldenEgressPolicy lets the golden boot reach what the bootstrap script and mise need: the runner's
// package servers, OCI registries and HTTP allowlist plus mise's own download hosts. Without customization the golden boot needs
// no egress.
func devboxGoldenEgressPolicy(runner *v1alpha1.DevboxRunner) *ateapi.EgressPolicyTemplate {
	hasMise := runner.Spec.Mise != nil && lo.FromPtr(runner.Spec.Mise.Config) != ""
	if lo.FromPtr(runner.Spec.BootstrapScript) == "" && !hasMise {
		return nil
	}

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
		rules = append(rules, &ateapi.EgressRule{Https: &ateapi.HttpsRule{
			Hostnames: lo.Uniq(https[port]), Ports: &ateapi.Ports{Numbers: []int32{port}},
		}})
	}
	rules = append(rules, passthrough...)
	if len(rules) == 0 {
		return nil
	}
	return &ateapi.EgressPolicyTemplate{Rules: rules}
}

// reconcileRevisions creates a new ActorTemplate revision when the template hash changes, then advances every
// in-flight revision: Building (waiting for the golden tag), Probing (waiting for the gateway's agent probe),
// and finally Ready or Failed. The newest Ready revision is the one new instances start from; older Ready
// revisions are Retired and kept until garbage collection finds nothing references them.
func (r *DevboxRunnerReconciler) reconcileRevisions(ctx context.Context, api substrate.API, runner *v1alpha1.DevboxRunner, atespace, image string) error {
	template, hash, err := r.buildActorTemplate(runner, atespace, image)
	if err != nil {
		utils.MarkCondition(runner.SetCondition, v1alpha1.DevboxTemplateReadyConditionType, metav1.ConditionFalse, v1alpha1.DevboxMisconfiguredReason, err.Error())
		return err
	}

	latest := runner.LatestRevision()
	// The latest revision is only Retired without a newer one when its golden boot lost its worker.
	if latest == nil || latest.Hash != hash || latest.Phase == v1alpha1.DevboxRevisionRetired {
		next := int64(1)
		if latest != nil {
			next = latest.Revision + 1
		}
		name := devboxTemplateName(runner, next)
		template.Metadata.Name = name
		if err := r.ensureHomeStorageClass(ctx, runner, template); err != nil {
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
			Revision:  next,
			Name:      name,
			Hash:      hash,
			Image:     image,
			Phase:     v1alpha1.DevboxRevisionBuilding,
			CreatedAt: lo.ToPtr(metav1.Now()),
		}
		if storage := runner.Spec.HomeStorage(); storage != v1alpha1.DevboxHomeSnapshot {
			rev.HomeStorage = &storage
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

	golden := tmpl.GetStatus().GetGoldenSnapshotStatus()
	if msg := golden.GetErrorMessage(); msg != "" {
		if goldenLostWorker(msg) {
			rev.Phase = v1alpha1.DevboxRevisionRetired
			rev.Message = lo.ToPtr("golden boot lost its worker, rebuilding: " + msg)
			return nil
		}
		rev.Phase = v1alpha1.DevboxRevisionFailed
		rev.Message = lo.ToPtr("golden boot failed: " + msg)
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
			JuiceFSHome:   lo.FromPtr(rev.HomeStorage) == v1alpha1.DevboxHomeJuiceFS,
			DevboxID:      lo.FromPtr(runner.Status.ID),
		},
		Agents: devboxGuestAgents(runner),
	}
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
		if rev.HomeStorage != nil && *rev.HomeStorage == v1alpha1.DevboxHomeJuiceFS {
			if err := r.deleteHomeStorageClass(ctx, atespace, rev.Name); err != nil {
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
