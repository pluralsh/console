package controller

import (
	"context"
	"fmt"

	console "github.com/pluralsh/console-client-go"
	corev1 "k8s.io/api/core/v1"
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

	"github.com/pluralsh/console/controller/api/v1alpha1"
	consoleclient "github.com/pluralsh/console/controller/internal/client"
	"github.com/pluralsh/console/controller/internal/utils"
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
// +kubebuilder:rbac:groups=core,resources=secrets,verbs=get;list;watch;patch

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

	scope, err := NewScmConnectionScope(ctx, r.Client, scm)
	if err != nil {
		logger.Error(err, "failed to create scope")
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

	// Mark resource as managed by this operator.
	utils.MarkCondition(scm.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionFalse, v1alpha1.ReadonlyConditionReason, "")

	err = r.tryAddControllerRef(ctx, scm)
	if err != nil {
		utils.MarkCondition(scm.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
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
		logger.Error(err, "unable to create or update scm")
		utils.MarkCondition(scm.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	scm.Status.ID = &apiScmConnection.ID
	scm.Status.SHA = &sha

	utils.MarkCondition(scm.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(scm.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

	return requeue, nil
}

func (r *ScmConnectionReconciler) handleExistingScmConnection(ctx context.Context, scm *v1alpha1.ScmConnection) (reconcile.Result, error) {
	if !r.ConsoleClient.IsScmConnectionExists(ctx, scm.ConsoleName()) {
		scm.Status.ID = nil
		utils.MarkCondition(scm.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonNotFound, "Could not find ScmConnection in Console API")
		return ctrl.Result{}, nil
	}

	apiScmConnection, err := r.ConsoleClient.GetScmConnectionByName(ctx, scm.ConsoleName())
	if err != nil {
		utils.MarkCondition(scm.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
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
	logger := log.FromContext(ctx)

	// If object is not being deleted and if it does not have our finalizer,
	// then lets add the finalizer. This is equivalent to registering our finalizer.
	if scm.ObjectMeta.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(scm, ScmConnectionProtectionFinalizerName) {
		controllerutil.AddFinalizer(scm, ScmConnectionProtectionFinalizerName)
	}

	// If object is being deleted cleanup and remove the finalizer.
	if !scm.ObjectMeta.DeletionTimestamp.IsZero() {
		// Remove ScmConnection from Console API if it exists
		if r.ConsoleClient.IsScmConnectionExists(ctx, scm.ConsoleName()) && !scm.Status.IsReadonly() {
			logger.Info("Deleting ScmConnection")
			if err := r.ConsoleClient.DeleteScmConnection(ctx, scm.Status.GetID()); err != nil {
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
	logger := log.FromContext(ctx)
	exists := r.ConsoleClient.IsScmConnectionExists(ctx, scm.ConsoleName())
	token, err := r.getTokenFromSecret(ctx, scm)
	if err != nil {
		return nil, err
	}

	// Update only if ScmConnection has changed
	if changed && exists {
		logger.Info("Updating ScmConnection")
		return r.ConsoleClient.UpdateScmConnection(ctx, scm.Status.GetID(), scm.Attributes(token))
	}

	// Read the ScmConnection from Console API if it already exists
	if exists {
		return r.ConsoleClient.GetScmConnectionByName(ctx, scm.ConsoleName())
	}

	// Create the ScmConnection in Console API if it doesn't exist
	logger.Info("Creating ScmConnection")
	return r.ConsoleClient.CreateScmConnection(ctx, scm.Attributes(token))
}

func (r *ScmConnectionReconciler) getTokenFromSecret(ctx context.Context, scm *v1alpha1.ScmConnection) (string, error) {
	const tokenKeyName = "token"

	secret, err := utils.GetSecret(ctx, r.Client, scm.Spec.TokenSecretRef)
	if err != nil {
		return "", err
	}

	token, exists := secret.Data[tokenKeyName]
	if !exists {
		return "", fmt.Errorf("%q key does not exist in referenced credential secret", tokenKeyName)
	}

	return string(token), nil
}

func (r *ScmConnectionReconciler) tryAddControllerRef(ctx context.Context, scm *v1alpha1.ScmConnection) error {
	secret, err := utils.GetSecret(ctx, r.Client, scm.Spec.TokenSecretRef)
	if err != nil {
		return err
	}

	return utils.TryAddControllerRef(ctx, r.Client, scm, secret, r.Scheme)
}

// SetupWithManager is responsible for initializing new reconciler within provided ctrl.Manager.
func (r *ScmConnectionReconciler) SetupWithManager(mgr ctrl.Manager) error {
	mgr.GetLogger().Info("Starting reconciler", "reconciler", "scmconnection_reconciler")
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.ScmConnection{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Owns(&corev1.Secret{}, builder.WithPredicates(predicate.ResourceVersionChangedPredicate{})).
		Complete(r)
}
