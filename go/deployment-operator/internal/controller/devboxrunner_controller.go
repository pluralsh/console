package controller

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"sync"
	"time"

	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
	appsv1 "k8s.io/api/apps/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/handler"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/internal/utils"
	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate"
)

const (
	DevboxRunnerFinalizer = "deployments.plural.sh/devbox-runner-protection"

	requeueDevboxRunner         = 2 * time.Minute
	requeueDevboxRunnerBuilding = 15 * time.Second
	requeueDevboxRunnerError    = time.Minute
)

// DevboxRunnerReconciler reconciles a DevboxRunner: it resolves and checks the image, keeps the Substrate
// WorkerPool, atespace and ActorTemplate revisions in sync with the spec, hands golden tags to the gateway for
// the agent probe, upserts the Devbox (with the probed catalog) to console, and runs the per-cluster gateway.
type DevboxRunnerReconciler struct {
	client.Client
	// APIReader reads ConfigMaps uncached, so the operator doesn't cache every ConfigMap in the cluster.
	APIReader        client.Reader
	Scheme           *runtime.Scheme
	Config           DevboxConfig
	Console          DevboxConsoleClient
	Agents           AgentsGate
	Substrate        SubstrateClients
	Images           DevboxImageResolver
	Probe            DevboxProbeClient
	CacheSyncTimeout time.Duration
	// WatchWorkerPools adds an Owns watch on WorkerPools; only possible when the Substrate CRDs are installed.
	WatchWorkerPools bool

	heartbeats sync.Map
}

//+kubebuilder:rbac:groups=deployments.plural.sh,resources=devboxrunners,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=devboxrunners/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=devboxrunners/finalizers,verbs=update
//+kubebuilder:rbac:groups=ate.dev,resources=workerpools,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=apps,resources=deployments,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups="",resources=services;serviceaccounts;secrets;configmaps,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups="",resources=namespaces,verbs=get;list;watch;patch
//+kubebuilder:rbac:groups="",resources=pods,verbs=get;list;patch
//+kubebuilder:rbac:groups=networking.k8s.io,resources=networkpolicies,verbs=get;list;watch;create;update;patch;delete

