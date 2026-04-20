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

// WorkbenchCronReconciler reconciles a v1alpha1.WorkbenchCron object.
// Implements reconcile.Reconciler and types.Controller.
type WorkbenchCronReconciler struct {
	client.Client
	ConsoleClient    consoleclient.ConsoleClient
	Scheme           *runtime.Scheme
	CredentialsCache credentials.NamespaceCredentialsCache
}

const (
	// WorkbenchCronFinalizer defines the name for the main finalizer that synchronizes
	// resource deletion from the Console API prior to removing the CRD.
	WorkbenchCronFinalizer = "deployments.plural.sh/workbench-cron-protection"
)

// +kubebuilder:rbac:groups=deployments.plural.sh,resources=workbenchcrons,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=workbenchcrons/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=workbenchcrons/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the v1alpha1.WorkbenchCron closer to the desired state
// and syncs it with the Console API state.
func (in *WorkbenchCronReconciler) Reconcile(ctx context.Context, req reconcile.Request) (_ reconcile.Result, reterr error) {
	logger := log.FromContext(ctx)

	workbenchCron := new(v1alpha1.WorkbenchCron)
	if err := in.Get(ctx, req.NamespacedName, workbenchCron); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	scope, err := common.NewDefaultScope(ctx, in.Client, workbenchCron)
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
	credentials.SyncCredentialsInfo(workbenchCron, workbenchCron.SetCondition, nc, err)
	if err != nil {
		logger.Error(err, "failed to use namespace credentials", "namespaceCredentials", nc, "namespacedName", req.NamespacedName)
		utils.MarkCondition(workbenchCron.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, fmt.Sprintf("failed to use %s namespace credentials: %s", nc, err.Error()))
		return ctrl.Result{}, err
	}

	// Mark the resource as not ready. This will be overridden in the end.
	utils.MarkCondition(workbenchCron.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	// Handle proper resource deletion via finalizer
	result := in.addOrRemoveFinalizer(ctx, workbenchCron)
	if result != nil {
		return *result, nil
	}

	// Mark resource as managed by this operator.
	utils.MarkCondition(workbenchCron.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionFalse, v1alpha1.ReadonlyConditionReason, "")

	// Get WorkbenchCron SHA that can be saved back in the status to check for changes
	changed, sha, err := workbenchCron.Diff(utils.HashObject)
	if err != nil {
		logger.Error(err, "unable to calculate workbench cron SHA")
		utils.MarkCondition(workbenchCron.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Get the workbench for this cron.
	workbenchID, res, err := common.HandleWorkbenchRef(ctx, in.Client, in.Scheme, workbenchCron, workbenchCron.Spec.WorkbenchRef, workbenchCron.Namespace)
	if res != nil || err != nil {
		return common.HandleRequeue(res, err, workbenchCron.SetCondition)
	}

	// Sync WorkbenchCron CRD with the Console API
	apiWorkbenchCron, err := in.sync(ctx, workbenchCron, workbenchID, changed)
	if err != nil {
		return common.HandleRequeue(nil, err, workbenchCron.SetCondition)
	}

	workbenchCron.Status.ID = &apiWorkbenchCron.ID
	workbenchCron.Status.SHA = &sha

	utils.MarkCondition(workbenchCron.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(workbenchCron.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

	return workbenchCron.Spec.Reconciliation.Requeue(), nil
}

func (in *WorkbenchCronReconciler) addOrRemoveFinalizer(ctx context.Context, workbenchCron *v1alpha1.WorkbenchCron) *ctrl.Result {
	if workbenchCron.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(workbenchCron, WorkbenchCronFinalizer) {
		controllerutil.AddFinalizer(workbenchCron, WorkbenchCronFinalizer)
	}

	// If the workbench cron is being deleted, cleanup and remove the finalizer.
	if !workbenchCron.DeletionTimestamp.IsZero() {
		// If the workbench cron does not have an ID, the finalizer can be removed.
		if !workbenchCron.Status.HasID() {
			controllerutil.RemoveFinalizer(workbenchCron, WorkbenchCronFinalizer)
			return &ctrl.Result{}
		}

		exists, err := in.ConsoleClient.IsWorkbenchCronExists(ctx, workbenchCron.Status.GetID())
		if err != nil {
			return lo.ToPtr(workbenchCron.Spec.Reconciliation.Requeue())
		}

		// Remove the workbench cron from Console API if it exists.
		if exists {
			if err = in.ConsoleClient.DeleteWorkbenchCron(ctx, workbenchCron.Status.GetID()); err != nil {
				// If it fails to delete the external dependency here, return with the error
				// so that it can be retried.
				utils.MarkCondition(workbenchCron.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return lo.ToPtr(workbenchCron.Spec.Reconciliation.Requeue())
			}
		}

		// If our finalizer is present, remove it.
		controllerutil.RemoveFinalizer(workbenchCron, WorkbenchCronFinalizer)

		// Stop reconciliation as the item does no longer exist.
		return &ctrl.Result{}
	}

	return nil
}

func (in *WorkbenchCronReconciler) sync(ctx context.Context, workbenchCron *v1alpha1.WorkbenchCron, workbenchID string, changed bool) (*console.WorkbenchCronFragment, error) {
	logger := log.FromContext(ctx)

	// If we already have an ID, try to get the existing resource.
	if workbenchCron.Status.HasID() {
		existingCron, err := in.ConsoleClient.GetWorkbenchCron(ctx, workbenchCron.Status.GetID())
		if err != nil {
			if !errors.IsNotFound(err) {
				return nil, err
			}
			// Not found by ID, create a new one.
			logger.Info(fmt.Sprintf("workbench cron %s not found by ID, creating it", workbenchCron.Name))
			return in.ConsoleClient.CreateWorkbenchCron(ctx, workbenchID, workbenchCron.Attributes())
		}

		if changed {
			logger.Info(fmt.Sprintf("updating workbench cron %s", workbenchCron.Name))
			return in.ConsoleClient.UpdateWorkbenchCron(ctx, existingCron.ID, workbenchCron.Attributes())
		}

		return existingCron, nil
	}

	// No ID yet, create a new cron.
	logger.Info(fmt.Sprintf("creating workbench cron %s", workbenchCron.Name))
	return in.ConsoleClient.CreateWorkbenchCron(ctx, workbenchID, workbenchCron.Attributes())
}

// SetupWithManager is responsible for initializing a new reconciler within the provided ctrl.Manager.
func (in *WorkbenchCronReconciler) SetupWithManager(mgr ctrl.Manager) error {
	mgr.GetLogger().Info("Starting reconciler", "reconciler", "workbench_cron_reconciler")
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		Watches(&v1alpha1.NamespaceCredentials{}, credentials.OnCredentialsChange(in.Client, new(v1alpha1.WorkbenchCronList))).
		For(&v1alpha1.WorkbenchCron{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(in)
}
