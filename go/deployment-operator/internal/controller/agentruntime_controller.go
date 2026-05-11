package controller

import (
	"context"
	"fmt"
	"time"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/polly/algorithms"
	"github.com/pluralsh/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/deployment-operator/internal/utils"
	consoleclient "github.com/pluralsh/deployment-operator/pkg/client"
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	utilerrors "k8s.io/apimachinery/pkg/util/errors"

	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
)

const (
	AgentRuntimeFinalizer    = "deployments.plural.sh/agent-runtime-protection"
	requeueAfterAgentRuntime = 2 * time.Minute
)

// AgentRuntimeReconciler reconciles a AgentRuntime object
type AgentRuntimeReconciler struct {
	client.Client
	ConsoleClient    consoleclient.Client
	Scheme           *runtime.Scheme
	CacheSyncTimeout time.Duration
	Ctx              context.Context
	ClusterID        string
}

//+kubebuilder:rbac:groups=deployments.plural.sh,resources=agentruntimes,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=agentruntimes/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=agentruntimes/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.16.3/pkg/reconcile
func (r *AgentRuntimeReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, retErr error) {
	logger := log.FromContext(ctx)

	agentRuntime := &v1alpha1.AgentRuntime{}
	if err := r.Get(ctx, req.NamespacedName, agentRuntime); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	scope, err := NewDefaultScope(ctx, r.Client, agentRuntime)
	if err != nil {
		return ctrl.Result{}, err
	}

	// Always patch object when exiting this function, so we can persist any object changes.
	defer func() {
		if err := scope.PatchObject(); err != nil && retErr == nil {
			retErr = err
		}
	}()

	utils.MarkCondition(agentRuntime.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(agentRuntime.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReason, "")

	result := r.addOrRemoveFinalizer(ctx, agentRuntime)
	if result != nil {
		return *result, nil
	}

	changed, sha, err := agentRuntime.Diff(utils.HashObject)
	if err != nil {
		logger.Error(err, "unable to calculate agent runtime SHA")
		utils.MarkCondition(agentRuntime.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Upsert agent runtime if it doesn't exist.
	if _, err := r.ConsoleClient.GetAgentRuntimeByName(ctx, agentRuntime.ConsoleName(), r.ClusterID); err != nil {
		if errors.IsNotFound(err) {
			changed = true
		}
	}

	if changed {
		_, err := r.ConsoleClient.UpsertAgentRuntime(ctx, agentRuntime.Attributes())
		if err != nil {
			return handleRequeue(nil, err, agentRuntime.SetCondition)
		}
	}
	apiAgentRuntime, err := r.ConsoleClient.GetAgentRuntimeByName(ctx, agentRuntime.ConsoleName(), r.ClusterID)
	if err != nil {
		utils.MarkCondition(agentRuntime.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	agentRuntime.Status.ID = &apiAgentRuntime.ID
	agentRuntime.Status.SHA = &sha

	// Mark as synchronized after the agent runtime is synchronized with the Console API.
	utils.MarkCondition(agentRuntime.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

	var allErrors []error
	pager := r.ListAgentRuntimePendingRuns(ctx, agentRuntime.Status.GetID())
	for pager.HasNext() {
		runs, err := pager.NextPage()
		if err != nil {
			return ctrl.Result{}, fmt.Errorf("failed to fetch agent runtime pending runs: %w", err)
		}

		for _, run := range runs {
			if err := r.createAgentRun(ctx, agentRuntime, run.Node); err != nil {
				logger.Error(err, "failed to create agent run", "id", run.Node.ID)
				allErrors = append(allErrors, err)
			}
		}
	}

	if len(allErrors) > 0 {
		utils.MarkCondition(agentRuntime.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReasonError, utilerrors.NewAggregate(allErrors).Error())
		return jitterRequeue(requeueAfterAgentRuntime, jitter), nil
	}

	// Mark as ready after the agent run custom resources are created.
	utils.MarkCondition(agentRuntime.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return jitterRequeue(requeueAfterAgentRuntime, jitter), nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *AgentRuntimeReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1, CacheSyncTimeout: r.CacheSyncTimeout}).
		For(&v1alpha1.AgentRuntime{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(r)
}

func (r *AgentRuntimeReconciler) ListAgentRuntimePendingRuns(ctx context.Context, id string) *algorithms.Pager[*console.ListAgentRuntimePendingRuns_AgentRuntime_PendingRuns_Edges] {
	logger := log.FromContext(ctx)
	fetch := func(page *string, size int64) ([]*console.ListAgentRuntimePendingRuns_AgentRuntime_PendingRuns_Edges, *algorithms.PageInfo, error) {
		resp, err := r.ConsoleClient.ListAgentRuntimePendingRuns(ctx, id, page, &size)
		if err != nil {
			logger.Error(err, "failed to fetch stack run")
			return nil, nil, err
		}
		pageInfo := &algorithms.PageInfo{
			HasNext:  resp.PageInfo.HasNextPage,
			After:    resp.PageInfo.EndCursor,
			PageSize: size,
		}
		return resp.Edges, pageInfo, nil
	}
	return algorithms.NewPager[*console.ListAgentRuntimePendingRuns_AgentRuntime_PendingRuns_Edges](100, fetch)
}

func (r *AgentRuntimeReconciler) addOrRemoveFinalizer(ctx context.Context, agentRuntime *v1alpha1.AgentRuntime) *ctrl.Result {
	if agentRuntime.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(agentRuntime, AgentRuntimeFinalizer) {
		controllerutil.AddFinalizer(agentRuntime, AgentRuntimeFinalizer)
	}

	// If the agent runtime is being deleted, cleanup and remove the finalizer.
	if !agentRuntime.GetDeletionTimestamp().IsZero() {
		existingAgentRuntime, err := r.ConsoleClient.GetAgentRuntimeByName(ctx, agentRuntime.ConsoleName(), r.ClusterID)
		if err != nil {
			if errors.IsNotFound(err) {
				controllerutil.RemoveFinalizer(agentRuntime, AgentRuntimeFinalizer)
				return &ctrl.Result{}
			}
			utils.MarkCondition(agentRuntime.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return lo.ToPtr(jitterRequeue(requeueAfter, jitter))
		}

		// Remove agent runs.
		agentRuns := &v1alpha1.AgentRunList{}
		if err := r.List(ctx, agentRuns, client.InNamespace(agentRuntime.Spec.TargetNamespace), client.MatchingLabels{v1alpha1.AgentRuntimeNameLabel: agentRuntime.Name}); err != nil {
			utils.MarkCondition(agentRuntime.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return lo.ToPtr(jitterRequeue(requeueAfter, jitter))
		}

		for _, agentRun := range agentRuns.Items {
			if err := r.Delete(ctx, &agentRun); err != nil {
				utils.MarkCondition(agentRuntime.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return lo.ToPtr(jitterRequeue(requeueWaitForResources, jitter))
			}
		}

		// Remove agent runtime from Console API if it exists.
		if err = r.ConsoleClient.DeleteAgentRuntime(ctx, existingAgentRuntime.ID); err != nil {
			// If it fails to delete the external dependency here, return with the error so that it can be retried.
			utils.MarkCondition(agentRuntime.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return lo.ToPtr(jitterRequeue(requeueAfter, jitter))
		}

		// If finalizer is present, remove it.
		controllerutil.RemoveFinalizer(agentRuntime, AgentRuntimeFinalizer)

		// Stop reconciliation as the item does no longer exist.
		return &ctrl.Result{}
	}

	return nil
}

func (r *AgentRuntimeReconciler) Publish(runID string, kick bool) {
	logger := log.FromContext(r.Ctx)
	logger.Info("received websocket agent run event", "id", runID, "kick", kick)

	err := r.createRunFromID(runID)
	if err != nil {
		logger.Error(err, "failed to process websocket agent run event", "id", runID, "kick", kick)
	}
}

func (r *AgentRuntimeReconciler) createRunFromID(runID string) error {
	logger := log.FromContext(r.Ctx)
	run, err := r.ConsoleClient.GetAgentRun(r.Ctx, runID)
	if err != nil {
		return fmt.Errorf("failed to get agent run: %w", err)
	}
	if run.Runtime == nil || run.Runtime.Name == "" {
		return fmt.Errorf("agent run %q runtime details are missing", runID)
	}

	agentRuntime := &v1alpha1.AgentRuntime{}
	if err := r.Get(r.Ctx, types.NamespacedName{Name: run.Runtime.Name, Namespace: ""}, agentRuntime); err != nil {
		if errors.IsNotFound(err) {
			logger.Info("agent runtime for websocket agent run event not found", "id", runID, "runtime", run.Runtime.Name)
		}
		return client.IgnoreNotFound(err)
	}

	return r.createAgentRun(r.Ctx, agentRuntime, run)
}

func (r *AgentRuntimeReconciler) createAgentRun(ctx context.Context, agentRuntime *v1alpha1.AgentRuntime, run *console.AgentRunFragment) error {
	logger := log.FromContext(ctx)
	key := client.ObjectKey{Name: run.ID, Namespace: agentRuntime.Spec.TargetNamespace}

	if err := r.Get(ctx, key, &v1alpha1.AgentRun{}); err == nil {
		logger.Info("agent run already exists", "id", run.ID)
		return nil
	} else if !errors.IsNotFound(err) {
		return fmt.Errorf("failed to lookup agent run: %w", err)
	}

	agentRun := &v1alpha1.AgentRun{
		ObjectMeta: metav1.ObjectMeta{
			Name:      run.ID,
			Namespace: agentRuntime.Spec.TargetNamespace,
			Labels: map[string]string{
				v1alpha1.AgentRuntimeNameLabel: agentRuntime.Name,
				v1alpha1.AgentRunIDLabel:       run.ID,
			},
		},
		Spec: v1alpha1.AgentRunSpec{
			RuntimeRef:      v1alpha1.AgentRuntimeReference{Name: agentRuntime.Name},
			Prompt:          run.Prompt,
			Repository:      run.Repository,
			Mode:            run.Mode,
			Language:        run.Language,
			LanguageVersion: run.LanguageVersion,
		},
	}
	if run.Flow != nil {
		agentRun.Spec.FlowID = lo.ToPtr(run.Flow.ID)
	}

	if err := r.ensureTargetNamespace(ctx, agentRuntime.Spec.TargetNamespace); err != nil {
		return fmt.Errorf("failed to ensure namespace: %w", err)
	}

	if err := r.Create(ctx, agentRun); err != nil {
		if errors.IsAlreadyExists(err) {
			return nil
		}
		return fmt.Errorf("failed to create agent run: %w", err)
	}

	return nil
}

func (r *AgentRuntimeReconciler) ensureTargetNamespace(ctx context.Context, namespace string) error {
	if namespace == "" {
		return fmt.Errorf("target namespace is required")
	}

	if err := r.Get(ctx, client.ObjectKey{Name: namespace}, &corev1.Namespace{}); err != nil {
		if !errors.IsNotFound(err) {
			return err
		}

		return r.Create(ctx, &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: namespace}})
	}

	return nil
}