func (r *DevboxRunnerReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, retErr error) {
	logger := log.FromContext(ctx)

	runner := &v1alpha1.DevboxRunner{}
	if err := r.Get(ctx, req.NamespacedName, runner); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	scope, err := NewDefaultScope(ctx, r.Client, runner)
	if err != nil {
		return ctrl.Result{}, err
	}
	defer func() {
		if err := scope.PatchObject(); err != nil && retErr == nil {
			retErr = err
		}
	}()

	if !runner.DeletionTimestamp.IsZero() {
		return r.handleDelete(ctx, runner)
	}
	if controllerutil.AddFinalizer(runner, DevboxRunnerFinalizer) {
		// the finalizer must be saved before the substrate space or console devbox exist, or deleting the runner
		// mid-reconcile orphans them; finalizer-only patches don't pass GenerationChangedPredicate, so requeue
		return ctrl.Result{RequeueAfter: time.Second}, nil
	}

	enabled, err := r.Agents.AgentsEnabled(ctx)
	if err != nil {
		utils.MarkCondition(runner.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	if !enabled {
		markAgentsNotAllowed(runner.SetCondition)
		return jitterRequeue(requeueAgentsNotAllowed, jitter), nil
	}

	if err := r.reconcileGateway(ctx, runner); err != nil {
		utils.MarkCondition(runner.SetCondition, v1alpha1.DevboxGatewayReadyConditionType, metav1.ConditionFalse, v1alpha1.ErrorConditionReason, err.Error())
		r.markReady(runner)
		return ctrl.Result{}, err
	}

	if err := r.reconcileEnv(ctx, runner); err != nil {
		logger.Error(err, "unable to resolve devbox env")
		utils.MarkCondition(runner.SetCondition, v1alpha1.DevboxEnvConditionType, metav1.ConditionFalse, v1alpha1.ErrorConditionReason, err.Error())
	}

	nextPoll, err := r.reconcileImage(ctx, runner)
	if err != nil {
		logger.Error(err, "unable to resolve devbox image")
		r.markReady(runner)
		r.trySyncConsole(ctx, runner)
		return jitterRequeue(requeueDevboxRunnerError, jitter), nil
	}
	// A contract failure only blocks a runner that never had a good digest; otherwise the last good one keeps serving.
	if runner.Status.ResolvedImage == nil {
		r.markReady(runner)
		r.trySyncConsole(ctx, runner)
		return ctrl.Result{RequeueAfter: nextPoll}, nil
	}

	api, err := r.Substrate.For(ctx, runner)
	if err != nil {
		return r.substrateError(ctx, runner, err)
	}
	atespace, err := r.ensureAtespace(ctx, api, runner)
	if err != nil {
		return r.substrateError(ctx, runner, err)
	}
	if err := r.reconcileWorkerPool(ctx, api, runner); err != nil {
		utils.MarkCondition(runner.SetCondition, v1alpha1.DevboxWorkerPoolReadyConditionType, metav1.ConditionFalse, v1alpha1.ErrorConditionReason, err.Error())
		r.markReady(runner)
		r.trySyncConsole(ctx, runner)
		return jitterRequeue(requeueDevboxRunnerError, jitter), nil
	}
	if usesZeroFS(runner) {
		if err := r.rollZeroFSNodes(ctx, api); err != nil {
			logger.Error(err, "unable to roll the ZeroFS node plugin")
		}
	}

	// The probe request carries the console ID, so the Devbox must exist before revisions advance.
	if err := r.syncConsole(ctx, runner); err != nil && runner.Status.ID == nil {
		return jitterRequeue(requeueDevboxRunnerError, jitter), nil
	}

	if err := r.reconcileRevisions(ctx, api, runner, atespace, lo.FromPtr(runner.Status.ResolvedImage)); err != nil {
		return r.substrateError(ctx, runner, err)
	}
	if err := r.gcRevisions(ctx, api, runner, atespace); err != nil {
		logger.Error(err, "unable to garbage collect devbox template revisions")
	}

	r.markReady(runner)
	_ = r.syncConsole(ctx, runner)
	return r.requeue(runner, nextPoll), nil
}

func (r *DevboxRunnerReconciler) substrateError(ctx context.Context, runner *v1alpha1.DevboxRunner, err error) (ctrl.Result, error) {
	utils.MarkCondition(runner.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.ErrorConditionReason, "Substrate API: "+err.Error())
	r.markReady(runner)
	_ = r.syncConsole(ctx, runner)
	return jitterRequeue(requeueDevboxRunnerError, jitter), nil
}

func (r *DevboxRunnerReconciler) requeue(runner *v1alpha1.DevboxRunner, nextPoll time.Duration) ctrl.Result {
	after := min(requeueDevboxRunner, r.Config.HeartbeatInterval)
	if nextPoll > 0 {
		after = min(after, nextPoll)
	}
	if runner.Spec.WorkerPool != nil && runner.Spec.WorkerPool.Autoscaling != nil {
		after = min(after, requeueDevboxAutoscale)
	}
	if lo.SomeBy(runner.Status.Revisions, func(rev v1alpha1.DevboxRevision) bool {
		return rev.Phase == v1alpha1.DevboxRevisionBuilding || rev.Phase == v1alpha1.DevboxRevisionProbing
	}) {
		after = requeueDevboxRunnerBuilding
	}
	return jitterRequeue(after, jitter)
}

// reconcileImage resolves spec.image to a digest when it changed or its poll interval elapsed, and checks the
// image contract. It returns the time until the next poll, zero for pinned images.
func (r *DevboxRunnerReconciler) reconcileImage(ctx context.Context, runner *v1alpha1.DevboxRunner) (time.Duration, error) {
	image := lo.FromPtr(runner.Spec.Image)
	if image == "" {
		image = r.Config.DevboxImage()
	}
	mode := runner.UpdateMode(image)
	interval := defaultPollInterval
	if p := runner.Spec.ImageUpdatePolicy; p != nil && p.Interval != nil && p.Interval.Duration > 0 {
		interval = p.Interval.Duration
	}

	nextPoll := time.Duration(0)
	due := runner.Status.ResolvedImage == nil || lo.FromPtr(runner.Status.ResolvedFrom) != image
	if !due && mode == v1alpha1.DevboxImageUpdatePoll {
		elapsed := time.Since(lo.FromPtr(runner.Status.ImageResolvedAt).Time)
		if elapsed >= interval {
			due = true
		} else {
			nextPoll = interval - elapsed
		}
	}
	if !due {
		return nextPoll, nil
	}
	if mode == v1alpha1.DevboxImageUpdatePoll {
		nextPoll = interval
	}

	resolved, err := r.Images.Resolve(ctx, image, runner.Spec.ImagePullSecrets)
	if err != nil {
		utils.MarkCondition(runner.SetCondition, v1alpha1.DevboxImageResolvedConditionType, metav1.ConditionFalse, v1alpha1.ErrorConditionReason, err.Error())
		return nextPoll, err
	}

	runner.Status.ResolvedFrom = &image
	runner.Status.ImageResolvedAt = lo.ToPtr(metav1.Now())
	utils.MarkCondition(runner.SetCondition, v1alpha1.DevboxImageResolvedConditionType, metav1.ConditionTrue, v1alpha1.ReadyConditionReason,
		fmt.Sprintf("%s resolved to %s", image, resolved.Digest))

	result := CheckDevboxImageContract(resolved, r.Config.OperatorVersion)
	runner.Status.DaemonVersion = lo.EmptyableToPtr(result.DaemonVersion)
	if !result.OK() {
		// The previous digest stays, so the serving revision keeps serving.
		utils.MarkCondition(runner.SetCondition, v1alpha1.DevboxImageContractConditionType, metav1.ConditionFalse, v1alpha1.DevboxImageContractViolatedReason,
			fmt.Sprintf("%s: %s", resolved.Reference, strings.Join(result.Violations, "; ")))
		return nextPoll, nil
	}

	runner.Status.ResolvedImage = &resolved.Reference
	utils.MarkCondition(runner.SetCondition, v1alpha1.DevboxImageContractConditionType, metav1.ConditionTrue, v1alpha1.ReadyConditionReason, "image meets devbox contract v1")
	if result.Outdated != "" {
		utils.MarkCondition(runner.SetCondition, v1alpha1.DevboxImageOutdatedConditionType, metav1.ConditionTrue, v1alpha1.DevboxImageOutdatedReason, result.Outdated)
	} else {
		utils.MarkCondition(runner.SetCondition, v1alpha1.DevboxImageOutdatedConditionType, metav1.ConditionFalse, v1alpha1.DevboxImageCurrentReason, "")
	}
	return nextPoll, nil
}

func (r *DevboxRunnerReconciler) markReady(runner *v1alpha1.DevboxRunner) {
	blocking := []v1alpha1.ConditionType{
		v1alpha1.DevboxImageContractConditionType,
		v1alpha1.DevboxGatewayReadyConditionType,
	}
	for _, t := range blocking {
		if c := meta.FindStatusCondition(runner.Status.Conditions, t.String()); c != nil && c.Status == metav1.ConditionFalse {
			utils.MarkCondition(runner.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReasonError, fmt.Sprintf("%s: %s", t, c.Message))
			return
		}
	}
	if runner.Status.TemplateRevision == nil {
		utils.MarkCondition(runner.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.DevboxPendingReason, "no template revision is ready yet")
		return
	}
	utils.MarkCondition(runner.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionTrue, v1alpha1.ReadyConditionReason,
		fmt.Sprintf("serving revision %d", *runner.Status.TemplateRevision))
}

func (r *DevboxRunnerReconciler) consoleStatus(runner *v1alpha1.DevboxRunner) console.DevboxStatus {
	switch {
	case meta.IsStatusConditionTrue(runner.Status.Conditions, v1alpha1.ReadyConditionType.String()):
		if latest := runner.LatestRevision(); latest != nil && latest.Phase == v1alpha1.DevboxRevisionFailed {
			return console.DevboxStatusDegraded
		}
		if meta.IsStatusConditionFalse(runner.Status.Conditions, v1alpha1.DevboxSubstrateInstallConditionType.String()) {
			return console.DevboxStatusDegraded
		}
		return console.DevboxStatusReady
	case runner.Status.TemplateRevision != nil:
		return console.DevboxStatusDegraded
	case meta.IsStatusConditionFalse(runner.Status.Conditions, v1alpha1.DevboxImageContractConditionType.String()),
		runner.LatestRevision() != nil && runner.LatestRevision().Phase == v1alpha1.DevboxRevisionFailed:
		return console.DevboxStatusFailed
	}
	return console.DevboxStatusPending
}

// syncConsole upserts the Devbox when its attributes changed and heartbeats it on every reconcile past the
// heartbeat interval, or when status, image, revision or conditions changed.
// trySyncConsole reports a runner's status on paths that are already failing; the next reconcile retries it.
func (r *DevboxRunnerReconciler) trySyncConsole(ctx context.Context, runner *v1alpha1.DevboxRunner) {
	if err := r.syncConsole(ctx, runner); err != nil {
		log.FromContext(ctx).Error(err, "unable to sync devbox runner to console")
	}
}

func (r *DevboxRunnerReconciler) syncConsole(ctx context.Context, runner *v1alpha1.DevboxRunner) error {
	logger := log.FromContext(ctx)

	var catalog *DevboxProbeResult
	if runner.Status.TemplateRevision != nil {
		var err error
		if catalog, err = r.Probe.Result(ctx, runner.Name, *runner.Status.TemplateRevision); err != nil {
			logger.Error(err, "unable to read devbox agent catalog")
		}
		runner.Status.Agents = devboxAgentStatuses(catalog)
	}

	attrs, err := r.devboxAttributes(runner, catalog)
	if err != nil {
		return err
	}
	sha, err := utils.HashObject(attrs)
	if err != nil {
		return err
	}

	if runner.Status.ID == nil {
		existing, err := r.Console.GetDevboxByName(ctx, attrs.Name)
		if err != nil {
			utils.MarkCondition(runner.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return err
		}
		if existing != nil {
			runner.Status.ID = &existing.ID
		}
	}

	if runner.Status.ID == nil || !runner.Status.IsSHAEqual(sha) {
		devbox, err := r.Console.UpsertDevbox(ctx, attrs)
		if err != nil {
			utils.MarkCondition(runner.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return err
		}
		runner.Status.ID = &devbox.ID
		runner.Status.SHA = &sha
	}

	heartbeat := r.heartbeatAttributes(runner)
	hbSha, err := utils.HashObject(heartbeat)
	if err != nil {
		return err
	}
	last, _ := r.heartbeats.Load(runner.UID)
	stale := runner.Status.LastHeartbeat == nil || time.Since(runner.Status.LastHeartbeat.Time) >= r.Config.HeartbeatInterval
	if stale || last != hbSha {
		if err := r.Console.HeartbeatDevbox(ctx, *runner.Status.ID, heartbeat); err != nil {
			utils.MarkCondition(runner.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return err
		}
		r.heartbeats.Store(runner.UID, hbSha)
		runner.Status.LastHeartbeat = lo.ToPtr(metav1.Now())
	}

	utils.MarkCondition(runner.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	return nil
}

func (r *DevboxRunnerReconciler) heartbeatAttributes(runner *v1alpha1.DevboxRunner) console.DevboxHeartbeatAttributes {
	return console.DevboxHeartbeatAttributes{
		Status:           lo.ToPtr(r.consoleStatus(runner)),
		ResolvedImage:    r.servingImage(runner),
		TemplateRevision: runner.Status.TemplateName,
		Conditions:       devboxConsoleConditions(runner),
	}
}

// servingImage is the image of the serving revision, which may lag status.resolvedImage while a new one builds.
func (r *DevboxRunnerReconciler) servingImage(runner *v1alpha1.DevboxRunner) *string {
	if runner.Status.TemplateRevision != nil {
		if rev := runner.RevisionByNumber(*runner.Status.TemplateRevision); rev != nil {
			return &rev.Image
		}
	}
	return runner.Status.ResolvedImage
}

func devboxConsoleConditions(runner *v1alpha1.DevboxRunner) []*console.DevboxConditionAttributes {
	return lo.Map(runner.Status.Conditions, func(c metav1.Condition, _ int) *console.DevboxConditionAttributes {
		return &console.DevboxConditionAttributes{
			Type:    c.Type,
			Status:  string(c.Status),
			Reason:  lo.EmptyableToPtr(c.Reason),
			Message: lo.EmptyableToPtr(c.Message),
		}
	})
}

// devboxAttributes builds the upsert. The template revision sent to console is the ActorTemplate name of the
// serving revision; the gateway starts instances from its golden tag in status.atespace.
func (r *DevboxRunnerReconciler) devboxAttributes(runner *v1alpha1.DevboxRunner, catalog *DevboxProbeResult) (console.DevboxAttributes, error) {
	image := lo.FromPtr(runner.Spec.Image)
	if image == "" {
		image = r.Config.DevboxImage()
	}

	res := lo.FromPtr(runner.Spec.Resources)
	resources := map[string]string{}
	for k, q := range map[string]*resource.Quantity{"cpu": res.CPU, "memory": res.Memory, "disk": res.Disk} {
		if q != nil {
			resources[k] = q.String()
		}
	}
	resourcesJSON, err := json.Marshal(resources)
	if err != nil {
		return console.DevboxAttributes{}, err
	}

	attrs := console.DevboxAttributes{
		Name:                runner.ConsoleName(),
		Image:               &image,
		ResolvedImage:       r.servingImage(runner),
		TemplateRevision:    runner.Status.TemplateName,
		Resources:           lo.ToPtr(string(resourcesJSON)),
		AllowedRepositories: lo.ToSlicePtr(runner.Spec.AllowedRepositories),
		Browser:             lo.ToPtr(runner.Spec.Browser != nil && runner.Spec.Browser.Enabled),
		ScmConnections:      lo.ToSlicePtr(runner.Spec.ScmConnections),
		Agents:              devboxAgentAttributes(runner, catalog),
		HTTPAllowlist: append(lo.Map(runner.Spec.HTTPAllowlist, func(e v1alpha1.DevboxHTTPAllowlistEntry, _ int) *console.DevboxHTTPAllowAttributes {
			return &console.DevboxHTTPAllowAttributes{Host: e.Host, Port: lo.ToPtr(int64(lo.FromPtrOr(e.Port, 443))), Passthrough: e.Passthrough}
		}), lo.Map(runner.Spec.EgressPresetHosts(), func(h string, _ int) *console.DevboxHTTPAllowAttributes {
			return &console.DevboxHTTPAllowAttributes{Host: h, Port: lo.ToPtr(int64(443))}
		})...),
		IdlePolicy: devboxIdlePolicyAttributes(runner.Spec.IdlePolicy),
		Autonomy:   devboxAutonomyAttributes(runner),
	}
	if wp := runner.Spec.WorkerPool; wp != nil && wp.MaxInstances != nil {
		attrs.MaxInstances = lo.ToPtr(int64(*wp.MaxInstances))
	}
	if b := runner.Spec.Bindings; b != nil {
		attrs.CreateBindings = lo.Map(b.Create, func(b v1alpha1.Binding, _ int) *console.AgentBindingAttributes {
			return &console.AgentBindingAttributes{UserEmail: b.UserEmail, GroupName: b.GroupName}
		})
	}
	return attrs, nil
}

// devboxAgentAttributes merges the declared agents with the probed catalog of the serving revision. Before a
// revision has been probed the declared agents are sent with a PENDING probe status.
func devboxAgentAttributes(runner *v1alpha1.DevboxRunner, catalog *DevboxProbeResult) []*console.DevboxAgentAttributes {
	probed := map[v1alpha1.DevboxAgentType]*devboxv1.AgentCatalogEntry{}
	if catalog != nil {
		for _, e := range catalog.Response.GetAgents() {
			probed[devboxAgentTypeFromProto(e.GetType())] = e
		}
	}

	return lo.Map(runner.Spec.Agents, func(a v1alpha1.DevboxAgent, _ int) *console.DevboxAgentAttributes {
		attrs := &console.DevboxAgentAttributes{
			Type:          console.DevboxAgentType(strings.ToUpper(string(a.Type))),
			Default:       lo.ToPtr(lo.FromPtr(a.Default)),
			AdapterPin:    a.AdapterVersion,
			AcpV2:         lo.ToPtr(lo.FromPtr(a.ACPV2)),
			AllowedModels: lo.ToSlicePtr(a.Models),
			DefaultModel:  a.DefaultModel,
			ProbeStatus:   lo.ToPtr(console.DevboxProbeStatusPending),
		}
		e, ok := probed[a.Type]
		if !ok {
			return attrs
		}

		attrs.ProbeStatus = lo.ToPtr(console.DevboxProbeStatus(probeStatusName(e.GetProbeStatus())))
		attrs.ProbeError = lo.EmptyableToPtr(e.GetProbeError())
		attrs.AdapterName = lo.EmptyableToPtr(e.GetAdapterName())
		attrs.AdapterVersion = lo.EmptyableToPtr(e.GetAdapterVersion())
		if v := e.GetProtocolVersion(); v != 0 {
			attrs.ProtocolVersion = lo.ToPtr(int64(v))
		}
		attrs.CurrentModel = lo.EmptyableToPtr(e.GetCurrentModel())
		if attrs.DefaultModel == nil {
			attrs.DefaultModel = lo.EmptyableToPtr(e.GetDefaultModel())
		}
		attrs.ModelSwitchable = lo.ToPtr(e.GetModelSwitchable())
		if caps := e.GetCapabilities(); caps != nil {
			if raw, err := json.Marshal(caps.GetRaw().AsMap()); err == nil && caps.GetRaw() != nil {
				attrs.Capabilities = lo.ToPtr(string(raw))
			}
			if l := caps.GetLifecycle(); l != nil {
				attrs.SessionCapabilities = &console.DevboxSessionCapabilitiesAttributes{
					List: lo.ToPtr(l.GetList()), Resume: lo.ToPtr(l.GetResume()), Load: lo.ToPtr(l.GetLoad()),
					Close: lo.ToPtr(l.GetClose()), Delete: lo.ToPtr(l.GetDelete()), Fork: lo.ToPtr(l.GetFork()),
				}
			}
		}
		attrs.Models = lo.Map(e.GetModels(), func(m *devboxv1.ConfigOptionValue, _ int) *console.DevboxModelAttributes {
			return &console.DevboxModelAttributes{ID: m.GetValue(), Name: lo.EmptyableToPtr(m.GetName()), Description: lo.EmptyableToPtr(m.GetDescription())}
		})
		attrs.Commands = lo.Map(e.GetInitialCommands(), func(c *devboxv1.AvailableCommand, _ int) *console.DevboxCommandAttributes {
			return &console.DevboxCommandAttributes{Name: c.GetName(), Description: lo.EmptyableToPtr(c.GetDescription()), InputHint: lo.EmptyableToPtr(c.GetInput().GetHint())}
		})
		attrs.ConfigOptions = lo.Map(e.GetConfigOptions(), func(o *devboxv1.ConfigOption, _ int) *console.DevboxConfigOptionAttributes {
			return &console.DevboxConfigOptionAttributes{
				ConfigID:     o.GetId(),
				Name:         lo.EmptyableToPtr(o.GetName()),
				Description:  lo.EmptyableToPtr(o.GetDescription()),
				Category:     lo.EmptyableToPtr(o.GetCategory()),
				Type:         lo.EmptyableToPtr(o.GetType()),
				CurrentValue: lo.EmptyableToPtr(o.GetCurrentValue()),
				Options: lo.Map(o.GetOptions(), func(v *devboxv1.ConfigOptionValue, _ int) *console.DevboxConfigValueOptionAttributes {
					return &console.DevboxConfigValueOptionAttributes{
						Value: v.GetValue(), Name: lo.EmptyableToPtr(v.GetName()), Description: lo.EmptyableToPtr(v.GetDescription()), Group: lo.EmptyableToPtr(v.GetGroup()),
					}
				}),
			}
		})
		return attrs
	})
}

func devboxAutonomyAttributes(runner *v1alpha1.DevboxRunner) *console.DevboxAutonomyAttributes {
	def, maxLevel := runner.Spec.AutonomyPolicy()
	return &console.DevboxAutonomyAttributes{
		Default: lo.ToPtr(console.DevboxAutonomy(strings.ToUpper(string(def)))),
		Max:     lo.ToPtr(console.DevboxAutonomy(strings.ToUpper(string(maxLevel)))),
	}
}

func devboxIdlePolicyAttributes(p *v1alpha1.DevboxIdlePolicy) *console.DevboxIdlePolicyAttributes {
	if p == nil {
		return nil
	}
	seconds := func(d *metav1.Duration) *int64 {
		if d == nil {
			return nil
		}
		return lo.ToPtr(int64(d.Seconds()))
	}
	attrs := &console.DevboxIdlePolicyAttributes{
		ActivityWindow:     seconds(p.ActivityWindow),
		GracePeriod:        seconds(p.GracePeriod),
		MaxDeferral:        seconds(p.MaxDeferral),
		MaxContinuousAwake: seconds(p.MaxContinuousAwake),
		CompleteAfter:      seconds(p.CompleteAfter),
	}
	if p.CPUThreshold != nil {
		if v, err := strconv.ParseFloat(strings.TrimSuffix(*p.CPUThreshold, "%"), 64); err == nil {
			attrs.CPUThreshold = &v
		}
	}
	return attrs
}

// handleDelete drains the runner: console stops placing new instances (the Devbox heartbeats as draining),
// running instances get DrainTimeout to suspend, the console Devbox is deleted (blocked while workbench
// snapshots of it exist), and then every Substrate object of the runner goes, the gateway with the last runner.
func (r *DevboxRunnerReconciler) handleDelete(ctx context.Context, runner *v1alpha1.DevboxRunner) (ctrl.Result, error) {
	if !controllerutil.ContainsFinalizer(runner, DevboxRunnerFinalizer) {
		return ctrl.Result{}, nil
	}
	atespace := lo.FromPtr(runner.Status.Atespace)

	if runner.Status.ID != nil {
		utils.MarkCondition(runner.SetCondition, v1alpha1.DevboxDrainingConditionType, metav1.ConditionTrue, v1alpha1.DevboxInstancesRunningReason, "DevboxRunner is being deleted")
		_ = r.Console.HeartbeatDevbox(ctx, *runner.Status.ID, console.DevboxHeartbeatAttributes{
			Status:     lo.ToPtr(console.DevboxStatusDegraded),
			Conditions: devboxConsoleConditions(runner),
		})
	}

	var api substrate.API
	if atespace != "" {
		var err error
		if api, err = r.Substrate.For(ctx, runner); err != nil {
			return r.deleteBlocked(runner, v1alpha1.ErrorConditionReason, "Substrate API: "+err.Error())
		}
		actors, err := api.ListActors(ctx, atespace)
		if err != nil && !substrate.IsNotFound(err) {
			return r.deleteBlocked(runner, v1alpha1.ErrorConditionReason, "listing instances: "+err.Error())
		}
		running := runningActors(actors)
		if len(running) > 0 && time.Since(runner.DeletionTimestamp.Time) < r.Config.DrainTimeout {
			return r.deleteBlocked(runner, v1alpha1.DevboxInstancesRunningReason,
				fmt.Sprintf("waiting up to %s for %d running instances to suspend", r.Config.DrainTimeout, len(running)))
		}
	}

	if runner.Status.ID != nil {
		err := r.Console.DeleteDevbox(ctx, *runner.Status.ID)
		if errors.Is(err, ErrDevboxSnapshotsRemain) {
			return r.deleteBlocked(runner, v1alpha1.DevboxSnapshotsRemainReason, "delete the workbench snapshots of this devbox in console first")
		}
		if err != nil {
			return r.deleteBlocked(runner, v1alpha1.ErrorConditionReason, "deleting console devbox: "+err.Error())
		}
		runner.Status.ID = nil
	}

	if atespace != "" {
		if err := r.deleteSubstrateObjects(ctx, api, runner, atespace); err != nil {
			return r.deleteBlocked(runner, v1alpha1.ErrorConditionReason, err.Error())
		}
	}
	for _, rev := range runner.Status.Revisions {
		if err := r.Probe.Cleanup(ctx, runner.Name, rev.Revision); err != nil {
			return ctrl.Result{}, err
		}
	}
	if err := r.deleteWorkerPool(ctx, runner); err != nil {
		return ctrl.Result{}, err
	}

	last, err := r.isLastRunner(ctx, runner)
	if err != nil {
		return ctrl.Result{}, err
	}
	if last {
		if err := r.deleteGateway(ctx); err != nil {
			return ctrl.Result{}, err
		}
	}

	if err := r.setRunnerEnv(ctx, runner.Name, nil); err != nil {
		return ctrl.Result{}, err
	}
	r.heartbeats.Delete(runner.UID)
	controllerutil.RemoveFinalizer(runner, DevboxRunnerFinalizer)
	return ctrl.Result{}, nil
}

func (r *DevboxRunnerReconciler) deleteBlocked(runner *v1alpha1.DevboxRunner, reason v1alpha1.ConditionReason, message string) (ctrl.Result, error) {
	utils.MarkCondition(runner.SetCondition, v1alpha1.DevboxDrainingConditionType, metav1.ConditionTrue, reason, message)
	utils.MarkCondition(runner.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, reason, message)
	return jitterRequeue(requeueAfter, jitter), nil
}

func (r *DevboxRunnerReconciler) deleteSubstrateObjects(ctx context.Context, api substrate.API, runner *v1alpha1.DevboxRunner, atespace string) error {
	actors, err := api.ListActors(ctx, atespace)
	if err != nil && !substrate.IsNotFound(err) {
		return fmt.Errorf("listing actors: %w", err)
	}
	for _, a := range actors {
		if err := api.DeleteActor(ctx, atespace, a.GetMetadata().GetName()); err != nil {
			return fmt.Errorf("deleting actor %s: %w", a.GetMetadata().GetName(), err)
		}
	}

	tags, err := api.ListTags(ctx, atespace)
	if err != nil && !substrate.IsNotFound(err) {
		return fmt.Errorf("listing tags: %w", err)
	}
	for _, t := range tags {
		if err := api.DeleteTag(ctx, atespace, t.GetMetadata().GetName()); err != nil {
			return fmt.Errorf("deleting tag %s: %w", t.GetMetadata().GetName(), err)
		}
	}

	templates, err := api.ListActorTemplates(ctx, atespace)
	if err != nil && !substrate.IsNotFound(err) {
		return fmt.Errorf("listing ActorTemplates: %w", err)
	}
	for _, t := range templates {
		if err := api.DeleteActorTemplate(ctx, atespace, t.GetMetadata().GetName()); err != nil {
			return fmt.Errorf("deleting ActorTemplate %s: %w", t.GetMetadata().GetName(), err)
		}
	}

	if err := api.DeleteAtespace(ctx, atespace); err != nil {
		return fmt.Errorf("deleting atespace %s: %w", atespace, err)
	}
	runner.Status.Revisions = nil
	return nil
}

func (r *DevboxRunnerReconciler) isLastRunner(ctx context.Context, runner *v1alpha1.DevboxRunner) (bool, error) {
	list := &v1alpha1.DevboxRunnerList{}
	if err := r.List(ctx, list); err != nil {
		return false, err
	}
	return !lo.SomeBy(list.Items, func(other v1alpha1.DevboxRunner) bool {
		return other.UID != runner.UID && other.DeletionTimestamp.IsZero()
	}), nil
}

func (r *DevboxRunnerReconciler) SetupWithManager(mgr ctrl.Manager) error {
	b := ctrl.NewControllerManagedBy(mgr).
		Named("devboxrunner").
		WithOptions(controller.Options{MaxConcurrentReconciles: 1, CacheSyncTimeout: r.CacheSyncTimeout}).
		For(&v1alpha1.DevboxRunner{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Watches(&appsv1.Deployment{}, handler.EnqueueRequestsFromMapFunc(r.allRunners), builder.WithPredicates(predicate.NewPredicateFuncs(func(obj client.Object) bool {
			return obj.GetLabels()[devboxGatewayManagedLabel] == stringTrue
		})))

	if r.WatchWorkerPools {
		pool := &unstructured.Unstructured{}
		pool.SetGroupVersionKind(workerPoolGVK)
		b = b.Owns(pool)
	}
	return b.Complete(r)
}

func (r *DevboxRunnerReconciler) allRunners(ctx context.Context, _ client.Object) []reconcile.Request {
	list := &v1alpha1.DevboxRunnerList{}
	if err := r.List(ctx, list); err != nil {
		return nil
	}
	return lo.Map(list.Items, func(runner v1alpha1.DevboxRunner, _ int) reconcile.Request {
		return reconcile.Request{NamespacedName: types.NamespacedName{Name: runner.Name}}
	})
}
