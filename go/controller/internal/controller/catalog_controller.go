package controller

import (
	"context"

	"github.com/samber/lo"
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

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/cache"
	consoleclient "github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/utils"
)

const (
	// CatalogProtectionFinalizerName defines name for the main finalizer that synchronizes
	// resource deletion from the Console API prior to removing the CRD.
	CatalogProtectionFinalizerName = "projects.deployments.plural.sh/catalog-protection"
)

// CatalogReconciler reconciles a Catalog object
type CatalogReconciler struct {
	client.Client

	ConsoleClient  consoleclient.ConsoleClient
	Scheme         *runtime.Scheme
	UserGroupCache cache.UserGroupCache
}

//+kubebuilder:rbac:groups=deployments.plural.sh,resources=catalogs,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=catalogs/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=catalogs/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.16.3/pkg/reconcile
func (r *CatalogReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, retErr error) {
	logger := log.FromContext(ctx)

	catalog := new(v1alpha1.Catalog)
	if err := r.Get(ctx, req.NamespacedName, catalog); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	utils.MarkCondition(catalog.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	scope, err := NewDefaultScope(ctx, r.Client, catalog)
	if err != nil {
		utils.MarkCondition(catalog.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Always patch object when exiting this function, so we can persist any object changes.
	defer func() {
		if err := scope.PatchObject(); err != nil && retErr == nil {
			retErr = err
		}
	}()

	// Handle proper resource deletion via finalizer
	result := r.addOrRemoveFinalizer(ctx, catalog)
	if result != nil {
		return *result, retErr
	}

	// Check if resource already exists in the API and only sync the ID
	exists, err := r.isAlreadyExists(ctx, catalog)
	if err != nil {
		utils.MarkCondition(catalog.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	if exists {
		utils.MarkCondition(catalog.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionTrue, v1alpha1.ReadonlyConditionReason, v1alpha1.ReadonlyTrueConditionMessage.String())
		return r.handleExistingResource(ctx, catalog)
	}

	// Mark resource as managed by this operator.
	utils.MarkCondition(catalog.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionFalse, v1alpha1.ReadonlyConditionReason, "")

	// Sync Catalog CRD with the Console API
	if err := r.ensure(catalog); err != nil {
		return handleRequeue(nil, err, catalog.SetCondition)
	}

	// Get Catalog SHA that can be saved back in the status to check for changes
	changed, sha, err := catalog.Diff(utils.HashObject)
	if err != nil {
		logger.Error(err, "unable to calculate catalog SHA")
		utils.MarkCondition(catalog.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	if changed {
		project, res, err := GetProject(ctx, r.Client, r.Scheme, catalog)
		if res != nil || err != nil {
			return handleRequeue(res, err, catalog.SetCondition)
		}

		apiCatalog, err := r.ConsoleClient.UpsertCatalog(ctx, catalog.Attributes(project.Status.ID))
		if err != nil {
			logger.Error(err, "unable to create or update catalog")
			utils.MarkCondition(catalog.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}
		catalog.Status.ID = &apiCatalog.ID
		catalog.Status.SHA = &sha
	}
	utils.MarkCondition(catalog.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(catalog.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

	return ctrl.Result{}, retErr
}

func (r *CatalogReconciler) handleExistingResource(ctx context.Context, catalog *v1alpha1.Catalog) (ctrl.Result, error) {
	exists, err := r.ConsoleClient.IsCatalogExists(ctx, catalog.CatalogName())
	if err != nil {
		return handleRequeue(nil, err, catalog.SetCondition)
	}
	if !exists {
		catalog.Status.ID = nil
		utils.MarkCondition(catalog.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonNotFound, v1alpha1.SynchronizedNotFoundConditionMessage.String())
		return waitForResources, nil
	}

	apiCatalog, err := r.ConsoleClient.GetCatalog(ctx, nil, lo.ToPtr(catalog.CatalogName()))
	if err != nil {
		return handleRequeue(nil, err, catalog.SetCondition)
	}

	catalog.Status.ID = &apiCatalog.ID

	utils.MarkCondition(catalog.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkCondition(catalog.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return jitterRequeue(), nil
}

func (r *CatalogReconciler) isAlreadyExists(ctx context.Context, catalog *v1alpha1.Catalog) (bool, error) {
	if catalog.Status.HasReadonlyCondition() {
		return catalog.Status.IsReadonly(), nil
	}

	_, err := r.ConsoleClient.GetCatalog(ctx, nil, lo.ToPtr(catalog.CatalogName()))
	if errors.IsNotFound(err) {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	if !catalog.Status.HasID() {
		log.FromContext(ctx).Info("Catalog already exists in the API, running in read-only mode")
		return true, nil
	}

	return false, nil
}

func (r *CatalogReconciler) addOrRemoveFinalizer(ctx context.Context, catalog *v1alpha1.Catalog) *ctrl.Result {
	// If object is not being deleted and if it does not have our finalizer,
	// then lets add the finalizer. This is equivalent to registering our finalizer.
	if catalog.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(catalog, CatalogProtectionFinalizerName) {
		controllerutil.AddFinalizer(catalog, CatalogProtectionFinalizerName)
	}

	// If object is being deleted remove the finalizer. There is no way
	// currently to delete catalog from Console API, so we simply detach
	// and only remove the CRD.
	if !catalog.DeletionTimestamp.IsZero() {
		exists, err := r.ConsoleClient.IsCatalogExists(ctx, catalog.CatalogName())
		if err != nil {
			return &requeue
		}

		apiCatalog, err := r.ConsoleClient.GetCatalog(ctx, nil, lo.ToPtr(catalog.CatalogName()))
		if err != nil {
			return &requeue
		}

		// Remove Pipeline from Console API if it exists.
		if exists && !catalog.Status.IsReadonly() {
			if err := r.ConsoleClient.DeleteCatalog(ctx, apiCatalog.ID); err != nil {
				// If it fails to delete the external dependency here, return with error
				// so that it can be retried.
				utils.MarkCondition(catalog.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return &requeue
			}

			// catalog deletion is synchronous so can just fall back to removing the finalizer and reconciling
		}
		// Stop reconciliation as the item is being deleted
		controllerutil.RemoveFinalizer(catalog, CatalogProtectionFinalizerName)
		return &ctrl.Result{}
	}

	return nil
}

func (r *CatalogReconciler) ensure(catalog *v1alpha1.Catalog) error {
	if catalog.Spec.Bindings == nil {
		return nil
	}

	bindings, err := ensureBindings(catalog.Spec.Bindings.Read, r.UserGroupCache)
	if err != nil {
		return err
	}
	catalog.Spec.Bindings.Read = bindings

	bindings, err = ensureBindings(catalog.Spec.Bindings.Write, r.UserGroupCache)
	if err != nil {
		return err
	}
	catalog.Spec.Bindings.Write = bindings

	bindings, err = ensureBindings(catalog.Spec.Bindings.Create, r.UserGroupCache)
	if err != nil {
		return err
	}
	catalog.Spec.Bindings.Create = bindings

	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *CatalogReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		For(&v1alpha1.Catalog{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(r)
}
