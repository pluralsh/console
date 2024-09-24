package controller

import (
	"context"

	"k8s.io/apimachinery/pkg/api/errors"
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
	"github.com/pluralsh/console/go/controller/internal/cache"
	consoleclient "github.com/pluralsh/console/go/controller/internal/client"
	operrors "github.com/pluralsh/console/go/controller/internal/errors"
	"github.com/pluralsh/console/go/controller/internal/utils"
)

// PrAutomationReconciler reconciles a v1alpha1.PrAutomation object.
// Implements reconcile.Reconciler and types.Controller
type PrAutomationReconciler struct {
	client.Client

	ConsoleClient  consoleclient.ConsoleClient
	Scheme         *runtime.Scheme
	UserGroupCache cache.UserGroupCache
}

const (
	// PrAutomationProtectionFinalizerName defines name for the main finalizer that synchronizes
	// resource deletion from the Console API prior to removing the CRD.
	PrAutomationProtectionFinalizerName = "providers.deployments.plural.sh/provider-protection"
)

// +kubebuilder:rbac:groups=deployments.plural.sh,resources=prautomations,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=prautomations/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=prautomations/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the v1alpha1.PrAutomation closer to the desired state
// and syncs it with the Console API state.
func (in *PrAutomationReconciler) Reconcile(ctx context.Context, req reconcile.Request) (_ reconcile.Result, reterr error) {
	logger := log.FromContext(ctx)

	// Read PrAutomation CRD from the K8S API
	prAutomation := new(v1alpha1.PrAutomation)
	if err := in.Get(ctx, req.NamespacedName, prAutomation); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	utils.MarkFalse(prAutomation.SetCondition, v1alpha1.ReadyConditionType, v1alpha1.ReadyConditionReason, "")
	scope, err := NewDefaultScope(ctx, in.Client, prAutomation)
	if err != nil {
		utils.MarkFalse(prAutomation.SetCondition, v1alpha1.SynchronizedConditionType, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Always patch object when exiting this function, so we can persist any object changes.
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()

	// Mark resource as not ready. This will be overridden in the end.
	utils.MarkFalse(prAutomation.SetCondition, v1alpha1.ReadyConditionType, v1alpha1.ReadyConditionReason, "")

	// Handle proper resource deletion via finalizer
	result, err := in.addOrRemoveFinalizer(ctx, prAutomation)
	if result != nil {
		return *result, err
	}

	// Get PrAutomation SHA that can be saved back in the status to check for changes
	changed, sha, err := prAutomation.Diff(utils.HashObject)
	if err != nil {
		logger.Error(err, "unable to calculate prAutomation SHA")
		utils.MarkFalse(prAutomation.SetCondition, v1alpha1.SynchronizedConditionType, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Sync PrAutomation CRD with the Console API
	apiPrAutomation, err := in.sync(ctx, prAutomation, changed)
	if err != nil {
		if errors.IsNotFound(err) {
			logger.Error(err, "unable to find referenced object")
			return requeue, nil
		}
		logger.Error(err, "unable to create or update prAutomation")
		utils.MarkFalse(prAutomation.SetCondition, v1alpha1.SynchronizedConditionType, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	if apiPrAutomation == nil {
		logger.Info("PR automation already exists in the Console API. Won't reconcile again.")
		return ctrl.Result{}, err
	}

	prAutomation.Status.ID = &apiPrAutomation.ID
	prAutomation.Status.SHA = &sha

	in.updateReadyCondition(prAutomation)
	utils.MarkTrue(prAutomation.SetCondition, v1alpha1.SynchronizedConditionType, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkTrue(prAutomation.SetCondition, v1alpha1.ReadyConditionType, v1alpha1.ReadyConditionReason, "")

	return requeue, nil
}

func (in *PrAutomationReconciler) addOrRemoveFinalizer(ctx context.Context, prAutomation *v1alpha1.PrAutomation) (*ctrl.Result, error) {
	logger := log.FromContext(ctx)

	// If object is not being deleted and if it does not have our finalizer,
	// then lets add the finalizer. This is equivalent to registering our finalizer.
	if prAutomation.ObjectMeta.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(prAutomation, PrAutomationProtectionFinalizerName) {
		controllerutil.AddFinalizer(prAutomation, PrAutomationProtectionFinalizerName)
	}

	// If object is being deleted cleanup and remove the finalizer.
	if !prAutomation.ObjectMeta.DeletionTimestamp.IsZero() {
		exists, err := in.ConsoleClient.IsPrAutomationExists(ctx, prAutomation.Status.GetID())
		if err != nil {
			return &ctrl.Result{}, err
		}

		// Remove PrAutomation from Console API if it exists
		if exists {
			logger.Info("Deleting PR automation")
			if err = in.ConsoleClient.DeletePrAutomation(ctx, prAutomation.Status.GetID()); err != nil {
				// if it fails to delete the external dependency here, return with error
				// so that it can be retried.
				utils.MarkFalse(prAutomation.SetCondition, v1alpha1.SynchronizedConditionType, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return &ctrl.Result{}, err
			}

			// If deletion process started requeue so that we can make sure prAutomation
			// has been deleted from Console API before removing the finalizer.
			return &requeue, nil
		}

		// Stop reconciliation as the item is being deleted
		controllerutil.RemoveFinalizer(prAutomation, PrAutomationProtectionFinalizerName)
		return &ctrl.Result{}, nil
	}

	return nil, nil
}

func (in *PrAutomationReconciler) sync(ctx context.Context, prAutomation *v1alpha1.PrAutomation, changed bool) (*console.PrAutomationFragment, error) {
	logger := log.FromContext(ctx)
	exists, err := in.ConsoleClient.IsPrAutomationExistsByName(ctx, prAutomation.ConsoleName())
	if err != nil {
		return nil, err
	}

	if exists && !prAutomation.Status.HasID() {
		return nil, nil
	}
	if err := in.ensure(prAutomation); err != nil {
		return nil, err
	}
	attributes, err := in.attributes(ctx, prAutomation)
	if err != nil {
		return nil, err
	}

	// Update only if PrAutomation has changed
	if changed && exists {
		logger.Info("Updating PR automation")
		return in.ConsoleClient.UpdatePrAutomation(ctx, prAutomation.Status.GetID(), *attributes)
	}

	// Read the PrAutomation from Console API if it already exists
	if exists {
		return in.ConsoleClient.GetPrAutomation(ctx, prAutomation.Status.GetID())
	}

	logger.Info("Creating PR automation")
	return in.ConsoleClient.CreatePrAutomation(ctx, *attributes)
}

func (in *PrAutomationReconciler) updateReadyCondition(prAutomation *v1alpha1.PrAutomation) {
	utils.MarkTrue(prAutomation.SetCondition, v1alpha1.ReadyConditionType, v1alpha1.ReadyConditionReason, "")
}

// ensure makes sure that user-friendly input such as userEmail/groupName in
// bindings are transformed into valid IDs on the v1alpha1.Binding object before creation
func (in *PrAutomationReconciler) ensure(prAutomation *v1alpha1.PrAutomation) error {
	if prAutomation.Spec.Bindings == nil {
		return nil
	}

	bindings, req, err := ensureBindings(prAutomation.Spec.Bindings.Create, in.UserGroupCache)
	if err != nil {
		return err
	}
	prAutomation.Spec.Bindings.Create = bindings

	bindings, req2, err := ensureBindings(prAutomation.Spec.Bindings.Write, in.UserGroupCache)
	if err != nil {
		return err
	}
	prAutomation.Spec.Bindings.Write = bindings

	if req || req2 {
		return operrors.ErrRetriable
	}

	return nil
}

// SetupWithManager is responsible for initializing new reconciler within provided ctrl.Manager.
func (in *PrAutomationReconciler) SetupWithManager(mgr ctrl.Manager) error {
	mgr.GetLogger().Info("Starting reconciler", "reconciler", "prautomation_reconciler")
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.PrAutomation{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(in)
}
