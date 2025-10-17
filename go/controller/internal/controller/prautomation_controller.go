package controller

import (
	"context"
	"fmt"

	"github.com/samber/lo"
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
	"github.com/pluralsh/console/go/controller/internal/utils"
)

// PrAutomationReconciler reconciles a v1alpha1.PrAutomation object.
// Implements reconcile.Reconciler and types.Controller
type PrAutomationReconciler struct {
	client.Client
	ConsoleClient consoleclient.ConsoleClient
	Scheme        *runtime.Scheme
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

	// Sync PrAutomation CRD with the Console API
	apiPrAutomation, sha, result, err := in.sync(ctx, prAutomation)
	if result != nil || err != nil {
		return handleRequeue(result, err, prAutomation.SetCondition)
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

	return requeue(), nil
}

func (in *PrAutomationReconciler) addOrRemoveFinalizer(ctx context.Context, prAutomation *v1alpha1.PrAutomation) (*ctrl.Result, error) {
	// If object is not being deleted and if it does not have our finalizer,
	// then lets add the finalizer. This is equivalent to registering our finalizer.
	if prAutomation.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(prAutomation, PrAutomationProtectionFinalizerName) {
		controllerutil.AddFinalizer(prAutomation, PrAutomationProtectionFinalizerName)
	}

	// If object is being deleted cleanup and remove the finalizer.
	if !prAutomation.DeletionTimestamp.IsZero() {
		exists, err := in.ConsoleClient.IsPrAutomationExists(ctx, prAutomation.Status.GetID())
		if err != nil {
			return &ctrl.Result{}, err
		}

		// Remove PrAutomation from Console API if it exists
		if exists {
			if err = in.ConsoleClient.DeletePrAutomation(ctx, prAutomation.Status.GetID()); err != nil {
				// if it fails to delete the external dependency here, return with error
				// so that it can be retried.
				utils.MarkFalse(prAutomation.SetCondition, v1alpha1.SynchronizedConditionType, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return &ctrl.Result{}, err
			}

			// If deletion process started requeue so that we can make sure prAutomation
			// has been deleted from Console API before removing the finalizer.
			return lo.ToPtr(requeue()), nil
		}

		// Stop reconciliation as the item is being deleted
		controllerutil.RemoveFinalizer(prAutomation, PrAutomationProtectionFinalizerName)
		return &ctrl.Result{}, nil
	}

	return nil, nil
}

func (in *PrAutomationReconciler) sync(ctx context.Context, prAutomation *v1alpha1.PrAutomation) (pra *console.PrAutomationFragment, sha string, result *ctrl.Result, err error) {
	exists, err := in.ConsoleClient.IsPrAutomationExistsByName(ctx, prAutomation.ConsoleName())
	if err != nil {
		return pra, sha, nil, err
	}

	if exists && !prAutomation.Status.HasID() {
		return pra, sha, nil, err
	}

	attributes, result, err := in.Attributes(ctx, prAutomation)
	if result != nil || err != nil {
		return pra, sha, result, err
	}

	// Get PrAutomation SHA that can be saved back in the status to check for changes
	sha, err = utils.HashObject(attributes)
	if err != nil {
		return pra, sha, nil, fmt.Errorf("unable to calculate pr automation sha: %s", err.Error())
	}

	// Update only if PrAutomation has changed
	if prAutomation.Status.SHA != nil && *prAutomation.Status.SHA != sha && exists {
		pra, err = in.ConsoleClient.UpdatePrAutomation(ctx, prAutomation.Status.GetID(), *attributes)
		return pra, sha, nil, err
	}

	// Read the PrAutomation from Console API if it already exists
	if exists {
		pra, err = in.ConsoleClient.GetPrAutomation(ctx, prAutomation.Status.GetID())
		return pra, sha, nil, err
	}

	pra, err = in.ConsoleClient.CreatePrAutomation(ctx, *attributes)
	return pra, sha, nil, err
}

func (in *PrAutomationReconciler) updateReadyCondition(prAutomation *v1alpha1.PrAutomation) {
	utils.MarkTrue(prAutomation.SetCondition, v1alpha1.ReadyConditionType, v1alpha1.ReadyConditionReason, "")
}

// SetupWithManager is responsible for initializing new reconciler within provided ctrl.Manager.
func (in *PrAutomationReconciler) SetupWithManager(mgr ctrl.Manager) error {
	mgr.GetLogger().Info("Starting reconciler", "reconciler", "prautomation_reconciler")
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		For(&v1alpha1.PrAutomation{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(in)
}
