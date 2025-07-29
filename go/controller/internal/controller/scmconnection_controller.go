package controller

import (
	"context"
	"fmt"

	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
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
	"github.com/pluralsh/console/go/controller/internal/utils"
)

// ScmConnectionReconciler reconciles a v1alpha1.ScmConnection object.
// Implements reconcile.Reconciler and types.Controller
type ScmConnectionReconciler struct {
	client.Client

	ConsoleClient consoleclient.ConsoleClient
	Scheme        *runtime.Scheme
}

const (
	// ScmConnectionProtectionFinalizerName defines name for the main finalizer that synchronizes
	// resource deletion from the Console API prior to removing the CRD.
	ScmConnectionProtectionFinalizerName = "scmconnections.deployments.plural.sh/scmconnection-protection"
)

// +kubebuilder:rbac:groups=deployments.plural.sh,resources=scmconnections,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=scmconnections/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=scmconnections/finalizers,verbs=update
// +kubebuilder:rbac:groups=core,resources=secrets,verbs=get;list;watch;update;patch

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the v1alpha1.ScmConnection closer to the desired state
// and syncs it with the Console API state.
func (r *ScmConnectionReconciler) Reconcile(ctx context.Context, req reconcile.Request) (_ reconcile.Result, reterr error) {
	logger := log.FromContext(ctx)

	// Read ScmConnection CRD from the K8S API
	scm := new(v1alpha1.ScmConnection)
	if err := r.Get(ctx, req.NamespacedName, scm); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	utils.MarkCondition(scm.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	scope, err := NewDefaultScope(ctx, r.Client, scm)
	if err != nil {
		utils.MarkCondition(scm.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Always patch object when exiting this function, so we can persist any object changes.
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()

	// Mark resource as not ready. This will be overridden in the end.
	utils.MarkCondition(scm.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	// Handle proper resource deletion via finalizer
	result, err := r.addOrRemoveFinalizer(ctx, scm)
	if result != nil {
		return *result, err
	}

	// Check if resource already exists in the API and only sync the ID
	exists, err := r.isAlreadyExists(ctx, scm)
	if err != nil {
		utils.MarkCondition(scm.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	if exists {
		logger.V(9).Info("ScmConnection already exists in the API, running in read-only mode")
		utils.MarkCondition(scm.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionTrue, v1alpha1.ReadonlyConditionReason, v1alpha1.ReadonlyTrueConditionMessage.String())
		return r.handleExistingScmConnection(ctx, scm)
	}
	if r.shouldMarkAsReadonly(scm) {
		utils.MarkCondition(scm.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionTrue, v1alpha1.ReadonlyConditionReason, v1alpha1.ReadonlyTrueConditionMessage.String())
		utils.MarkCondition(scm.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonNotFound, v1alpha1.SynchronizedNotFoundConditionMessage.String())
		return requeue, nil
	}

	// Mark resource as managed by this operator.
	utils.MarkCondition(scm.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionFalse, v1alpha1.ReadonlyConditionReason, "")

	if err := TryAddOwnedByAnnotation(ctx, r.Client, scm); err != nil {
		return handleRequeue(nil, err, scm.SetCondition)
	}

	// Get ScmConnection SHA that can be saved back in the status to check for changes
	changed, sha, err := scm.Diff(utils.HashObject)
	if err != nil {
		logger.Error(err, "unable to calculate scm SHA")
		utils.MarkCondition(scm.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Sync ScmConnection CRD with the Console API
	apiScmConnection, err := r.sync(ctx, scm, changed)
	if err != nil {
		return handleRequeue(nil, err, scm.SetCondition)
	}

	scm.Status.ID = &apiScmConnection.ID
	scm.Status.SHA = &sha

	utils.MarkCondition(scm.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(scm.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

	return requeue, nil
}

func (r *ScmConnectionReconciler) handleExistingScmConnection(ctx context.Context, scm *v1alpha1.ScmConnection) (reconcile.Result, error) {
	exists, err := r.ConsoleClient.IsScmConnectionExists(ctx, scm.ConsoleName())
	if err != nil {
		return handleRequeue(nil, err, scm.SetCondition)
	}
	if !exists {
		scm.Status.ID = nil
		utils.MarkCondition(scm.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonNotFound, v1alpha1.SynchronizedNotFoundConditionMessage.String())
		return waitForResources, nil
	}

	apiScmConnection, err := r.ConsoleClient.GetScmConnectionByName(ctx, scm.ConsoleName())
	if err != nil {
		return handleRequeue(nil, err, scm.SetCondition)
	}

	// Default field should also be editable even if the resource is in the read-only mode.
	if scm.Spec.Default != nil {
		if apiScmConnection, err = r.ConsoleClient.UpdateScmConnection(ctx, apiScmConnection.ID, console.ScmConnectionAttributes{
			Name:    scm.ConsoleName(),
			Type:    scm.Spec.Type,
			Default: scm.Spec.Default,
		}); err != nil {
			return handleRequeue(nil, err, scm.SetCondition)
		}
	}

	scm.Status.ID = &apiScmConnection.ID

	utils.MarkCondition(scm.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkCondition(scm.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return requeue, nil
}

func (r *ScmConnectionReconciler) isAlreadyExists(ctx context.Context, scm *v1alpha1.ScmConnection) (bool, error) {
	if scm.Status.HasReadonlyCondition() {
		return scm.Status.IsReadonly(), nil
	}

	_, err := r.ConsoleClient.GetScmConnectionByName(ctx, scm.ConsoleName())
	if errors.IsNotFound(err) {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	if !scm.Status.HasID() {
		log.FromContext(ctx).Info("ScmConnection already exists in the API, running in read-only mode")
		return true, nil
	}

	return false, nil
}

func (r *ScmConnectionReconciler) addOrRemoveFinalizer(ctx context.Context, scm *v1alpha1.ScmConnection) (*ctrl.Result, error) {
	// If object is not being deleted and if it does not have our finalizer,
	// then lets add the finalizer. This is equivalent to registering our finalizer.
	if scm.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(scm, ScmConnectionProtectionFinalizerName) {
		controllerutil.AddFinalizer(scm, ScmConnectionProtectionFinalizerName)
	}

	// If object is being deleted cleanup and remove the finalizer.
	if !scm.DeletionTimestamp.IsZero() {
		// Remove ScmConnection from Console API if it exists
		exists, err := r.ConsoleClient.IsScmConnectionExists(ctx, scm.ConsoleName())
		if err != nil {
			return &ctrl.Result{}, err
		}

		if exists && !scm.Status.IsReadonly() {
			if err = r.ConsoleClient.DeleteScmConnection(ctx, scm.Status.GetID()); err != nil {
				// if it fails to delete the external dependency here, return with error
				// so that it can be retried.
				utils.MarkCondition(scm.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return &ctrl.Result{}, err
			}

			// If deletion process started requeue so that we can make sure scm
			// has been deleted from Console API before removing the finalizer.
			return &requeue, nil
		}

		// Stop reconciliation as the item is being deleted
		controllerutil.RemoveFinalizer(scm, ScmConnectionProtectionFinalizerName)
		return &ctrl.Result{}, nil
	}

	return nil, nil
}

func (r *ScmConnectionReconciler) sync(ctx context.Context, scm *v1alpha1.ScmConnection, changed bool) (*console.ScmConnectionFragment, error) {
	exists, err := r.ConsoleClient.IsScmConnectionExists(ctx, scm.ConsoleName())
	if err != nil {
		return nil, err
	}

	token, err := r.getTokenFromSecret(ctx, scm)
	if err != nil {
		return nil, err
	}

	// Update only if ScmConnection has changed
	if changed && exists {
		attr, err := scm.Attributes(ctx, r.Client, token)
		if err != nil {
			return nil, err
		}
		return r.ConsoleClient.UpdateScmConnection(ctx, scm.Status.GetID(), *attr)
	}

	// Read the ScmConnection from Console API if it already exists
	if exists {
		return r.ConsoleClient.GetScmConnectionByName(ctx, scm.ConsoleName())
	}

	// Create the ScmConnection in Console API if it doesn't exist
	attr, err := scm.Attributes(ctx, r.Client, token)
	if err != nil {
		return nil, err
	}
	return r.ConsoleClient.CreateScmConnection(ctx, *attr)
}

func (r *ScmConnectionReconciler) getTokenFromSecret(ctx context.Context, scm *v1alpha1.ScmConnection) (*string, error) {
	if scm.Spec.TokenSecretRef == nil {
		return nil, nil
	}
	const tokenKeyName = "token"

	secret, err := utils.GetSecret(ctx, r.Client, scm.Spec.TokenSecretRef)
	if err != nil {
		return nil, err
	}

	token, exists := secret.Data[tokenKeyName]
	if !exists {
		return nil, fmt.Errorf("%q key does not exist in referenced credential secret", tokenKeyName)
	}
	return lo.ToPtr(string(token)), nil
}

func (r *ScmConnectionReconciler) shouldMarkAsReadonly(scm *v1alpha1.ScmConnection) bool {
	return scm.Spec.TokenSecretRef == nil
}

// SetupWithManager is responsible for initializing new reconciler within provided ctrl.Manager.
func (r *ScmConnectionReconciler) SetupWithManager(mgr ctrl.Manager) error {
	mgr.GetLogger().Info("Starting reconciler", "reconciler", "scmconnection_reconciler")
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		For(&v1alpha1.ScmConnection{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Watches(&corev1.Secret{}, OwnedByEventHandler()).
		Complete(r)
}
