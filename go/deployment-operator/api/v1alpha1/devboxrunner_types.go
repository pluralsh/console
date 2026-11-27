package v1alpha1

import (
	"strings"
	"time"

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
	// DevboxRevisionRetired means a newer revision is current, or its golden boot lost its worker and it is rebuilt as
	// a new revision; the revision stays until nothing references it.
	DevboxRevisionRetired DevboxRevisionPhase = "Retired"
)

type DevboxRunnerBindings struct {
	// Create bindings control who can attach this devbox to a workbench and start instances on it.
	// Only users and groups resolvable by userEmail or groupName apply. If none are set, console falls
	// back to its global create policy, which admins always pass.
	// +kubebuilder:validation:Optional
	Create []Binding `json:"create,omitempty"`
}

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

	// Home selects where instances keep /home/dev.
	// +kubebuilder:validation:Optional
	Home *DevboxHome `json:"home,omitempty"`

	// WorkerPool sizes the Substrate WorkerPool backing this runner.
	// +kubebuilder:validation:Optional
	WorkerPool *DevboxWorkerPool `json:"workerPool,omitempty"`

	// ScmConnections are names of console SCM connections instances may use for git credentials.
	// +kubebuilder:validation:Optional
	ScmConnections []string `json:"scmConnections,omitempty"`

	// Bindings control who can use this devbox in console.
	// +kubebuilder:validation:Optional
	Bindings *DevboxRunnerBindings `json:"bindings,omitempty"`

	// AllowedRepositories the git repositories allowed to be used with this devbox,
	// with the same semantics as AgentRuntime.spec.allowedRepositories.
	// +kubebuilder:validation:Optional
	AllowedRepositories []string `json:"allowedRepositories,omitempty"`

	// HTTPAllowlist are extra hosts instances may reach, on top of the built-in ones.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:MaxItems=256
	HTTPAllowlist []DevboxHTTPAllowlistEntry `json:"httpAllowlist,omitempty"`

	// AllowPublicEgress lets instances (and the golden boot) reach any host on ports 443 and 80, instead of only
	// the allowlist and presets. HTTPS to hosts no other rule names is tunneled without interception, so those
	// sites see their real certificates; the hosts egress injects credentials for (SCM, console, cloud identity,
	// subscription billing) keep their specific rules, so credentials are still only sent where they belong.
	//
	// Security: this removes egress as a guardrail against exfiltration. An agent, a compromised dependency or a
	// prompt injection in a page the agent reads can send workspace code, environment secrets and anything else in
	// the box to an arbitrary server. Wildcard rules match names, not addresses, so names that resolve inside the
	// cluster or private network (e.g. <svc>.<ns>.svc.cluster.local, internal DNS zones) become reachable on these
	// ports too, subject only to your NetworkPolicies. Only enable it where boxes run code and agents you trust
	// with that reach: sandboxed clusters with no sensitive internal services, demo or personal environments.
	// +kubebuilder:validation:Optional
	AllowPublicEgress *bool `json:"allowPublicEgress,omitempty"`

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

	// OCIRegistries opens egress to public container registries, for pulling images with podman, docker,
	// crane or helm. Docker Hub and GitHub Container Registry are on unless set to false.
	// +kubebuilder:validation:Optional
	// +kubebuilder:default={}
	OCIRegistries *DevboxOCIRegistries `json:"ociRegistries,omitempty"`

	// OAuthProviders opens egress to identity providers' sign-in pages, token endpoints and the assets their
	// login flows load, so apps under development can sign in through the box's browser. All are off unless
	// set to true.
	// +kubebuilder:validation:Optional
	OAuthProviders *DevboxOAuthProviders `json:"oauthProviders,omitempty"`

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

	// BootstrapScript runs once during the golden boot, from the home directory and after repositories are cloned
	// and mise has installed its tools, so its results are baked into the snapshot. It runs with `bash -e` unless
	// it starts with a #! line, and a failure fails the revision; its output is in ~/.plural/golden.log.
	// +kubebuilder:validation:Optional
	BootstrapScript *string `json:"bootstrapScript,omitempty"`

	// Mise is an inline mise.toml installed during the golden boot.
	// +kubebuilder:validation:Optional
	Mise *MiseSpec `json:"mise,omitempty"`

	// Repositories are cloned into the home during the golden boot, with the box's SCM connections, so every
	// instance starts with them checked out, along with whatever bootstrapScript builds in them. Each instance
	// fetches them again when it first boots. When allowedRepositories is set, each must be on it.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:MaxItems=32
	// +listType=map
	// +listMapKey=url
	Repositories []DevboxRepository `json:"repositories,omitempty"`

	// BootstrapTimeout bounds the golden boot when it has work to do (repositories, mise or bootstrapScript):
	// past it, Substrate crashes the boot and the revision fails. It's also how long a waking instance may take to
	// report ready. Defaults to 30m.
	// +kubebuilder:validation:Optional
	BootstrapTimeout *metav1.Duration `json:"bootstrapTimeout,omitempty"`

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

	// Substrate overrides where the operator reaches the Substrate API and the identity it calls it as. The
	// operator mints the token and reads the CA bundle from the cluster when it reconciles the runner, so
	// nothing is mounted into the operator.
	// +kubebuilder:validation:Optional
	Substrate *DevboxSubstrate `json:"substrate,omitempty"`
}

