package controller

import (
	"context"
	"fmt"

	"github.com/pluralsh/console/go/controller/internal/common"
	"github.com/pluralsh/console/go/controller/internal/credentials"
	"sigs.k8s.io/controller-runtime/pkg/controller"

	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/api/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	console "github.com/pluralsh/console/go/client"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	consoleclient "github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/utils"
)

// WorkbenchReconciler reconciles a v1alpha1.Workbench object.
// Implements reconcile.Reconciler and types.Controller.
type WorkbenchReconciler struct {
	client.Client
	ConsoleClient    consoleclient.ConsoleClient
	Scheme           *runtime.Scheme
	CredentialsCache credentials.NamespaceCredentialsCache
}

const (
	// WorkbenchProtectionFinalizerName defines the name for the main finalizer that synchronizes
	// resource deletion from the Console API prior to removing the CRD.
	WorkbenchProtectionFinalizerName = "workbenches.deployments.plural.sh/workbench-protection"
)

// +kubebuilder:rbac:groups=deployments.plural.sh,resources=workbenches,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=workbenches/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=workbenches/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the v1alpha1.Workbench closer to the desired state
// and syncs it with the Console API state.
func (in *WorkbenchReconciler) Reconcile(ctx context.Context, req reconcile.Request) (_ reconcile.Result, reterr error) {
	logger := log.FromContext(ctx)

	workbench := new(v1alpha1.Workbench)
	if err := in.Get(ctx, req.NamespacedName, workbench); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	scope, err := common.NewDefaultScope(ctx, in.Client, workbench)
	if err != nil {
		logger.Error(err, "failed to create scope")
		return ctrl.Result{}, err
	}
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()

	// Switch to namespace credentials if configured. This has to be done before sending any request to the console.
	nc, err := in.ConsoleClient.UseCredentials(req.Namespace, in.CredentialsCache)
	credentials.SyncCredentialsInfo(workbench, workbench.SetCondition, nc, err)
	if err != nil {
		logger.Error(err, "failed to use namespace credentials", "namespaceCredentials", nc, "namespacedName", req.NamespacedName)
		utils.MarkCondition(workbench.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, fmt.Sprintf("failed to use %s namespace credentials: %s", nc, err.Error()))
		return ctrl.Result{}, err
	}

	// Mark the resource as not ready. This will be overridden in the end.
	utils.MarkCondition(workbench.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	// Check if the resource already exists in the API and only sync the ID.
	exists, err := in.isAlreadyExists(ctx, workbench)
	if err != nil {
		utils.MarkCondition(workbench.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	if exists && !workbench.Spec.Reconciliation.DriftDetect() {
		utils.MarkReadOnly(workbench)
		return in.handleExistingWorkbench(ctx, workbench)
	}

	// Handle proper resource deletion via finalizer
	result := in.addOrRemoveFinalizer(ctx, workbench)
	if result != nil {
		return *result, nil
	}

	// Mark resource as managed by this operator.
	utils.MarkCondition(workbench.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionFalse, v1alpha1.ReadonlyConditionReason, "")

	// Get Workbench SHA that can be saved back in the status to check for changes
	changed, sha, err := workbench.Diff(utils.HashObject)
	if err != nil {
		logger.Error(err, "unable to calculate workbench SHA")
		utils.MarkCondition(workbench.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Get the project for the workbench.
	project, res, err := common.Project(ctx, in.Client, in.Scheme, workbench)
	if res != nil || err != nil {
		return common.HandleRequeue(res, err, workbench.SetCondition)
	}

	// Get the repository for the workbench.
	repositoryID, res, err := in.handleRepositoryRef(ctx, workbench)
	if res != nil || err != nil {
		return common.HandleRequeue(res, err, workbench.SetCondition)
	}

	// Get the agent runtime for the workbench.
	agentRuntimeID, res, err := in.handleAgentRuntime(ctx, workbench)
	if res != nil || err != nil {
		return common.HandleRequeue(res, err, workbench.SetCondition)
	}

	// Get the workbench tools for the workbench.
	toolIDs, res, err := in.handleWorkbenchTools(ctx, workbench)
	if res != nil || err != nil {
		return common.HandleRequeue(res, err, workbench.SetCondition)
	}

	// Sync Workbench CRD with the Console API
	apiWorkbench, err := in.sync(ctx, workbench, project, repositoryID, agentRuntimeID, toolIDs, changed)
	if err != nil {
		return common.HandleRequeue(nil, err, workbench.SetCondition)
	}

	workbench.Status.ID = &apiWorkbench.ID
	workbench.Status.SHA = &sha

	utils.MarkCondition(workbench.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(workbench.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

	return workbench.Spec.Reconciliation.Requeue(), nil
}

func (in *WorkbenchReconciler) addOrRemoveFinalizer(ctx context.Context, workbench *v1alpha1.Workbench) *ctrl.Result {
	if workbench.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(workbench, WorkbenchProtectionFinalizerName) {
		controllerutil.AddFinalizer(workbench, WorkbenchProtectionFinalizerName)
	}

	// If the workbench is being deleted, cleanup and remove the finalizer.
	if !workbench.DeletionTimestamp.IsZero() {
		// If the workbench does not have an ID, the finalizer can be removed.
		if !workbench.Status.HasID() {
			controllerutil.RemoveFinalizer(workbench, WorkbenchProtectionFinalizerName)
			return &ctrl.Result{}
		}

		exists, err := in.ConsoleClient.IsWorkbenchExists(ctx, workbench.Status.ID, nil)
		if err != nil {
			return lo.ToPtr(workbench.Spec.Reconciliation.Requeue())
		}

		// Remove the workbench from Console API if it exists.
		if exists {
			if err = in.ConsoleClient.DeleteWorkbench(ctx, workbench.Status.GetID()); err != nil {
				// If it fails to delete the external dependency here, return with the error
				// so that it can be retried.
				utils.MarkCondition(workbench.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return lo.ToPtr(workbench.Spec.Reconciliation.Requeue())
			}
		}

		// If our finalizer is present, remove it.
		controllerutil.RemoveFinalizer(workbench, WorkbenchProtectionFinalizerName)

		// Stop reconciliation as the item does no longer exist.
		return &ctrl.Result{}
	}

	return nil
}

func (in *WorkbenchReconciler) isAlreadyExists(ctx context.Context, workbench *v1alpha1.Workbench) (bool, error) {
	if workbench.Status.HasReadonlyCondition() {
		return workbench.Status.IsReadonly(), nil
	}

	_, err := in.ConsoleClient.GetWorkbenchTiny(ctx, nil, lo.ToPtr(workbench.ConsoleName()))
	if errors.IsNotFound(err) {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	if !workbench.Status.HasID() {
		log.FromContext(ctx).Info("Workbench already exists in the API, running in read-only mode")
		return true, nil
	}

	return false, nil
}

func (in *WorkbenchReconciler) handleExistingWorkbench(ctx context.Context, workbench *v1alpha1.Workbench) (ctrl.Result, error) {
	exists, err := in.ConsoleClient.IsWorkbenchExists(ctx, nil, lo.ToPtr(workbench.ConsoleName()))
	if err != nil {
		return common.HandleRequeue(nil, err, workbench.SetCondition)
	}

	if !exists {
		workbench.Status.ID = nil
		utils.MarkCondition(workbench.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonNotFound, v1alpha1.SynchronizedNotFoundConditionMessage.String())
		return common.Wait(), nil
	}

	apiWorkbench, err := in.ConsoleClient.GetWorkbench(ctx, nil, lo.ToPtr(workbench.ConsoleName()))
	if err != nil {
		return common.HandleRequeue(nil, err, workbench.SetCondition)
	}

	workbench.Status.ID = &apiWorkbench.ID

	utils.MarkCondition(workbench.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkCondition(workbench.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return workbench.Spec.Reconciliation.Requeue(), nil
}

func (in *WorkbenchReconciler) sync(ctx context.Context, workbench *v1alpha1.Workbench, project *v1alpha1.Project,
	repositoryID *string, agentRuntimeID *string, toolIDs []string, changed bool) (*console.WorkbenchFragment, error) {
	logger := log.FromContext(ctx)

	existingWorkbench, err := in.ConsoleClient.GetWorkbench(ctx, nil, lo.ToPtr(workbench.ConsoleName()))
	if err != nil {
		if !errors.IsNotFound(err) {
			return nil, err
		}

		logger.Info(fmt.Sprintf("%s workbench does not exist, creating it", workbench.ConsoleName()))
		return in.ConsoleClient.CreateWorkbench(ctx, workbench.Attributes(project.Status.ID, repositoryID, agentRuntimeID, toolIDs))
	}

	if changed {
		logger.Info(fmt.Sprintf("updating workbench %s", workbench.ConsoleName()))
		return in.ConsoleClient.UpdateWorkbench(ctx, existingWorkbench.ID, workbench.Attributes(project.Status.ID, repositoryID, agentRuntimeID, toolIDs))
	}

	return existingWorkbench, nil
}

func (in *WorkbenchReconciler) handleRepositoryRef(ctx context.Context, workbench *v1alpha1.Workbench) (*string, *ctrl.Result, error) {
	if workbench.Spec.RepositoryRef == nil {
		return nil, nil, nil
	}

	repository := &v1alpha1.GitRepository{}
	if err := in.Get(ctx, client.ObjectKey{Name: workbench.Spec.RepositoryRef.Name, Namespace: workbench.Spec.RepositoryRef.Namespace}, repository); err != nil {
		if errors.IsNotFound(err) {
			return nil, lo.ToPtr(common.Wait()), fmt.Errorf("repository not found: %s", err.Error())
		}

		return nil, nil, fmt.Errorf("failed to get repository: %s", err.Error())
	}

	if !repository.Status.HasID() {
		return nil, lo.ToPtr(common.Wait()), fmt.Errorf("repository is not ready")
	}

	if repository.Status.Health == v1alpha1.GitHealthFailed {
		return nil, lo.ToPtr(common.Wait()), fmt.Errorf("repository is not healthy")
	}

	return repository.Status.ID, nil, nil
}

func (in *WorkbenchReconciler) handleAgentRuntime(ctx context.Context, workbench *v1alpha1.Workbench) (*string, *ctrl.Result, error) {
	if workbench.Spec.AgentRuntime == nil {
		return nil, nil, nil
	}

	apiAgentRuntime, err := in.ConsoleClient.GetAgentRuntime(ctx, *workbench.Spec.AgentRuntime)
	if err != nil {
		if errors.IsNotFound(err) {
			return nil, lo.ToPtr(common.Wait()), fmt.Errorf("agent runtime not found: %s", err.Error())
		}

		return nil, nil, fmt.Errorf("failed to get agent runtime: %s", err.Error())
	}

	return &apiAgentRuntime.ID, nil, nil
}

func (in *WorkbenchReconciler) handleWorkbenchTools(ctx context.Context, workbench *v1alpha1.Workbench) ([]string, *ctrl.Result, error) {
	if len(workbench.Spec.ToolRefs) == 0 {
		return nil, nil, nil
	}

	var toolIDs []string
	for _, toolRef := range workbench.Spec.ToolRefs {
		namespace := toolRef.Namespace
		if namespace == "" {
			namespace = workbench.Namespace
		}

		tool := &v1alpha1.WorkbenchTool{}
		if err := in.Get(ctx, client.ObjectKey{Name: toolRef.Name, Namespace: namespace}, tool); err != nil {
			if errors.IsNotFound(err) {
				return nil, lo.ToPtr(common.Wait()), fmt.Errorf("workbench tool not found: %s", err.Error())
			}

			return nil, nil, fmt.Errorf("failed to get workbench tool: %s", err.Error())
		}

		if !tool.Status.HasID() {
			return nil, lo.ToPtr(common.Wait()), fmt.Errorf("workbench tool %s is not ready", toolRef.Name)
		}

		toolIDs = append(toolIDs, tool.Status.GetID())
	}

	return toolIDs, nil, nil
}

// SetupWithManager is responsible for initializing a new reconciler within the provided ctrl.Manager.
func (in *WorkbenchReconciler) SetupWithManager(mgr ctrl.Manager) error {
	mgr.GetLogger().Info("Starting reconciler", "reconciler", "workbench_reconciler")
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		Watches(&v1alpha1.NamespaceCredentials{}, credentials.OnCredentialsChange(in.Client, new(v1alpha1.WorkbenchList))).
		For(&v1alpha1.Workbench{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(in)
}
