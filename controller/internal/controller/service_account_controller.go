package controller

import (
	"context"
	"fmt"

	console "github.com/pluralsh/console-client-go"
	"github.com/samber/lo"
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

// ServiceAccountReconciler reconciles a v1alpha1.ServiceAccount object.
// Implements reconcile.Reconciler and types.Controller
type ServiceAccountReconciler struct {
	client.Client

	ConsoleClient consoleclient.ConsoleClient
	Scheme        *runtime.Scheme
}

const (
	// ServiceAccountProtectionFinalizerName defines name for the main finalizer that synchronizes
	// resource deletion from the Console API prior to removing the CRD.
	ServiceAccountProtectionFinalizerName = "serviceaccounts.deployments.plural.sh/serviceaccount-protection"

	tokenKeyName = "token"
)

// +kubebuilder:rbac:groups=deployments.plural.sh,resources=serviceaccounts,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=serviceaccounts/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=serviceaccounts/finalizers,verbs=update
// +kubebuilder:rbac:groups=core,resources=secrets,verbs=get;list;watch;patch

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the v1alpha1.ServiceAccount closer to the desired state
// and syncs it with the Console API state.
func (r *ServiceAccountReconciler) Reconcile(ctx context.Context, req reconcile.Request) (_ reconcile.Result, reterr error) {
	logger := log.FromContext(ctx)

	scm := new(v1alpha1.ServiceAccount)
	if err := r.Get(ctx, req.NamespacedName, scm); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	scope, err := NewServiceAccountScope(ctx, r.Client, scm)
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
		logger.V(9).Info("ServiceAccount already exists in the API, running in read-only mode")
		utils.MarkCondition(scm.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionTrue, v1alpha1.ReadonlyConditionReason, v1alpha1.ReadonlyTrueConditionMessage.String())
		return r.handleExistingServiceAccount(ctx, scm)
	}
	if r.shouldMarkAsReadonly(scm) {
		utils.MarkCondition(scm.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionTrue, v1alpha1.ReadonlyConditionReason, v1alpha1.ReadonlyTrueConditionMessage.String())
		utils.MarkCondition(scm.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonNotFound, v1alpha1.SynchronizedNotFoundConditionMessage.String())
		return requeue, nil
	}

	// Mark resource as managed by this operator.
	utils.MarkCondition(scm.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionFalse, v1alpha1.ReadonlyConditionReason, "")

	err = r.tryAddControllerRef(ctx, scm)
	if err != nil {
		utils.MarkCondition(scm.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Get ServiceAccount SHA that can be saved back in the status to check for changes
	changed, sha, err := scm.Diff(utils.HashObject)
	if err != nil {
		logger.Error(err, "unable to calculate scm SHA")
		utils.MarkCondition(scm.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Sync ServiceAccount CRD with the Console API
	apiServiceAccount, err := r.sync(ctx, scm, changed)
	if err != nil {
		logger.Error(err, "unable to create or update scm")
		utils.MarkCondition(scm.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	scm.Status.ID = &apiServiceAccount.ID
	scm.Status.SHA = &sha

	utils.MarkCondition(scm.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(scm.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

	return requeue, nil
}

func (r *ServiceAccountReconciler) handleExistingServiceAccount(ctx context.Context, scm *v1alpha1.ServiceAccount) (reconcile.Result, error) {
	exists, err := r.ConsoleClient.IsServiceAccountExists(ctx, scm.ConsoleName())
	if err != nil {
		return ctrl.Result{}, err
	}

	if !exists {
		scm.Status.ID = nil
		utils.MarkCondition(scm.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonNotFound, v1alpha1.SynchronizedNotFoundConditionMessage.String())
		return ctrl.Result{}, nil
	}

	apiServiceAccount, err := r.ConsoleClient.GetUser(scm.Spec.Email)
	if err != nil {
		utils.MarkCondition(scm.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	scm.Status.ID = &apiServiceAccount.ID

	utils.MarkCondition(scm.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkCondition(scm.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return requeue, nil
}

func (r *ServiceAccountReconciler) isAlreadyExists(ctx context.Context, sa *v1alpha1.ServiceAccount) (bool, error) {
	if sa.Status.HasReadonlyCondition() {
		return sa.Status.IsReadonly(), nil
	}

	_, err := r.ConsoleClient.GetUser(sa.Spec.Email)
	if errors.IsNotFound(err) {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	if !sa.Status.HasID() {
		log.FromContext(ctx).Info(fmt.Sprintf("ServiceAccount with %s email already exists in the API, running in read-only mode", sa.Spec.Email))
		return true, nil
	}

	return false, nil
}

func (r *ServiceAccountReconciler) addOrRemoveFinalizer(ctx context.Context, scm *v1alpha1.ServiceAccount) (*ctrl.Result, error) {
	logger := log.FromContext(ctx)

	// If object is not being deleted and if it does not have our finalizer,
	// then lets add the finalizer. This is equivalent to registering our finalizer.
	if scm.ObjectMeta.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(scm, ServiceAccountProtectionFinalizerName) {
		controllerutil.AddFinalizer(scm, ServiceAccountProtectionFinalizerName)
	}

	// If object is being deleted cleanup and remove the finalizer.
	if !scm.ObjectMeta.DeletionTimestamp.IsZero() {
		// Remove ServiceAccount from Console API if it exists
		exists, err := r.ConsoleClient.IsServiceAccountExists(ctx, scm.ConsoleName())
		if err != nil {
			return &ctrl.Result{}, err
		}

		if exists && !scm.Status.IsReadonly() {
			logger.Info("Deleting ServiceAccount")
			if err = r.ConsoleClient.DeleteServiceAccount(ctx, scm.Status.GetID()); err != nil {
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
		controllerutil.RemoveFinalizer(scm, ServiceAccountProtectionFinalizerName)
		return &ctrl.Result{}, nil
	}

	return nil, nil
}

func (r *ServiceAccountReconciler) sync(ctx context.Context, sa *v1alpha1.ServiceAccount, changed bool) (*console.UserFragment, error) {
	logger := log.FromContext(ctx)
	exists, err := r.ConsoleClient.IsServiceAccountExists(ctx, sa.ConsoleName())
	if err != nil {
		return nil, err
	}

	token, err := r.getTokenFromSecret(ctx, sa)
	if err != nil {
		return nil, err
	}

	// Update only if ServiceAccount has changed
	if changed && exists {
		logger.Info("Updating ServiceAccount")
		attr := sa.Attributes()
		return r.ConsoleClient.UpdateServiceAccount(ctx, sa.Status.GetID(), attr)
	}

	// Read the ServiceAccount from Console API if it already exists
	if exists {
		return r.ConsoleClient.GetServiceAccount(ctx, sa.ConsoleName())
	}

	// Create the ServiceAccount in Console API if it doesn't exist
	logger.Info("Creating ServiceAccount")
	attr := sa.Attributes()

	// todo token

	return r.ConsoleClient.CreateServiceAccount(ctx, attr)
}

func (r *ServiceAccountReconciler) getTokenFromSecret(ctx context.Context, scm *v1alpha1.ServiceAccount) (*string, error) {
	if scm.Spec.TokenSecretRef == nil {
		return nil, nil
	}

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

func (r *ServiceAccountReconciler) tryAddControllerRef(ctx context.Context, scm *v1alpha1.ServiceAccount) error {
	if scm.Spec.TokenSecretRef == nil {
		return nil
	}

	secret, err := utils.GetSecret(ctx, r.Client, scm.Spec.TokenSecretRef)
	if err != nil {
		return err
	}

	return utils.TryAddControllerRef(ctx, r.Client, scm, secret, r.Scheme)
}

func (r *ServiceAccountReconciler) shouldMarkAsReadonly(scm *v1alpha1.ServiceAccount) bool {
	return scm.Spec.TokenSecretRef == nil
}

// SetupWithManager is responsible for initializing new reconciler within provided ctrl.Manager.
func (r *ServiceAccountReconciler) SetupWithManager(mgr ctrl.Manager) error {
	mgr.GetLogger().Info("Starting reconciler", "reconciler", "serviceaccount_reconciler")
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.ServiceAccount{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Owns(&corev1.Secret{}, builder.WithPredicates(predicate.ResourceVersionChangedPredicate{})).
		Complete(r)
}
