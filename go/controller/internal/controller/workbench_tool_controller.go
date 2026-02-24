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

// WorkbenchToolReconciler reconciles a v1alpha1.WorkbenchTool object.
// Implements reconcile.Reconciler and types.Controller.
type WorkbenchToolReconciler struct {
	client.Client
	ConsoleClient    consoleclient.ConsoleClient
	Scheme           *runtime.Scheme
	CredentialsCache credentials.NamespaceCredentialsCache
}

const (
	// WorkbenchToolProtectionFinalizerName defines the name for the main finalizer that synchronizes
	// resource deletion from the Console API prior to removing the CRD.
	WorkbenchToolProtectionFinalizerName = "workbenchtools.deployments.plural.sh/workbench-tool-protection"
)

// +kubebuilder:rbac:groups=deployments.plural.sh,resources=workbenchtools,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=workbenchtools/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=workbenchtools/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the v1alpha1.WorkbenchTool closer to the desired state
// and syncs it with the Console API state.
func (in *WorkbenchToolReconciler) Reconcile(ctx context.Context, req reconcile.Request) (_ reconcile.Result, reterr error) {
	logger := log.FromContext(ctx)

	workbenchTool := new(v1alpha1.WorkbenchTool)
	if err := in.Get(ctx, req.NamespacedName, workbenchTool); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	scope, err := common.NewDefaultScope(ctx, in.Client, workbenchTool)
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
	credentials.SyncCredentialsInfo(workbenchTool, workbenchTool.SetCondition, nc, err)
	if err != nil {
		logger.Error(err, "failed to use namespace credentials", "namespaceCredentials", nc, "namespacedName", req.NamespacedName)
		utils.MarkCondition(workbenchTool.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, fmt.Sprintf("failed to use %s namespace credentials: %s", nc, err.Error()))
		return ctrl.Result{}, err
	}

	// Mark the resource as not ready. This will be overridden in the end.
	utils.MarkCondition(workbenchTool.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	// Check if the resource already exists in the API and only sync the ID.
	exists, err := in.isAlreadyExists(ctx, workbenchTool)
	if err != nil {
		utils.MarkCondition(workbenchTool.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	if exists && !workbenchTool.Spec.Reconciliation.DriftDetect() {
		utils.MarkReadOnly(workbenchTool)
		return in.handleExistingWorkbenchTool(ctx, workbenchTool)
	}

	// Handle proper resource deletion via finalizer
	result := in.addOrRemoveFinalizer(ctx, workbenchTool)
	if result != nil {
		return *result, nil
	}

	// Mark resource as managed by this operator.
	utils.MarkCondition(workbenchTool.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionFalse, v1alpha1.ReadonlyConditionReason, "")

	// Get WorkbenchTool SHA that can be saved back in the status to check for changes
	changed, sha, err := workbenchTool.Diff(utils.HashObject)
	if err != nil {
		logger.Error(err, "unable to calculate workbench tool SHA")
		utils.MarkCondition(workbenchTool.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Get the project for the workbench tool.
	project, res, err := common.Project(ctx, in.Client, in.Scheme, workbenchTool)
	if res != nil || err != nil {
		return common.HandleRequeue(res, err, workbenchTool.SetCondition)
	}

	// Sync WorkbenchTool CRD with the Console API
	apiWorkbenchTool, err := in.sync(ctx, workbenchTool, project, changed)
	if err != nil {
		return common.HandleRequeue(nil, err, workbenchTool.SetCondition)
	}

	workbenchTool.Status.ID = &apiWorkbenchTool.ID
	workbenchTool.Status.SHA = &sha

	utils.MarkCondition(workbenchTool.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(workbenchTool.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

	return workbenchTool.Spec.Reconciliation.Requeue(), nil
}

func (in *WorkbenchToolReconciler) addOrRemoveFinalizer(ctx context.Context, workbenchTool *v1alpha1.WorkbenchTool) *ctrl.Result {
	if workbenchTool.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(workbenchTool, WorkbenchToolProtectionFinalizerName) {
		controllerutil.AddFinalizer(workbenchTool, WorkbenchToolProtectionFinalizerName)
	}

	// If the workbench tool is being deleted, cleanup and remove the finalizer.
	if !workbenchTool.DeletionTimestamp.IsZero() {
		// If the workbench tool does not have an ID, the finalizer can be removed.
		if !workbenchTool.Status.HasID() {
			controllerutil.RemoveFinalizer(workbenchTool, WorkbenchToolProtectionFinalizerName)
			return &ctrl.Result{}
		}

		exists, err := in.ConsoleClient.IsWorkbenchToolExists(ctx, workbenchTool.Status.ID, nil)
		if err != nil {
			return lo.ToPtr(workbenchTool.Spec.Reconciliation.Requeue())
		}

		// Remove the workbench tool from Console API if it exists.
		if exists {
			if err = in.ConsoleClient.DeleteWorkbenchTool(ctx, workbenchTool.Status.GetID()); err != nil {
				// If it fails to delete the external dependency here, return with the error
				// so that it can be retried.
				utils.MarkCondition(workbenchTool.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return lo.ToPtr(workbenchTool.Spec.Reconciliation.Requeue())
			}
		}

		// If our finalizer is present, remove it.
		controllerutil.RemoveFinalizer(workbenchTool, WorkbenchToolProtectionFinalizerName)

		// Stop reconciliation as the item does no longer exist.
		return &ctrl.Result{}
	}

	return nil
}

func (in *WorkbenchToolReconciler) isAlreadyExists(ctx context.Context, workbenchTool *v1alpha1.WorkbenchTool) (bool, error) {
	if workbenchTool.Status.HasReadonlyCondition() {
		return workbenchTool.Status.IsReadonly(), nil
	}

	_, err := in.ConsoleClient.GetWorkbenchToolTiny(ctx, nil, lo.ToPtr(workbenchTool.ConsoleName()))
	if errors.IsNotFound(err) {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	if !workbenchTool.Status.HasID() {
		log.FromContext(ctx).Info("Workbench tool already exists in the API, running in read-only mode")
		return true, nil
	}

	return false, nil
}

func (in *WorkbenchToolReconciler) handleExistingWorkbenchTool(ctx context.Context, workbenchTool *v1alpha1.WorkbenchTool) (ctrl.Result, error) {
	exists, err := in.ConsoleClient.IsWorkbenchToolExists(ctx, nil, lo.ToPtr(workbenchTool.ConsoleName()))
	if err != nil {
		return common.HandleRequeue(nil, err, workbenchTool.SetCondition)
	}

	if !exists {
		workbenchTool.Status.ID = nil
		utils.MarkCondition(workbenchTool.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonNotFound, v1alpha1.SynchronizedNotFoundConditionMessage.String())
		return common.Wait(), nil
	}

	apiWorkbenchTool, err := in.ConsoleClient.GetWorkbenchTool(ctx, nil, lo.ToPtr(workbenchTool.ConsoleName()))
	if err != nil {
		return common.HandleRequeue(nil, err, workbenchTool.SetCondition)
	}

	workbenchTool.Status.ID = &apiWorkbenchTool.ID

	utils.MarkCondition(workbenchTool.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkCondition(workbenchTool.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return workbenchTool.Spec.Reconciliation.Requeue(), nil
}

func (in *WorkbenchToolReconciler) sync(ctx context.Context, workbenchTool *v1alpha1.WorkbenchTool, project *v1alpha1.Project, changed bool) (*console.WorkbenchToolFragment, error) {
	logger := log.FromContext(ctx)

	existingWorkbenchTool, err := in.ConsoleClient.GetWorkbenchTool(ctx, nil, lo.ToPtr(workbenchTool.ConsoleName()))
	if err != nil {
		if !errors.IsNotFound(err) {
			return nil, err
		}

		logger.Info(fmt.Sprintf("%s workbench tool does not exist, creating it", workbenchTool.ConsoleName()))
		return in.ConsoleClient.CreateWorkbenchTool(ctx, workbenchTool.Attributes(project.Status.ID))
	}

	if changed {
		logger.Info(fmt.Sprintf("updating workbench tool %s", workbenchTool.ConsoleName()))
		return in.ConsoleClient.UpdateWorkbenchTool(ctx, existingWorkbenchTool.ID, workbenchTool.Attributes(project.Status.ID))
	}

	return existingWorkbenchTool, nil
}

// SetupWithManager is responsible for initializing a new reconciler within the provided ctrl.Manager.
func (in *WorkbenchToolReconciler) SetupWithManager(mgr ctrl.Manager) error {
	mgr.GetLogger().Info("Starting reconciler", "reconciler", "workbench_tool_reconciler")
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		Watches(&v1alpha1.NamespaceCredentials{}, credentials.OnCredentialsChange(in.Client, new(v1alpha1.WorkbenchToolList))).
		For(&v1alpha1.WorkbenchTool{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(in)
}