// DevboxSubstrate locates the Substrate API credentials the operator loads for a runner.
type DevboxSubstrate struct {
	// Address of ate-api-server. Defaults to the deployment-operator chart's devboxes.substrate.apiAddress.
	// +kubebuilder:validation:Optional
	Address *string `json:"address,omitempty"`

	// ServiceAccountName is a ServiceAccount in the operator's namespace that the operator mints Substrate API
	// tokens for. It must be a Substrate global owner, since it creates atespaces and drains workers. Defaults
	// to the operator's own ServiceAccount.
	// +kubebuilder:validation:Optional
	ServiceAccountName *string `json:"serviceAccountName,omitempty"`

	// CASignerName is the signer of the ClusterTrustBundles that verify ate-api-server's serving certificate.
	// Defaults to servicedns.podcert.ate.dev/identity.
	// +kubebuilder:validation:Optional
	CASignerName *string `json:"caSignerName,omitempty"`
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

// DevboxRepository is a repository the golden boot clones.
type DevboxRepository struct {
	// URL is the https clone URL, e.g. https://github.com/pluralsh/console.git.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Pattern=`^https://[^/]+/.+`
	URL string `json:"url"`

	// Branch is checked out instead of the default branch.
	// +kubebuilder:validation:Optional
	Branch *string `json:"branch,omitempty"`

	// Description is shown to agents in the home's Project.md.
	// +kubebuilder:validation:Optional
	Description *string `json:"description,omitempty"`
}

const (
	// DevboxDefaultBootstrapTimeout is spec.bootstrapTimeout's default.
	DevboxDefaultBootstrapTimeout = 30 * time.Minute
	// DevboxMaxBootstrapTimeout is Substrate's limit on a wakeup probe.
	DevboxMaxBootstrapTimeout = time.Hour
)

// GoldenBootTimeout is how long the golden boot may take (spec.bootstrapTimeout), capped at Substrate's limit.
func (s *DevboxRunnerSpec) GoldenBootTimeout() time.Duration {
	d := DevboxDefaultBootstrapTimeout
	if s.BootstrapTimeout != nil && s.BootstrapTimeout.Duration > 0 {
		d = s.BootstrapTimeout.Duration
	}
	return min(d, DevboxMaxBootstrapTimeout)
}

// HasGoldenBootWork reports whether the golden boot clones, installs or runs anything.
func (s *DevboxRunnerSpec) HasGoldenBootWork() bool {
	return len(s.Repositories) > 0 || (s.BootstrapScript != nil && *s.BootstrapScript != "") ||
		(s.Mise != nil && s.Mise.Config != nil && *s.Mise.Config != "")
}

// DevboxHomeStorage is where an instance's /home/dev lives.
// +kubebuilder:validation:Enum=Snapshot;JuiceFS;ZeroFS;Block
type DevboxHomeStorage string

const (
	// DevboxHomeSnapshot keeps the home on the instance's node and carries it in every snapshot.
	DevboxHomeSnapshot DevboxHomeStorage = "Snapshot"
	// DevboxHomeJuiceFS keeps the home in the agent-substrate chart's JuiceFS filesystem (juicefs.enabled), mounted
	// wherever the instance runs, so snapshots carry only memory and moving node doesn't copy the home.
	DevboxHomeJuiceFS DevboxHomeStorage = "JuiceFS"
	// DevboxHomeZeroFS keeps each home in its own ZeroFS filesystem in object storage, from the agent-substrate
	// chart's ZeroFS driver (zerofs.enabled): an ext4 block device that follows the instance from node to node, with
	// no metadata database. Snapshots carry only memory.
	DevboxHomeZeroFS DevboxHomeStorage = "ZeroFS"
	// DevboxHomeBlock keeps each home on its own cloud disk, from the agent-substrate chart's block driver
	// (block.enabled), formatted ext4 and mounted by the node's kernel. A disk lives in one zone, so each instance
	// stays in its home's zone, and the runner runs a WorkerPool per zone (see spec.workerPool.zones). Snapshots
	// carry only memory.
	DevboxHomeBlock DevboxHomeStorage = "Block"

	// DevboxDefaultJuiceFSStorageClass is the agent-substrate chart's juicefs.storageClassName default.
	DevboxDefaultJuiceFSStorageClass = "devbox-juicefs"
	// DevboxDefaultZeroFSStorageClass is the agent-substrate chart's zerofs.storageClassName default.
	DevboxDefaultZeroFSStorageClass = "devbox-zerofs"
	// DevboxDefaultBlockStorageClass is the agent-substrate chart's block.storageClassName default.
	DevboxDefaultBlockStorageClass = "devbox-block"
)

// DevboxHome selects how instances store /home/dev.
//
// With JuiceFS, ZeroFS or Block, an instance's home is seeded from the golden boot's, so what the bootstrap script
// and mise installed is there from the start. With JuiceFS, every snapshot also saves the home as a JuiceFS clone;
// ZeroFS and Block snapshots don't save the home yet. Starting an instance from a snapshot isn't supported for any
// of them: Substrate can't restore a tag of a template with external volumes.
type DevboxHome struct {
	// Storage defaults to Snapshot. Changing it rolls a new revision, and instances moved to it start with a fresh
	// home.
	// +kubebuilder:validation:Optional
	// +kubebuilder:default=Snapshot
	Storage *DevboxHomeStorage `json:"storage,omitempty"`

	// Size is the most a JuiceFS, ZeroFS or Block home may hold: a JuiceFS quota, the size of the ZeroFS block
	// device, or the size of the cloud disk. Defaults to spec.resources.disk.
	// +kubebuilder:validation:Optional
	Size *resource.Quantity `json:"size,omitempty"`

	// StorageClassName is the JuiceFS, ZeroFS or Block StorageClass. Defaults to the agent-substrate chart's
	// devbox-juicefs, devbox-zerofs or devbox-block.
	// +kubebuilder:validation:Optional
	StorageClassName *string `json:"storageClassName,omitempty"`
}

// HomeStorage is where instances keep /home/dev.
func (s *DevboxRunnerSpec) HomeStorage() DevboxHomeStorage {
	if s.Home == nil || s.Home.Storage == nil {
		return DevboxHomeSnapshot
	}
	return *s.Home.Storage
}

// External reports whether homes are volumes outside the instance's snapshots, served by a CSI driver.
func (s DevboxHomeStorage) External() bool {
	return s == DevboxHomeJuiceFS || s == DevboxHomeZeroFS || s == DevboxHomeBlock
}

// Zonal reports whether homes live in one zone, so each instance must stay in its home's zone.
func (s DevboxHomeStorage) Zonal() bool {
	return s == DevboxHomeBlock
}

// HomeSize is the most an instance's home may hold.
func (s *DevboxRunnerSpec) HomeSize() resource.Quantity {
	if s.Home != nil && s.Home.Size != nil {
		return *s.Home.Size
	}
	if s.Resources != nil && s.Resources.Disk != nil {
		return *s.Resources.Disk
	}
	return resource.MustParse("20Gi")
}

// HomeStorageClass is the StorageClass of a JuiceFS, ZeroFS or Block home.
func (s *DevboxRunnerSpec) HomeStorageClass() string {
	if s.Home != nil && s.Home.StorageClassName != nil && *s.Home.StorageClassName != "" {
		return *s.Home.StorageClassName
	}
	switch s.HomeStorage() {
	case DevboxHomeZeroFS:
		return DevboxDefaultZeroFSStorageClass
	case DevboxHomeBlock:
		return DevboxDefaultBlockStorageClass
	}
	return DevboxDefaultJuiceFSStorageClass
}

// WorkerZones are the zones spec.workerPool.zones lists.
func (s *DevboxRunnerSpec) WorkerZones() []string {
	if s.WorkerPool == nil {
		return nil
	}
	return s.WorkerPool.Zones
}

// Zones are the zones the runner runs one WorkerPool in and places new instances in, empty for a single pool:
// status.zones once the operator has set it, else spec.workerPool.zones.
func (r *DevboxRunner) Zones() []string {
	if len(r.Status.Zones) > 0 {
		return r.Status.Zones
	}
	return r.Spec.WorkerZones()
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

	// Zones runs one WorkerPool per zone instead of one pool, each pinned to its zone's nodes with
	// topology.kubernetes.io/zone. Block homes run that way without it too, in the zones of the nodes matching
	// NodeSelector (or of every node, before any matches): a home's disk lives in one zone, and the gateway keeps
	// each instance in its home's zone, packing new instances into the zone that already holds the most. Set it
	// to choose the zones instead. Replicas and Autoscaling are totals across the zones: the minimum and the spare
	// instance slots go only to zones holding homes, not to every zone.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:MaxItems=6
	// +listType=set
	// +kubebuilder:validation:items:Pattern=`^[a-z0-9]([-a-z0-9]{0,30}[a-z0-9])?$`
	Zones []string `json:"zones,omitempty"`

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

	// Zones breaks the autoscaler's view down by zone when the runner runs a pool per zone; the fields above are
	// totals.
	// +kubebuilder:validation:Optional
	// +listType=map
	// +listMapKey=zone
	Zones []DevboxZoneCapacity `json:"zones,omitempty"`
}

// DevboxZoneCapacity is one zone's WorkerPool as the autoscaler sees it.
type DevboxZoneCapacity struct {
	Zone string `json:"zone"`
	// Workers are the zone's schedulable workers, DesiredWorkers the autoscaler's target for them.
	Workers        int32 `json:"workers"`
	DesiredWorkers int32 `json:"desiredWorkers"`
	// Homes are the instances whose home lives in the zone, RunningInstances those running there, and
	// WaitingInstances those waiting for a worker there.
	Homes            int32 `json:"homes"`
	RunningInstances int32 `json:"runningInstances"`
	// +kubebuilder:validation:Optional
	WaitingInstances int32 `json:"waitingInstances,omitempty"`
}

// DevboxWorkerPoolZone is the WorkerPool of one zone.
type DevboxWorkerPoolZone struct {
	Zone string `json:"zone"`
	// WorkerPool is the pool's namespace/name.
	WorkerPool string `json:"workerPool"`
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

// DevboxOCIRegistries enables egress to each container registry's API and blob hosts (see OCIRegistryHosts).
type DevboxOCIRegistries struct {
	// DockerHub: docker.io, its auth service and its Cloudflare blob CDN. Unqualified image names resolve here.
	// +kubebuilder:validation:Optional
	// +kubebuilder:default=true
	DockerHub *bool `json:"dockerHub,omitempty"`

	// GitHub: ghcr.io and its blob host.
	// +kubebuilder:validation:Optional
	// +kubebuilder:default=true
	GitHub *bool `json:"github,omitempty"`

	// Quay: quay.io, its CDN and its S3 blob bucket.
	// +kubebuilder:validation:Optional
	Quay *bool `json:"quay,omitempty"`

	// Google: Container Registry (gcr.io and its regional hosts) and Artifact Registry (*.pkg.dev).
	// +kubebuilder:validation:Optional
	Google *bool `json:"google,omitempty"`

	// Microsoft: the Microsoft Artifact Registry, mcr.microsoft.com, and its regional data endpoints.
	// +kubebuilder:validation:Optional
	Microsoft *bool `json:"microsoft,omitempty"`

	// Kubernetes: registry.k8s.io and the Artifact Registry mirrors it redirects to. From AWS addresses it
	// redirects to regional S3 buckets instead, which need httpAllowlist entries.
	// +kubebuilder:validation:Optional
	Kubernetes *bool `json:"kubernetes,omitempty"`

	// ECR opens private Amazon ECR registries, for any account, in the listed regions.
	// +kubebuilder:validation:Optional
	ECR *DevboxECRRegistries `json:"ecr,omitempty"`
}

// DevboxOAuthProviders enables egress to each identity provider's login flow (see OAuthProviderHosts).
type DevboxOAuthProviders struct {
	// Google: Google sign-in, its OAuth and OpenID Connect endpoints, and the scripts, fonts and avatars its
	// pages load.
	// +kubebuilder:validation:Optional
	Google *bool `json:"google,omitempty"`

	// GitHub: github.com sign-in and OAuth apps, the API, and the assets and avatars its pages load.
	// +kubebuilder:validation:Optional
	GitHub *bool `json:"github,omitempty"`

	// Microsoft: Entra ID (work and school accounts), personal Microsoft accounts, Microsoft Graph and the CDNs
	// their sign-in pages load from.
	// +kubebuilder:validation:Optional
	Microsoft *bool `json:"microsoft,omitempty"`

	// GitLab: gitlab.com sign-in and OAuth applications, and its asset hosts.
	// +kubebuilder:validation:Optional
	GitLab *bool `json:"gitlab,omitempty"`

	// Apple: Sign in with Apple.
	// +kubebuilder:validation:Optional
	Apple *bool `json:"apple,omitempty"`

	// Okta: any Okta or Okta Workforce tenant and Okta's CDN. Custom sign-in domains need httpAllowlist entries.
	// +kubebuilder:validation:Optional
	Okta *bool `json:"okta,omitempty"`

	// Auth0: any Auth0 tenant, in every region, and Auth0's CDN. Custom domains need httpAllowlist entries.
	// +kubebuilder:validation:Optional
	Auth0 *bool `json:"auth0,omitempty"`
}

// DevboxECRRegistries enables egress to private Amazon ECR registries. ECR hosts are regional, so each region
// is listed. Pulling still needs credentials, such as an AWS cloud identity and `aws ecr get-login-password`.
type DevboxECRRegistries struct {
	// Regions opens, per region, the registry API (<account>.dkr.ecr.<region>.amazonaws.com), the ECR API
	// that issues login tokens, and the S3 bucket image layers download from.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:MaxItems=32
	// +kubebuilder:validation:items:Pattern=`^[a-z]{2}(-[a-z]+)+-[0-9]+$`
	Regions []string `json:"regions,omitempty"`
}

// DevboxPackageServers enables egress to each ecosystem's public registries (see PackageServerHosts).
type DevboxPackageServers struct {
	// Go: the module proxy and checksum database, the storage its downloads redirect to, and Go releases.
	// +kubebuilder:validation:Optional
	// +kubebuilder:default=true
	Go *bool `json:"go,omitempty"`

	// Rust: crates.io and rustup.
	// +kubebuilder:validation:Optional
	// +kubebuilder:default=true
	Rust *bool `json:"rust,omitempty"`

	// JavaScript: the npm and yarn registries, JSR, and the Node.js, Bun and Deno downloads.
	// +kubebuilder:validation:Optional
	// +kubebuilder:default=true
	JavaScript *bool `json:"javascript,omitempty"`

	// Java: Maven Central, Google's Maven repository, and the Gradle plugin portal and distributions.
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

	// Ruby: rubygems.org and Ruby releases.
	// +kubebuilder:validation:Optional
	// +kubebuilder:default=true
	Ruby *bool `json:"ruby,omitempty"`

	// PHP: Packagist and Composer.
	// +kubebuilder:validation:Optional
	// +kubebuilder:default=true
	PHP *bool `json:"php,omitempty"`

	// Dotnet: NuGet and .NET releases.
	// +kubebuilder:validation:Optional
	// +kubebuilder:default=true
	Dotnet *bool `json:"dotnet,omitempty"`

	// Mise: what `mise use` needs for languages and tools the image doesn't ship: mise's version and Java
	// metadata, GitHub releases (most tools are released there) and the other common release hosts. On boxes
	// without a GitHub SCM connection this opens github.com unauthenticated.
	// +kubebuilder:validation:Optional
	// +kubebuilder:default=false
	Mise *bool `json:"mise,omitempty"`
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

	// WorkerPool is the namespaced name of the Substrate WorkerPool, unset when the runner runs a pool per zone.
	// +kubebuilder:validation:Optional
	WorkerPool *string `json:"workerPool,omitempty"`

	// Zones are the zones the runner runs a WorkerPool in and places new instances in: spec.workerPool.zones, or
	// for Block homes without them, the zones the operator found the runner's nodes in.
	// +kubebuilder:validation:Optional
	Zones []string `json:"zones,omitempty"`

	// WorkerPoolZones are the runner's WorkerPools when it runs one per zone, including pools of zones dropped
	// from Zones that still hold instances' homes.
	// +kubebuilder:validation:Optional
	// +listType=map
	// +listMapKey=zone
	WorkerPoolZones []DevboxWorkerPoolZone `json:"workerPoolZones,omitempty"`

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
	// HomeStorage is where this revision's template keeps /home/dev; unset means Snapshot.
	// +kubebuilder:validation:Optional
	HomeStorage *DevboxHomeStorage `json:"homeStorage,omitempty"`
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

// packageServerHosts are the hosts each ecosystem's whole download chain touches, all on 443: registry indexes,
// the hosts their artifacts redirect to, and the toolchain and package manager downloads. Sources hosted on an
// SCM (Composer dists, git dependencies) come with the instance's SCM hosts instead.
var packageServerHosts = map[string][]string{
	// proxy.golang.org answers module zips and toolchains with redirects to storage.googleapis.com; go.dev and
	// dl.google.com serve Go releases
	"go":   {"proxy.golang.org", "sum.golang.org", "storage.googleapis.com", "go.dev", "golang.org", "dl.google.com"},
	"rust": {"crates.io", "index.crates.io", "static.crates.io", "static.rust-lang.org", "sh.rustup.rs"},
	// corepack fetches pnpm and yarn from the npm registry and yarn berry from repo.yarnpkg.com; JSR serves
	// npm-compatible packages from npm.jsr.io
	"javascript": {
		"registry.npmjs.org", "registry.yarnpkg.com", "repo.yarnpkg.com", "nodejs.org", "bun.sh",
		"jsr.io", "npm.jsr.io", "deno.land", "dl.deno.land",
	},
	// the plugin portal redirects artifacts to plugins-artifacts.gradle.org; Android and many Gradle builds pull
	// Google's Maven repository
	"java": {
		"repo.maven.apache.org", "repo1.maven.org", "plugins.gradle.org", "plugins-artifacts.gradle.org",
		"services.gradle.org", "downloads.gradle.org", "maven.google.com", "dl.google.com",
	},
	"elixir": {"hex.pm", "repo.hex.pm", "builds.hex.pm"},
	"python": {"pypi.org", "files.pythonhosted.org"},
	"ruby":   {"rubygems.org", "index.rubygems.org", "cache.ruby-lang.org"},
	"php":    {"packagist.org", "repo.packagist.org", "getcomposer.org"},
	"dotnet": {"api.nuget.org", "globalcdn.nuget.org", "builds.dotnet.microsoft.com", "dot.net"},
	"mise":   MiseHosts,
}

// MiseHosts are what mise installs from beyond the ecosystems' own hosts: its version, Java and download
// metadata, GitHub releases and the object storage their assets redirect to, and the release hosts of common
// tools (HashiCorp, Zig, Kubernetes, Helm). When github.com is an SCM host its SCM rules take precedence.
var MiseHosts = []string{
	"mise.jdx.dev", "mise-versions.jdx.dev", "mise-java.jdx.dev",
	"github.com", "api.github.com", "codeload.github.com", "raw.githubusercontent.com",
	"objects.githubusercontent.com", "github-releases.githubusercontent.com", "release-assets.githubusercontent.com",
	"releases.hashicorp.com", "ziglang.org", "dl.k8s.io", "cdn.dl.k8s.io", "get.helm.sh",
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
	seen := map[string]bool{}
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
		{"ruby", on(ps.Ruby, true)},
		{"php", on(ps.PHP, true)},
		{"dotnet", on(ps.Dotnet, true)},
		{"mise", on(ps.Mise, false)},
	} {
		if !eco.enabled {
			continue
		}
		for _, h := range packageServerHosts[eco.name] {
			if !seen[h] {
				seen[h] = true
				out = append(out, h)
			}
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

// PublicEgressHost is the hostname pattern AllowPublicEgress opens; Substrate matches every name with it.
const PublicEgressHost = "*"

// PublicEgress reports whether spec.allowPublicEgress opens 443 and 80 to every host.
func (in *DevboxRunnerSpec) PublicEgress() bool {
	return in.AllowPublicEgress != nil && *in.AllowPublicEgress
}

// EgressPresetHosts are every host the runner's presets open on 443: package servers, cloud providers, OCI
// registries and OAuth providers, in a stable order without duplicates.
func (in *DevboxRunnerSpec) EgressPresetHosts() []string {
	var out []string
	seen := map[string]bool{}
	for _, hosts := range [][]string{in.PackageServerHosts(), in.CloudProviderHosts(), in.OCIRegistryHosts(), in.OAuthProviderHosts()} {
		for _, h := range hosts {
			if !seen[h] {
				seen[h] = true
				out = append(out, h)
			}
		}
	}
	return out
}

// oauthProviderHosts are the hosts each provider's browser sign-in touches, all on 443. Substrate wildcards
// cover exactly one label, so Auth0's regional tenants are listed by region.
var oauthProviderHosts = map[string][]string{
	"google": {
		"accounts.google.com", "oauth2.googleapis.com", "openidconnect.googleapis.com", "www.googleapis.com",
		"apis.google.com", "www.gstatic.com", "ssl.gstatic.com", "fonts.gstatic.com", "fonts.googleapis.com",
		"lh3.googleusercontent.com", "play.google.com",
	},
	"github": {
		"github.com", "api.github.com", "github.githubassets.com", "avatars.githubusercontent.com",
	},
	"microsoft": {
		"login.microsoftonline.com", "login.microsoft.com", "login.live.com", "account.live.com",
		"graph.microsoft.com", "aadcdn.msauth.net", "aadcdn.msftauth.net", "logincdn.msauth.net",
		"logincdn.msftauth.net", "login.windows.net",
	},
	"gitlab": {"gitlab.com", "assets.gitlab-static.net"},
	"apple":  {"appleid.apple.com", "appleid.cdn-apple.com", "idmsa.apple.com"},
	"okta":   {"*.okta.com", "*.okta-emea.com", "*.oktapreview.com", "*.oktacdn.com"},
	"auth0": {
		"*.auth0.com", "*.us.auth0.com", "*.eu.auth0.com", "*.au.auth0.com", "*.jp.auth0.com",
		"*.ca.auth0.com", "*.uk.auth0.com",
	},
}

// OAuthProviderHosts returns the hosts the enabled OAuth providers need, in a stable order without duplicates.
func (in *DevboxRunnerSpec) OAuthProviderHosts() []string {
	o := in.OAuthProviders
	if o == nil {
		return nil
	}
	var out []string
	seen := map[string]bool{}
	for _, provider := range []struct {
		name    string
		enabled *bool
	}{
		{"google", o.Google},
		{"github", o.GitHub},
		{"microsoft", o.Microsoft},
		{"gitlab", o.GitLab},
		{"apple", o.Apple},
		{"okta", o.Okta},
		{"auth0", o.Auth0},
	} {
		if provider.enabled == nil || !*provider.enabled {
			continue
		}
		for _, h := range oauthProviderHosts[provider.name] {
			if !seen[h] {
				seen[h] = true
				out = append(out, h)
			}
		}
	}
	return out
}

// ociRegistryHosts are the API and blob hosts each registry's pulls touch, all on 443. Substrate wildcards
// cover exactly one label.
var ociRegistryHosts = map[string][]string{
	"dockerHub":  {"docker.io", "index.docker.io", "registry-1.docker.io", "auth.docker.io", "production.cloudflare.docker.com"},
	"github":     {"ghcr.io", "pkg-containers.githubusercontent.com"},
	"quay":       {"quay.io", "cdn.quay.io", "cdn01.quay.io", "cdn02.quay.io", "cdn03.quay.io", "quayio-production-s3.s3.amazonaws.com"},
	"google":     {"gcr.io", "*.gcr.io", "*.pkg.dev"},
	"microsoft":  {"mcr.microsoft.com", "*.data.mcr.microsoft.com"},
	"kubernetes": {"registry.k8s.io", "*.pkg.dev"},
}

// OCIRegistryHosts returns the hosts the enabled container registries need, in a stable order without
// duplicates. Unset fields take the CRD defaults, so runners stored before the field existed behave the same.
func (in *DevboxRunnerSpec) OCIRegistryHosts() []string {
	oci := in.OCIRegistries
	if oci == nil {
		oci = &DevboxOCIRegistries{}
	}
	on := func(v *bool, def bool) bool {
		if v == nil {
			return def
		}
		return *v
	}
	var hosts, out []string
	seen := map[string]bool{}
	for _, registry := range []struct {
		name    string
		enabled bool
	}{
		{"dockerHub", on(oci.DockerHub, true)},
		{"github", on(oci.GitHub, true)},
		{"quay", on(oci.Quay, false)},
		{"google", on(oci.Google, false)},
		{"microsoft", on(oci.Microsoft, false)},
		{"kubernetes", on(oci.Kubernetes, false)},
	} {
		if registry.enabled {
			hosts = append(hosts, ociRegistryHosts[registry.name]...)
		}
	}
	if oci.ECR != nil {
		for _, region := range oci.ECR.Regions {
			hosts = append(hosts, ecrHosts(region)...)
		}
	}
	for _, h := range hosts {
		if !seen[h] {
			seen[h] = true
			out = append(out, h)
		}
	}
	return out
}

// ecrHosts are the hosts a private ECR pull in region touches: the registry API under any account, the ECR API
// for login tokens, and the layer bucket in both S3 addressing styles.
func ecrHosts(region string) []string {
	bucket := "prod-" + region + "-starport-layer-bucket"
	return []string{
		"*.dkr.ecr." + region + ".amazonaws.com",
		"api.ecr." + region + ".amazonaws.com",
		bucket + ".s3." + region + ".amazonaws.com",
		bucket + ".s3.amazonaws.com",
	}
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
