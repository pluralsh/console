package v1alpha1

import (
	"strings"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

const (
	// DevboxRunnerNameLabel marks every Kubernetes object the operator manages for a runner.
	DevboxRunnerNameLabel = "devboxes.plural.sh/runner"

	// DevboxImageContractLabel is the image label carrying the contract version (section 4.1a).
	DevboxImageContractLabel = "sh.plural.devbox/contract"
	// DevboxImageDaemonVersionLabel is the image label carrying the bundled devbox-daemon version.
	DevboxImageDaemonVersionLabel = "sh.plural.devbox/daemon-version"
	// DevboxImageFlavorLabel is the image label naming the base flavor (minimal, fat).
	DevboxImageFlavorLabel = "sh.plural.devbox/flavor"
	// DevboxImageContractV1 is the only contract version this operator understands.
	DevboxImageContractV1 = "v1"
)

const (
	DevboxImageResolvedConditionType    ConditionType = "ImageResolved"
	DevboxImageContractConditionType    ConditionType = "ImageContract"
	DevboxImageOutdatedConditionType    ConditionType = "ImageOutdated"
	DevboxWorkerPoolReadyConditionType  ConditionType = "WorkerPoolReady"
	DevboxTemplateReadyConditionType    ConditionType = "TemplateReady"
	DevboxAgentProbeConditionType       ConditionType = "AgentProbe"
	DevboxGatewayReadyConditionType     ConditionType = "GatewayReady"
	DevboxSubstrateInstallConditionType ConditionType = "SubstrateInstall"
	DevboxDrainingConditionType         ConditionType = "Draining"
	// DevboxEnvConditionType is False while a secret env var can't be resolved; instances start without it.
	DevboxEnvConditionType ConditionType = "Env"
)

const (
	DevboxImageContractViolatedReason ConditionReason = "ContractViolated"
	DevboxImageOutdatedReason         ConditionReason = "Outdated"
	DevboxImageCurrentReason          ConditionReason = "Current"
	DevboxPendingReason               ConditionReason = "Pending"
	DevboxFailedReason                ConditionReason = "Failed"
	DevboxAgentMissingReason          ConditionReason = "AgentMissing"
	DevboxAgentProbeWarningReason     ConditionReason = "AgentProbeWarning"
	DevboxMisconfiguredReason         ConditionReason = "Misconfigured"
	DevboxSnapshotsRemainReason       ConditionReason = "SnapshotsRemain"
	DevboxInstancesRunningReason      ConditionReason = "InstancesRunning"
)

// DevboxAgentType is a coding-agent harness a devbox can run (section 4.2a).
// +kubebuilder:validation:Enum=claude;codex;opencode;gemini;pi
type DevboxAgentType string

const (
	DevboxAgentClaude   DevboxAgentType = "claude"
	DevboxAgentCodex    DevboxAgentType = "codex"
	DevboxAgentOpencode DevboxAgentType = "opencode"
	DevboxAgentGemini   DevboxAgentType = "gemini"
	DevboxAgentPi       DevboxAgentType = "pi"
)

// DevboxImageUpdateMode controls whether the operator re-resolves spec.image.
// +kubebuilder:validation:Enum=pinned;poll
type DevboxImageUpdateMode string

const (
	// DevboxImageUpdatePinned keeps the resolved digest until the spec changes.
	DevboxImageUpdatePinned DevboxImageUpdateMode = "pinned"
	// DevboxImageUpdatePoll re-resolves the tag every interval and rolls a new revision when the digest changes.
	DevboxImageUpdatePoll DevboxImageUpdateMode = "poll"
)

// DevboxSandboxClass is the Substrate sandbox class backing the runner's WorkerPool.
// +kubebuilder:validation:Enum=gvisor;microvm
type DevboxSandboxClass string

const (
	DevboxSandboxGVisor  DevboxSandboxClass = "gvisor"
	DevboxSandboxMicroVM DevboxSandboxClass = "microvm"
)

// DevboxRevisionPhase is the lifecycle of one ActorTemplate revision.
type DevboxRevisionPhase string

const (
	// DevboxRevisionBuilding means the ActorTemplate exists and its golden snapshot is not ready yet.
	DevboxRevisionBuilding DevboxRevisionPhase = "Building"
	// DevboxRevisionProbing means the golden snapshot is ready and the agent probe is running.
	DevboxRevisionProbing DevboxRevisionPhase = "Probing"
	// DevboxRevisionReady means the revision passed the probe and may serve new instances.
	DevboxRevisionReady DevboxRevisionPhase = "Ready"
	// DevboxRevisionFailed is terminal: the golden boot, image contract or agent probe failed.
	DevboxRevisionFailed DevboxRevisionPhase = "Failed"
	// DevboxRevisionRetired means a newer revision is current; the revision stays until nothing references it.
	DevboxRevisionRetired DevboxRevisionPhase = "Retired"
)

// DevboxRunnerSpec defines the desired state of DevboxRunner.
type DevboxRunnerSpec struct {
	// Name of the Devbox in console. Defaults to metadata.name.
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// Image is the devbox image. Defaults to ghcr.io/pluralsh/devbox-fat at the operator's version;
	// ghcr.io/pluralsh/devbox-minimal is the lean alternative. Custom images must meet the image
	// contract (sh.plural.devbox/contract=v1 label, devbox-daemon entrypoint, UID 1000) and are
	// normally built FROM one of these.
	// +kubebuilder:validation:Optional
	Image *string `json:"image,omitempty"`

	// ImageUpdatePolicy controls re-resolution of spec.image. Defaults to pinned for digest
	// references and to poll every hour for tag references.
	// +kubebuilder:validation:Optional
	ImageUpdatePolicy *DevboxImageUpdatePolicy `json:"imageUpdatePolicy,omitempty"`

	// ImagePullSecrets are dockerconfigjson secrets used only to resolve spec.image to a digest.
	// Nodes pull with their own credentials (Substrate's image credential provider).
	// +kubebuilder:validation:Optional
	ImagePullSecrets []corev1.SecretReference `json:"imagePullSecrets,omitempty"`

	// Agents are the coding-agent harnesses this devbox supports. Exactly one must be the default.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:MinItems=1
	// +kubebuilder:validation:MaxItems=5
	// +listType=map
	// +listMapKey=type
	// +kubebuilder:validation:XValidation:rule="self.filter(a, has(a.default) && a.default).size() == 1",message="exactly one agent must be marked default"
	Agents []DevboxAgent `json:"agents"`

	// Resources are the per-instance limits.
	// +kubebuilder:validation:Optional
	Resources *DevboxResources `json:"resources,omitempty"`

	// WorkerPool sizes the Substrate WorkerPool backing this runner.
	// +kubebuilder:validation:Optional
	WorkerPool *DevboxWorkerPool `json:"workerPool,omitempty"`

	// ScmConnections are names of console SCM connections instances may use for git credentials.
	// +kubebuilder:validation:Optional
	ScmConnections []string `json:"scmConnections,omitempty"`

	// AllowedRepositories the git repositories allowed to be used with this devbox,
	// with the same semantics as AgentRuntime.spec.allowedRepositories.
	// +kubebuilder:validation:Optional
	AllowedRepositories []string `json:"allowedRepositories,omitempty"`

	// HTTPAllowlist are extra hosts instances may reach, on top of the built-in ones.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:MaxItems=256
	HTTPAllowlist []DevboxHTTPAllowlistEntry `json:"httpAllowlist,omitempty"`

	// PackageServers opens egress to public package registries by ecosystem. Go, Rust, JavaScript, Java, Elixir
	// and Python are on unless set to false.
	// +kubebuilder:validation:Optional
	// +kubebuilder:default={}
	PackageServers *DevboxPackageServers `json:"packageServers,omitempty"`

	// CloudProviders opens egress to cloud providers' API endpoints. A provider is on when the runner has a cloud
	// identity for it, unless set to false.
	// +kubebuilder:validation:Optional
	// +kubebuilder:default={}
	CloudProviders *DevboxCloudProviders `json:"cloudProviders,omitempty"`

	// Env are environment variables for every process the box starts: agents, terminals and git. Plain values
	// are part of the template, so changing them rolls a new revision. Secret values are read when an instance
	// wakes and are never baked into the template, the golden snapshot or the workspace volume.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:MaxItems=128
	// +listType=map
	// +listMapKey=name
	Env []DevboxEnvVar `json:"env,omitempty"`

	// Browser enables the in-box headless browser.
	// +kubebuilder:validation:Optional
	Browser *DevboxBrowser `json:"browser,omitempty"`

	// BootstrapScript runs once during the golden boot, so its results are baked into the snapshot.
	// +kubebuilder:validation:Optional
	BootstrapScript *string `json:"bootstrapScript,omitempty"`

	// Mise is an inline mise.toml installed during the golden boot.
	// +kubebuilder:validation:Optional
	Mise *MiseSpec `json:"mise,omitempty"`

	// IdlePolicy bounds idle suspension. Workbenches can only lower these values.
	// +kubebuilder:validation:Optional
	IdlePolicy *DevboxIdlePolicy `json:"idlePolicy,omitempty"`

	// Autonomy sets how agents' permission requests are answered: the level new threads start at and the highest
	// level users can switch a thread to. Defaults to auto for both, so full autonomy needs an explicit max: full.
	// +kubebuilder:validation:Optional
	Autonomy *DevboxAutonomy `json:"autonomy,omitempty"`

	// CloudIdentities are named cloud identities instances can assume. At most one is the default.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:MaxItems=16
	// +listType=map
	// +listMapKey=name
	// +kubebuilder:validation:XValidation:rule="self.filter(i, has(i.default) && i.default).size() <= 1",message="at most one cloud identity can be marked default"
	CloudIdentities []DevboxCloudIdentity `json:"cloudIdentities,omitempty"`
}

type DevboxImageUpdatePolicy struct {
	// Mode is pinned or poll.
	// +kubebuilder:validation:Optional
	Mode *DevboxImageUpdateMode `json:"mode,omitempty"`

	// Interval between re-resolutions in poll mode. Defaults to 1h.
	// +kubebuilder:validation:Optional
	Interval *metav1.Duration `json:"interval,omitempty"`
}

// DevboxAgent declares one supported harness.
// +kubebuilder:validation:XValidation:rule="!has(self.defaultModel) || !has(self.models) || size(self.models) == 0 || self.defaultModel in self.models",message="defaultModel must be one of models"
type DevboxAgent struct {
	// Type of the harness.
	// +kubebuilder:validation:Required
	Type DevboxAgentType `json:"type"`

	// Default marks the agent used when a workbench doesn't pick one.
	// +kubebuilder:validation:Optional
	Default *bool `json:"default,omitempty"`

	// AdapterVersion pins the ACP adapter version. Defaults to the version shipped in the image.
	// +kubebuilder:validation:Optional
	AdapterVersion *string `json:"adapterVersion,omitempty"`

	// Models is an allowlist of model ids. Empty allows every model the agent reports.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:MaxItems=64
	Models []string `json:"models,omitempty"`

	// DefaultModel is the model new sessions start on.
	// +kubebuilder:validation:Optional
	DefaultModel *string `json:"defaultModel,omitempty"`

	// ACPV2 opts the harness into the ACP v2 protocol where the adapter supports it.
	// +kubebuilder:validation:Optional
	ACPV2 *bool `json:"acpV2,omitempty"`
}

type DevboxResources struct {
	// CPU limit per instance. When the WorkerPool has limits this is the minimum, and instances get an even share
	// of the worker's CPU.
	// +kubebuilder:validation:Optional
	// +kubebuilder:default="2"
	CPU *resource.Quantity `json:"cpu,omitempty"`

	// Memory limit per instance, a minimum in the same way as CPU.
	// +kubebuilder:validation:Optional
	// +kubebuilder:default="4Gi"
	Memory *resource.Quantity `json:"memory,omitempty"`

	// Disk is the size of the durable /home/dev workspace volume. Each instance slot is budgeted Disk plus Memory
	// for its own snapshot and Memory for each of the WorkerPool's SuspendedSnapshotsPerInstance.
	// +kubebuilder:validation:Optional
	// +kubebuilder:default="20Gi"
	Disk *resource.Quantity `json:"disk,omitempty"`
}

// DevboxWorkerPool is the Substrate WorkerPool the operator runs for the runner. Each worker is expected to have a
// node to itself (requests close to the node's allocatable), so the pool's limits and DiskSize describe one node.
//
// Instances are sized from the pool: the instances one worker hosts is the most that fit its CPU and memory
// limits and its DiskSize, given spec.resources as each instance's minimum, and every instance then gets an even
// share of the worker's CPU and memory. Substrate places instances by those limits, so a worker never hosts more
// instances than its disk was budgeted for.
// +kubebuilder:validation:XValidation:rule="!has(self.autoscaling) || !has(self.autoscaling.minReplicas) || self.autoscaling.minReplicas <= self.autoscaling.maxReplicas",message="autoscaling.minReplicas must not exceed maxReplicas"
type DevboxWorkerPool struct {
	// Replicas is the number of Substrate workers. Ignored when Autoscaling is set.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Minimum=0
	// +kubebuilder:default=1
	Replicas *int32 `json:"replicas,omitempty"`

	// Autoscaling lets the operator size the pool to demand: it keeps SpareInstances free instance slots and
	// removes only workers that host no instance.
	// +kubebuilder:validation:Optional
	Autoscaling *DevboxWorkerAutoscaling `json:"autoscaling,omitempty"`

	// DiskSize is the size of the disk backing /var/lib/ate on each worker's node (e.g. the devbox-nodes
	// catalog's data disk). Unset leaves disk out of instance sizing.
	// +kubebuilder:validation:Optional
	DiskSize *resource.Quantity `json:"diskSize,omitempty"`

	// DiskReservePercent of DiskSize is kept for the image cache and snapshot staging rather than budgeted to
	// instances.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Minimum=0
	// +kubebuilder:validation:Maximum=90
	// +kubebuilder:default=20
	DiskReservePercent *int32 `json:"diskReservePercent,omitempty"`

	// SuspendedSnapshotsPerInstance is how many suspended instances' snapshots each instance slot budgets disk
	// for. A suspended instance frees its slot at once, but its snapshot stays on the node until Substrate
	// detaches it (30 minutes by default), so heavy suspend and resume churn stacks snapshots on a full worker.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Minimum=0
	// +kubebuilder:validation:Maximum=10
	// +kubebuilder:default=1
	SuspendedSnapshotsPerInstance *int32 `json:"suspendedSnapshotsPerInstance,omitempty"`

	// AdditionalPools are existing Substrate WorkerPools this runner's instances may also run on. The operator
	// labels each with the runner's worker selector and removes the label when the pool leaves this list. They
	// should run the same sandbox class as the runner, and their free capacity counts toward SpareInstances.
	// +kubebuilder:validation:Optional
	// +listType=map
	// +listMapKey=name
	// +listMapKey=namespace
	AdditionalPools []DevboxWorkerPoolRef `json:"additionalPools,omitempty"`

	// MaxInstances caps concurrently running instances in console. Unset means unlimited.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Minimum=1
	MaxInstances *int32 `json:"maxInstances,omitempty"`

	// SandboxClass is the isolation technology. Immutable once the WorkerPool exists.
	// +kubebuilder:validation:Optional
	// +kubebuilder:default=gvisor
	// +kubebuilder:validation:XValidation:rule="self == oldSelf",message="sandboxClass is immutable"
	SandboxClass *DevboxSandboxClass `json:"sandboxClass,omitempty"`

	// SandboxConfig names a Substrate sandbox class ConfigMap (WorkerPool sandboxClasses[].configRef).
	// +kubebuilder:validation:Optional
	SandboxConfig *string `json:"sandboxConfig,omitempty"`

	// WorkerImage overrides the Substrate worker image configured on the operator for the sandbox class.
	// +kubebuilder:validation:Optional
	WorkerImage *string `json:"workerImage,omitempty"`

	// Resources of each worker pod.
	// +kubebuilder:validation:Optional
	Resources *corev1.ResourceRequirements `json:"resources,omitempty"`

	// +kubebuilder:validation:Optional
	NodeSelector map[string]string `json:"nodeSelector,omitempty"`

	// NodeAffinity scheduling rules for the worker pods (WorkerPool template.nodeAffinity).
	// +kubebuilder:validation:Optional
	NodeAffinity *corev1.NodeAffinity `json:"nodeAffinity,omitempty"`

	// +kubebuilder:validation:Optional
	Tolerations []corev1.Toleration `json:"tolerations,omitempty"`

	// PodAnnotations are added to the worker pods, e.g. karpenter.sh/do-not-disrupt. Keys in the ate.dev domain
	// are reserved by Substrate.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:XValidation:rule="self.all(key, !key.startsWith('ate.dev/') && !key.contains('.ate.dev/'))",message="ate.dev and its subdomains are reserved"
	PodAnnotations map[string]string `json:"podAnnotations,omitempty"`

	// +kubebuilder:validation:Optional
	PriorityClassName *string `json:"priorityClassName,omitempty"`
}

type DevboxWorkerAutoscaling struct {
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Minimum=0
	// +kubebuilder:default=1
	MinReplicas *int32 `json:"minReplicas,omitempty"`

	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Minimum=1
	MaxReplicas int32 `json:"maxReplicas"`

	// SpareInstances is how many free instance slots are kept across the runner's pools, so a resume doesn't
	// wait for a new worker (and node) to start.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Minimum=0
	// +kubebuilder:default=1
	SpareInstances *int32 `json:"spareInstances,omitempty"`

	// ScaleDownDelay is how long after the last scaling event idle workers are kept before being removed.
	// +kubebuilder:validation:Optional
	// +kubebuilder:default="10m"
	ScaleDownDelay *metav1.Duration `json:"scaleDownDelay,omitempty"`
}

type DevboxWorkerPoolRef struct {
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:MinLength=1
	Name string `json:"name"`

	// Namespace defaults to the namespace the operator runs devbox WorkerPools in.
	// +kubebuilder:validation:Optional
	// +kubebuilder:default=""
	Namespace string `json:"namespace"`
}

// DevboxCapacityStatus reports how instances are sized from the WorkerPool and how the autoscaler sees it.
type DevboxCapacityStatus struct {
	// InstancesPerWorker is how many instances one worker hosts at once.
	InstancesPerWorker int32 `json:"instancesPerWorker"`

	// LimitedBy is the worker resource (cpu, memory or disk) that bounds InstancesPerWorker.
	// +kubebuilder:validation:Optional
	LimitedBy *string `json:"limitedBy,omitempty"`

	// InstanceCPU and InstanceMemory are the limits each instance runs with.
	InstanceCPU    *resource.Quantity `json:"instanceCPU,omitempty"`
	InstanceMemory *resource.Quantity `json:"instanceMemory,omitempty"`

	// InstanceDisk is each instance's share of the worker's budgeted disk, when DiskSize is set.
	// +kubebuilder:validation:Optional
	InstanceDisk *resource.Quantity `json:"instanceDisk,omitempty"`

	// Workers are the managed pool's schedulable workers, DrainingWorkers those being removed.
	// +kubebuilder:validation:Optional
	Workers int32 `json:"workers,omitempty"`
	// +kubebuilder:validation:Optional
	DrainingWorkers int32 `json:"drainingWorkers,omitempty"`

	// RunningInstances are instances placed on the managed pool's schedulable workers.
	// +kubebuilder:validation:Optional
	RunningInstances int32 `json:"runningInstances,omitempty"`

	// AdditionalFreeInstances are the instance slots free on AdditionalPools.
	// +kubebuilder:validation:Optional
	AdditionalFreeInstances int32 `json:"additionalFreeInstances,omitempty"`

	// DesiredWorkers is the autoscaler's target for the managed pool.
	// +kubebuilder:validation:Optional
	DesiredWorkers *int32 `json:"desiredWorkers,omitempty"`

	// +kubebuilder:validation:Optional
	LastScaleTime *metav1.Time `json:"lastScaleTime,omitempty"`
}

type DevboxHTTPAllowlistEntry struct {
	// Host is a hostname or a *.suffix wildcard.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:MinLength=1
	Host string `json:"host"`

	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Minimum=1
	// +kubebuilder:validation:Maximum=65535
	// +kubebuilder:default=443
	Port *int32 `json:"port,omitempty"`

	// Passthrough tunnels TLS without interception (no credential injection or request authz).
	// +kubebuilder:validation:Optional
	Passthrough *bool `json:"passthrough,omitempty"`
}

// DevboxCloudProviders enables egress to each cloud's API endpoints (see CloudProviderHosts).
type DevboxCloudProviders struct {
	// AWS: the regional and global service endpoints under amazonaws.com and api.aws.
	// +kubebuilder:validation:Optional
	AWS *bool `json:"aws,omitempty"`

	// GCP: the Google APIs under googleapis.com and Google's OAuth endpoint.
	// +kubebuilder:validation:Optional
	GCP *bool `json:"gcp,omitempty"`

	// Azure: Resource Manager, Entra ID sign-in, Microsoft Graph, Key Vault and Storage.
	// +kubebuilder:validation:Optional
	Azure *bool `json:"azure,omitempty"`
}

// DevboxPackageServers enables egress to each ecosystem's public registries (see PackageServerHosts).
type DevboxPackageServers struct {
	// Go: proxy.golang.org and sum.golang.org.
	// +kubebuilder:validation:Optional
	// +kubebuilder:default=true
	Go *bool `json:"go,omitempty"`

	// Rust: crates.io and rustup's static.rust-lang.org.
	// +kubebuilder:validation:Optional
	// +kubebuilder:default=true
	Rust *bool `json:"rust,omitempty"`

	// JavaScript: the npm and yarn registries and nodejs.org.
	// +kubebuilder:validation:Optional
	// +kubebuilder:default=true
	JavaScript *bool `json:"javascript,omitempty"`

	// Java: Maven Central and the Gradle plugin portal and distributions.
	// +kubebuilder:validation:Optional
	// +kubebuilder:default=true
	Java *bool `json:"java,omitempty"`

	// Elixir: hex.pm and its package and build repositories.
	// +kubebuilder:validation:Optional
	// +kubebuilder:default=true
	Elixir *bool `json:"elixir,omitempty"`

	// Python: PyPI.
	// +kubebuilder:validation:Optional
	// +kubebuilder:default=true
	Python *bool `json:"python,omitempty"`

	// Ruby: rubygems.org.
	// +kubebuilder:validation:Optional
	Ruby *bool `json:"ruby,omitempty"`

	// PHP: Packagist.
	// +kubebuilder:validation:Optional
	PHP *bool `json:"php,omitempty"`

	// Dotnet: NuGet.
	// +kubebuilder:validation:Optional
	Dotnet *bool `json:"dotnet,omitempty"`
}

// +kubebuilder:validation:XValidation:rule="has(self.value) != has(self.valueFrom)",message="set exactly one of value and valueFrom"
type DevboxEnvVar struct {
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Pattern=`^[A-Za-z_][A-Za-z0-9_]*$`
	// +kubebuilder:validation:MaxLength=256
	// +kubebuilder:validation:XValidation:rule="!self.startsWith('DEVBOX_')",message="DEVBOX_ variables are reserved"
	Name string `json:"name"`

	// +kubebuilder:validation:Optional
	Value *string `json:"value,omitempty"`

	// +kubebuilder:validation:Optional
	ValueFrom *DevboxEnvVarSource `json:"valueFrom,omitempty"`
}

type DevboxEnvVarSource struct {
	// +kubebuilder:validation:Required
	SecretKeyRef DevboxSecretKeySelector `json:"secretKeyRef"`
}

type DevboxSecretKeySelector struct {
	// Namespace of the Secret; defaults to the operator's namespace.
	// +kubebuilder:validation:Optional
	Namespace *string `json:"namespace,omitempty"`

	// +kubebuilder:validation:Required
	// +kubebuilder:validation:MinLength=1
	Name string `json:"name"`

	// +kubebuilder:validation:Required
	// +kubebuilder:validation:MinLength=1
	Key string `json:"key"`
}

type DevboxBrowser struct {
	// +kubebuilder:validation:Optional
	Enabled bool `json:"enabled,omitempty"`
}

// DevboxAutonomyLevel is one of:
//   - manual: every permission request goes to a human.
//   - auto: the agent's own reviewer approves what it can (Claude's auto mode, Codex's guardian); the rest goes to
//     a human.
//   - full: everything is approved without asking.
//
// +kubebuilder:validation:Enum=manual;auto;full
type DevboxAutonomyLevel string

const (
	DevboxAutonomyManual DevboxAutonomyLevel = "manual"
	DevboxAutonomyAuto   DevboxAutonomyLevel = "auto"
	DevboxAutonomyFull   DevboxAutonomyLevel = "full"
)

// +kubebuilder:validation:XValidation:rule="!has(self.default) || !has(self.max) || (self.default == 'manual' || self.max == 'full' || self.default == self.max)",message="default must not be above max"
type DevboxAutonomy struct {
	// Default is the level new threads start at, lowered to max and to what the agent supports. Defaults to auto.
	// +kubebuilder:validation:Optional
	Default *DevboxAutonomyLevel `json:"default,omitempty"`

	// Max is the highest level a thread can use. Defaults to auto.
	// +kubebuilder:validation:Optional
	Max *DevboxAutonomyLevel `json:"max,omitempty"`
}

var autonomyRank = map[DevboxAutonomyLevel]int{DevboxAutonomyManual: 1, DevboxAutonomyAuto: 2, DevboxAutonomyFull: 3}

// AutonomyPolicy returns the effective policy: auto/auto when unset, with the default lowered to max.
func (in *DevboxRunnerSpec) AutonomyPolicy() (def, maxLevel DevboxAutonomyLevel) {
	def, maxLevel = DevboxAutonomyAuto, DevboxAutonomyAuto
	if in.Autonomy != nil {
		if in.Autonomy.Default != nil {
			def = *in.Autonomy.Default
		}
		if in.Autonomy.Max != nil {
			maxLevel = *in.Autonomy.Max
		}
	}
	if autonomyRank[def] > autonomyRank[maxLevel] {
		def = maxLevel
	}
	return def, maxLevel
}

type DevboxIdlePolicy struct {
	// ActivityWindow is how far back activity counts toward keeping an instance awake.
	// +kubebuilder:validation:Optional
	// +kubebuilder:default="2m"
	ActivityWindow *metav1.Duration `json:"activityWindow,omitempty"`

	// CPUThreshold is the CPU utilization above which an instance counts as active, e.g. "5%".
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Pattern=`^([0-9]|[1-9][0-9]|100)(\.[0-9]+)?%$`
	// +kubebuilder:default="5%"
	CPUThreshold *string `json:"cpuThreshold,omitempty"`

	// GracePeriod is how long an instance stays idle before it is suspended.
	// +kubebuilder:validation:Optional
	// +kubebuilder:default="5m"
	GracePeriod *metav1.Duration `json:"gracePeriod,omitempty"`

	// MaxDeferral bounds how long agents can defer a suspension.
	// +kubebuilder:validation:Optional
	// +kubebuilder:default="12h"
	MaxDeferral *metav1.Duration `json:"maxDeferral,omitempty"`

	// MaxContinuousAwake bounds how long an instance can stay awake.
	// +kubebuilder:validation:Optional
	// +kubebuilder:default="24h"
	MaxContinuousAwake *metav1.Duration `json:"maxContinuousAwake,omitempty"`

	// CompleteAfter is how long a suspended instance is kept before it is completed.
	// +kubebuilder:validation:Optional
	// +kubebuilder:default="336h"
	CompleteAfter *metav1.Duration `json:"completeAfter,omitempty"`
}

// DevboxCloudIdentity is one named cloud identity. Exactly one provider must be set.
// +kubebuilder:validation:XValidation:rule="[has(self.aws), has(self.gcp), has(self.azure)].filter(x, x).size() == 1",message="exactly one of aws, gcp or azure must be set"
type DevboxCloudIdentity struct {
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Pattern=`^[a-z0-9]([-a-z0-9]*[a-z0-9])?$`
	// +kubebuilder:validation:MaxLength=63
	Name string `json:"name"`

	// Default marks the identity instances get when a workbench doesn't pick one.
	// +kubebuilder:validation:Optional
	Default *bool `json:"default,omitempty"`

	// +kubebuilder:validation:Optional
	AWS *DevboxAWSIdentity `json:"aws,omitempty"`

	// +kubebuilder:validation:Optional
	GCP *DevboxGCPIdentity `json:"gcp,omitempty"`

	// +kubebuilder:validation:Optional
	Azure *DevboxAzureIdentity `json:"azure,omitempty"`

	// ExtraHosts are API hosts allowlisted only when this identity is attached.
	// +kubebuilder:validation:Optional
	ExtraHosts []string `json:"extraHosts,omitempty"`
}

type DevboxAWSIdentity struct {
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Pattern=`^arn:aws[a-zA-Z-]*:iam::[0-9]{12}:role/.+$`
	RoleArn string `json:"roleArn"`

	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Minimum=900
	// +kubebuilder:validation:Maximum=43200
	DurationSeconds *int32 `json:"durationSeconds,omitempty"`

	// SessionPolicy is an inline IAM policy JSON further scoping the session.
	// +kubebuilder:validation:Optional
	SessionPolicy *string `json:"sessionPolicy,omitempty"`
}

type DevboxGCPIdentity struct {
	// WorkloadIdentityProvider is the full provider resource name
	// (projects/<n>/locations/global/workloadIdentityPools/<pool>/providers/<provider>).
	// +kubebuilder:validation:Required
	WorkloadIdentityProvider string `json:"workloadIdentityProvider"`

	// ServiceAccount is the email of the service account to impersonate.
	// +kubebuilder:validation:Required
	ServiceAccount string `json:"serviceAccount"`
}

type DevboxAzureIdentity struct {
	// +kubebuilder:validation:Required
	TenantID string `json:"tenantId"`

	// +kubebuilder:validation:Required
	ClientID string `json:"clientId"`
}

// DevboxRunnerStatus defines the observed state of DevboxRunner.
type DevboxRunnerStatus struct {
	Status `json:",inline"`

	// ResolvedImage is spec.image pinned by digest.
	// +kubebuilder:validation:Optional
	ResolvedImage *string `json:"resolvedImage,omitempty"`

	// ResolvedFrom is the image reference ResolvedImage was resolved from.
	// +kubebuilder:validation:Optional
	ResolvedFrom *string `json:"resolvedFrom,omitempty"`

	// ImageResolvedAt is when spec.image was last resolved.
	// +kubebuilder:validation:Optional
	ImageResolvedAt *metav1.Time `json:"imageResolvedAt,omitempty"`

	// DaemonVersion is the devbox-daemon version from the resolved image's labels.
	// +kubebuilder:validation:Optional
	DaemonVersion *string `json:"daemonVersion,omitempty"`

	// Atespace is the Substrate atespace holding this runner's templates and instances.
	// Atespace names are never reused, so it embeds part of the runner's UID.
	// +kubebuilder:validation:Optional
	Atespace *string `json:"atespace,omitempty"`

	// WorkerPool is the namespaced name of the Substrate WorkerPool.
	// +kubebuilder:validation:Optional
	WorkerPool *string `json:"workerPool,omitempty"`

	// AdditionalWorkerPools are the namespace/name of the AdditionalPools carrying the runner's worker selector.
	// +kubebuilder:validation:Optional
	AdditionalWorkerPools []string `json:"additionalWorkerPools,omitempty"`

	// Capacity reports instance sizing and autoscaling.
	// +kubebuilder:validation:Optional
	Capacity *DevboxCapacityStatus `json:"capacity,omitempty"`

	// TemplateRevision is the revision new instances start from.
	// +kubebuilder:validation:Optional
	TemplateRevision *int64 `json:"templateRevision,omitempty"`

	// TemplateName is the ActorTemplate name of TemplateRevision.
	// +kubebuilder:validation:Optional
	TemplateName *string `json:"templateName,omitempty"`

	// Revisions are the ActorTemplate revisions that still exist, newest first.
	// +kubebuilder:validation:Optional
	Revisions []DevboxRevision `json:"revisions,omitempty"`

	// Agents is the probed agent catalog of the current revision.
	// +kubebuilder:validation:Optional
	Agents []DevboxAgentStatus `json:"agents,omitempty"`

	// LastHeartbeat is the last successful console heartbeat.
	// +kubebuilder:validation:Optional
	LastHeartbeat *metav1.Time `json:"lastHeartbeat,omitempty"`
}

type DevboxRevision struct {
	Revision int64 `json:"revision"`
	// Name is the ActorTemplate name.
	Name string `json:"name"`
	// Hash of the inputs that produced this revision.
	Hash  string              `json:"hash"`
	Image string              `json:"image"`
	Phase DevboxRevisionPhase `json:"phase"`
	// +kubebuilder:validation:Optional
	GoldenTag *string `json:"goldenTag,omitempty"`
	// +kubebuilder:validation:Optional
	Message *string `json:"message,omitempty"`
	// +kubebuilder:validation:Optional
	CreatedAt *metav1.Time `json:"createdAt,omitempty"`
}

type DevboxAgentStatus struct {
	Type DevboxAgentType `json:"type"`
	// ProbeStatus is OK, FAILED or MISSING.
	ProbeStatus string `json:"probeStatus"`
	// +kubebuilder:validation:Optional
	AdapterVersion *string `json:"adapterVersion,omitempty"`
	// +kubebuilder:validation:Optional
	ProbeError *string `json:"probeError,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:resource:scope=Cluster
//+kubebuilder:printcolumn:name="Id",type="string",JSONPath=".status.id",description="Console ID"
//+kubebuilder:printcolumn:name="Revision",type="integer",JSONPath=".status.templateRevision",description="Current template revision"
//+kubebuilder:printcolumn:name="Image",type="string",JSONPath=".status.resolvedImage",priority=1,description="Resolved image"
//+kubebuilder:printcolumn:name="Ready",type="string",JSONPath=".status.conditions[?(@.type==\"Ready\")].status"

// DevboxRunner is the Schema for the devboxrunners API. It defines one kind of devbox
// (image, agents, limits, egress) backed by a Substrate WorkerPool and ActorTemplate revisions.
type DevboxRunner struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   DevboxRunnerSpec   `json:"spec,omitempty"`
	Status DevboxRunnerStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// DevboxRunnerList contains a list of DevboxRunner
type DevboxRunnerList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []DevboxRunner `json:"items"`
}

func init() {
	SchemeBuilder.Register(&DevboxRunner{}, &DevboxRunnerList{})
}

func (in *DevboxRunner) ConsoleName() string {
	if in.Spec.Name != nil && len(*in.Spec.Name) > 0 {
		return *in.Spec.Name
	}
	return in.Name
}

func (in *DevboxRunner) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

// ConsoleID implements [PluralResource] interface
func (in *DevboxRunner) ConsoleID() *string {
	return in.Status.ID
}

// DefaultAgent returns the agent marked default, or nil when validation was bypassed.
func (in *DevboxRunner) DefaultAgent() *DevboxAgent {
	for i := range in.Spec.Agents {
		if in.Spec.Agents[i].Default != nil && *in.Spec.Agents[i].Default {
			return &in.Spec.Agents[i]
		}
	}
	return nil
}

// IsDigestReference reports whether an image reference is already pinned by digest.
func IsDigestReference(image string) bool {
	return strings.Contains(image, "@sha256:")
}

// UpdateMode returns the effective image update mode for the given image reference.
func (in *DevboxRunner) UpdateMode(image string) DevboxImageUpdateMode {
	if p := in.Spec.ImageUpdatePolicy; p != nil && p.Mode != nil {
		return *p.Mode
	}
	if IsDigestReference(image) {
		return DevboxImageUpdatePinned
	}
	return DevboxImageUpdatePoll
}

// RevisionByNumber returns the status entry for a revision, or nil.
func (in *DevboxRunner) RevisionByNumber(revision int64) *DevboxRevision {
	for i := range in.Status.Revisions {
		if in.Status.Revisions[i].Revision == revision {
			return &in.Status.Revisions[i]
		}
	}
	return nil
}

// LatestRevision returns the newest revision regardless of phase, or nil.
func (in *DevboxRunner) LatestRevision() *DevboxRevision {
	var latest *DevboxRevision
	for i := range in.Status.Revisions {
		if latest == nil || in.Status.Revisions[i].Revision > latest.Revision {
			latest = &in.Status.Revisions[i]
		}
	}
	return latest
}

// packageServerHosts are the registry hosts each ecosystem needs, all on 443.
var packageServerHosts = map[string][]string{
	"go":         {"proxy.golang.org", "sum.golang.org"},
	"rust":       {"crates.io", "index.crates.io", "static.crates.io", "static.rust-lang.org"},
	"javascript": {"registry.npmjs.org", "registry.yarnpkg.com", "repo.yarnpkg.com", "nodejs.org"},
	"java":       {"repo.maven.apache.org", "repo1.maven.org", "plugins.gradle.org", "services.gradle.org", "downloads.gradle.org"},
	"elixir":     {"hex.pm", "repo.hex.pm", "builds.hex.pm"},
	"python":     {"pypi.org", "files.pythonhosted.org"},
	"ruby":       {"rubygems.org", "index.rubygems.org"},
	"php":        {"packagist.org", "repo.packagist.org"},
	"dotnet":     {"api.nuget.org", "globalcdn.nuget.org"},
}

// PackageServerHosts returns the registry hosts the enabled ecosystems need, in a stable order. Unset fields
// take the CRD defaults, so runners stored before the field existed behave the same.
func (in *DevboxRunnerSpec) PackageServerHosts() []string {
	ps := in.PackageServers
	if ps == nil {
		ps = &DevboxPackageServers{}
	}
	on := func(v *bool, def bool) bool {
		if v == nil {
			return def
		}
		return *v
	}
	var out []string
	for _, eco := range []struct {
		name    string
		enabled bool
	}{
		{"go", on(ps.Go, true)},
		{"rust", on(ps.Rust, true)},
		{"javascript", on(ps.JavaScript, true)},
		{"java", on(ps.Java, true)},
		{"elixir", on(ps.Elixir, true)},
		{"python", on(ps.Python, true)},
		{"ruby", on(ps.Ruby, false)},
		{"php", on(ps.PHP, false)},
		{"dotnet", on(ps.Dotnet, false)},
	} {
		if eco.enabled {
			out = append(out, packageServerHosts[eco.name]...)
		}
	}
	return out
}

// cloudProviderHosts are the API hosts each cloud's CLIs and SDKs need, all on 443.
var cloudProviderHosts = map[string][]string{
	"aws":   {"*.amazonaws.com", "*.api.aws"},
	"gcp":   {"*.googleapis.com", "accounts.google.com"},
	"azure": {"management.azure.com", "login.microsoftonline.com", "graph.microsoft.com", "*.vault.azure.net", "*.core.windows.net"},
}

// CloudProviderHosts returns the API hosts the enabled clouds need, in a stable order. An unset cloud is on when
// a cloud identity targets it.
func (in *DevboxRunnerSpec) CloudProviderHosts() []string {
	cp := in.CloudProviders
	if cp == nil {
		cp = &DevboxCloudProviders{}
	}
	var aws, gcp, azure bool
	for _, ci := range in.CloudIdentities {
		aws, gcp, azure = aws || ci.AWS != nil, gcp || ci.GCP != nil, azure || ci.Azure != nil
	}
	on := func(v *bool, def bool) bool {
		if v == nil {
			return def
		}
		return *v
	}
	var out []string
	for _, cloud := range []struct {
		name    string
		enabled bool
	}{
		{"aws", on(cp.AWS, aws)},
		{"gcp", on(cp.GCP, gcp)},
		{"azure", on(cp.Azure, azure)},
	} {
		if cloud.enabled {
			out = append(out, cloudProviderHosts[cloud.name]...)
		}
	}
	return out
}

// DevboxRunnerEnvSecret, in the operator namespace, holds every runner's resolved secretKeyRef env vars as one JSON
// object per runner, keyed by runner name. The gateway reads only this Secret, so runners can reference Secrets in
// any namespace without the gateway having cluster-wide Secret access.
const DevboxRunnerEnvSecret = "devbox-runner-env"

// SecretEnv reports whether any env var comes from a Secret.
func (in *DevboxRunnerSpec) SecretEnv() bool {
	for _, e := range in.Env {
		if e.ValueFrom != nil {
			return true
		}
	}
	return false
}
