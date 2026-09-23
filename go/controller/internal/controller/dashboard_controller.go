package controller

import (
	"context"
	"fmt"

	"k8s.io/apimachinery/pkg/api/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	consoleclient "github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/common"
	"github.com/pluralsh/console/go/controller/internal/credentials"
	"github.com/pluralsh/console/go/controller/internal/utils"
)

// DashboardReconciler reconciles a v1alpha1.Dashboard object.
// Implements reconcile.Reconciler and types.Controller.
type DashboardReconciler struct {
	client.Client
	ConsoleClient    consoleclient.ConsoleClient
	Scheme           *runtime.Scheme
	CredentialsCache credentials.NamespaceCredentialsCache
}

const (
	// DashboardFinalizer defines the name for the main finalizer that synchronizes
	// resource deletion from the Console API prior to removing the CRD.
	DashboardFinalizer = "deployments.plural.sh/dashboard-protection"
)

// +kubebuilder:rbac:groups=deployments.plural.sh,resources=dashboards,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=dashboards/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=dashboards/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the v1alpha1.Dashboard closer to the desired state
// and syncs it with the Console API state.
func (in *DashboardReconciler) Reconcile(ctx context.Context, req reconcile.Request) (_ reconcile.Result, reterr error) {
	logger := log.FromContext(ctx)

	dashboard := new(v1alpha1.Dashboard)
	if err := in.Get(ctx, req.NamespacedName, dashboard); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	scope, err := common.NewDefaultScope(ctx, in.Client, dashboard)
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
	credentials.SyncCredentialsInfo(dashboard, dashboard.SetCondition, nc, err)
	if err != nil {
		logger.Error(err, "failed to use namespace credentials", "namespaceCredentials", nc, "namespacedName", req.NamespacedName)
		utils.MarkCondition(dashboard.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, fmt.Sprintf("failed to use %s namespace credentials: %s", nc, err.Error()))
		return ctrl.Result{}, err
	}

	// Mark the resource as not ready. This will be overridden in the end.
	utils.MarkCondition(dashboard.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	// Handle proper resource deletion via finalizer
	if result, err := in.addOrRemoveFinalizer(ctx, dashboard); result != nil || err != nil {
		return common.HandleRequeue(result, err, dashboard.SetCondition)
	}

	// Mark resource as managed by this operator.
	utils.MarkCondition(dashboard.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionFalse, v1alpha1.ReadonlyConditionReason, "")

	// Get Dashboard SHA that can be saved back in the status to check for changes
	changed, sha, err := dashboard.Diff(utils.HashObject)
	if err != nil {
		logger.Error(err, "unable to calculate dashboard SHA")
		utils.MarkCondition(dashboard.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Get the workbench that owns this dashboard.
	workbenchID, res, err := common.HandleWorkbenchRef(ctx, in.Client, in.Scheme, dashboard, dashboard.Spec.WorkbenchRef, dashboard.Namespace)
	if res != nil || err != nil {
		return common.HandleRequeue(res, err, dashboard.SetCondition)
	}

	// Sync Dashboard CRD with the Console API
	apiDashboard, err := in.sync(ctx, dashboard, workbenchID, changed)
	if err != nil {
		return common.HandleRequeue(nil, err, dashboard.SetCondition)
	}

	dashboard.Status.ID = &apiDashboard.ID
	dashboard.Status.SHA = &sha

	utils.MarkCondition(dashboard.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(dashboard.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

	return dashboard.Spec.Reconciliation.Requeue(), nil
}

// addOrRemoveFinalizer adds the finalizer to the resource or, if the resource is being deleted,
// removes it from the Console API and then removes the finalizer.
// Console API errors are returned instead of scheduling a requeue with Spec.Reconciliation.Requeue(),
// as that does not requeue at all when drift detection is disabled and the resource would stay terminating.
// The caller passes them to common.HandleRequeue, which marks the resource as not synchronized and returns
// the error, so that controller-runtime retries with exponential backoff.
func (in *DashboardReconciler) addOrRemoveFinalizer(ctx context.Context, dashboard *v1alpha1.Dashboard) (*ctrl.Result, error) {
	if dashboard.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(dashboard, DashboardFinalizer) {
		controllerutil.AddFinalizer(dashboard, DashboardFinalizer)
	}

	// If the dashboard is being deleted, cleanup and remove the finalizer.
	if !dashboard.DeletionTimestamp.IsZero() {
		// If the dashboard does not have an ID, the finalizer can be removed.
		if !dashboard.Status.HasID() {
			controllerutil.RemoveFinalizer(dashboard, DashboardFinalizer)
			return &ctrl.Result{}, nil
		}

		exists, err := in.ConsoleClient.IsDashboardExists(ctx, dashboard.Status.GetID())
		if err != nil {
			return nil, err
		}

		// Remove the dashboard from Console API if it exists.
		if exists {
			if err = in.ConsoleClient.DeleteDashboard(ctx, dashboard.Status.GetID()); err != nil {
				// If it fails to delete the external dependency here, return with the error
				// so that it can be retried.
				return nil, err
			}
		}

		// If our finalizer is present, remove it.
		controllerutil.RemoveFinalizer(dashboard, DashboardFinalizer)

		// Stop reconciliation as the item does no longer exist.
		return &ctrl.Result{}, nil
	}

	return nil, nil
}

func (in *DashboardReconciler) sync(ctx context.Context, dashboard *v1alpha1.Dashboard, workbenchID string, changed bool) (*console.WorkbenchDashboardFragment, error) {
	logger := log.FromContext(ctx)

	// If we already have an ID, try to get the existing resource.
	if dashboard.Status.HasID() {
		existingDashboard, err := in.ConsoleClient.GetDashboard(ctx, dashboard.Status.GetID())
		if err != nil {
			if !errors.IsNotFound(err) {
				return nil, err
			}
			// Not found by ID, create a new one.
			logger.Info(fmt.Sprintf("dashboard %s not found by ID, creating it", dashboard.Name))
			return in.ConsoleClient.CreateDashboard(ctx, dashboard.Attributes(workbenchID))
		}

		if changed {
			logger.Info(fmt.Sprintf("updating dashboard %s", dashboard.Name))
			return in.ConsoleClient.UpdateDashboard(ctx, existingDashboard.ID, dashboard.Attributes(workbenchID))
		}

		return existingDashboard, nil
	}

	// No ID yet, create a new dashboard.
	logger.Info(fmt.Sprintf("creating dashboard %s", dashboard.Name))
	return in.ConsoleClient.CreateDashboard(ctx, dashboard.Attributes(workbenchID))
}

// SetupWithManager is responsible for initializing a new reconciler within the provided ctrl.Manager.
func (in *DashboardReconciler) SetupWithManager(mgr ctrl.Manager) error {
	mgr.GetLogger().Info("Starting reconciler", "reconciler", "dashboard_reconciler")
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		Watches(&v1alpha1.NamespaceCredentials{}, credentials.OnCredentialsChange(in.Client, new(v1alpha1.DashboardList))).
		For(&v1alpha1.Dashboard{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(in)
}
