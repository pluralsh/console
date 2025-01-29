package controller

import (
	"context"
	"fmt"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/internal/credentials"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	consoleclient "github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/utils"
)

// ServiceAccountReconciler reconciles a v1alpha1.ServiceAccount object.
// Implements reconcile.Reconciler and types.Controller
type ServiceAccountReconciler struct {
	client.Client

	ConsoleClient consoleclient.ConsoleClient
	Scheme        *runtime.Scheme
}

// +kubebuilder:rbac:groups=deployments.plural.sh,resources=serviceaccounts,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=serviceaccounts/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=serviceaccounts/finalizers,verbs=update
// +kubebuilder:rbac:groups=core,resources=secrets,verbs=get;list;watch;patch

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the v1alpha1.ServiceAccount closer to the desired state
// and syncs it with the Console API state.
func (r *ServiceAccountReconciler) Reconcile(ctx context.Context, req reconcile.Request) (_ reconcile.Result, reterr error) {
	logger := log.FromContext(ctx)

	sa := new(v1alpha1.ServiceAccount)
	if err := r.Get(ctx, req.NamespacedName, sa); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	utils.MarkCondition(sa.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")
	scope, err := NewDefaultScope(ctx, r.Client, sa)
	if err != nil {
		utils.MarkCondition(sa.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Always patch object when exiting this function, so we can persist any object changes.
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()

	// Mark resource as not ready. This will be overridden in the end.
	utils.MarkCondition(sa.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	// Check if resource already exists in the API and only sync the ID
	exists, err := r.isAlreadyExists(ctx, sa)
	if err != nil {
		utils.MarkCondition(sa.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	if exists {
		logger.V(9).Info("ServiceAccount already exists in the API, running in read-only mode")
		utils.MarkCondition(sa.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionTrue, v1alpha1.ReadonlyConditionReason, v1alpha1.ReadonlyTrueConditionMessage.String())
		return r.handleExistingServiceAccount(ctx, sa)
	}

	// Mark resource as managed by this operator.
	utils.MarkCondition(sa.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionFalse, v1alpha1.ReadonlyConditionReason, "")

	// Get ServiceAccount SHA that can be saved back in the status to check for changes
	changed, sha, err := sa.Diff(utils.HashObject)
	if err != nil {
		logger.Error(err, "unable to calculate sa SHA")
		utils.MarkCondition(sa.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Check if secret with token exists
	hasTokenSecret := false
	if sa.Spec.TokenSecretRef != nil {
		secret, _ := utils.GetSecret(ctx, r.Client, sa.Spec.TokenSecretRef)
		if secret != nil {
			_, hasTokenSecret = secret.Data[credentials.CredentialsSecretTokenKey]
		}
	}

	// Mark token as not ready if found any changes in the resource or if secret doesn't exist
	if changed || !hasTokenSecret {
		utils.MarkCondition(sa.SetCondition, v1alpha1.ReadyTokenConditionType, v1.ConditionFalse, v1alpha1.ReadyTokenConditionReasonError, "token not synchronized yet")
	}

	// Sync ServiceAccount CRD with the Console API
	apiServiceAccount, err := r.sync(ctx, sa, changed)
	if err != nil {
		logger.Error(err, "unable to create or update sa")
		utils.MarkCondition(sa.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	sa.Status.ID = &apiServiceAccount.ID
	sa.Status.SHA = &sha

	err = r.syncToken(ctx, sa)
	if err != nil {
		logger.Error(err, "unable to create token secret")
		utils.MarkCondition(sa.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	utils.MarkCondition(sa.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(sa.SetCondition, v1alpha1.ReadyTokenConditionType, v1.ConditionTrue, v1alpha1.ReadyTokenConditionReason, "")
	utils.MarkCondition(sa.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

	return requeue, nil
}

func (r *ServiceAccountReconciler) handleExistingServiceAccount(ctx context.Context, sa *v1alpha1.ServiceAccount) (reconcile.Result, error) {
	exists, err := r.ConsoleClient.IsServiceAccountExists(ctx, sa.Spec.Email)
	if err != nil {
		return ctrl.Result{}, err
	}

	if !exists {
		sa.Status.ID = nil
		utils.MarkCondition(sa.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonNotFound, v1alpha1.SynchronizedNotFoundConditionMessage.String())
		return ctrl.Result{}, nil
	}

	apiServiceAccount, err := r.ConsoleClient.GetServiceAccount(ctx, sa.Spec.Email)
	if err != nil {
		utils.MarkCondition(sa.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	sa.Status.ID = &apiServiceAccount.ID

	// utils.MarkCondition(sa.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	// utils.MarkCondition(sa.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return requeue, nil
}

func (r *ServiceAccountReconciler) isAlreadyExists(ctx context.Context, sa *v1alpha1.ServiceAccount) (bool, error) {
	// if sa.Status.HasReadonlyCondition() {
	// 	return sa.Status.IsReadonly(), nil
	// }

	_, err := r.ConsoleClient.GetServiceAccount(ctx, sa.Spec.Email)
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

func (r *ServiceAccountReconciler) sync(ctx context.Context, sa *v1alpha1.ServiceAccount, changed bool) (*console.UserFragment, error) {
	logger := log.FromContext(ctx)
	exists, err := r.ConsoleClient.IsServiceAccountExists(ctx, sa.Spec.Email)
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
		return r.ConsoleClient.GetServiceAccount(ctx, sa.Spec.Email)
	}

	// Create the ServiceAccount in Console API if it doesn't exist
	logger.Info("Creating ServiceAccount")
	attr := sa.Attributes()

	return r.ConsoleClient.CreateServiceAccount(ctx, attr)
}

func (r *ServiceAccountReconciler) syncToken(ctx context.Context, sa *v1alpha1.ServiceAccount) error {
	logger := log.FromContext(ctx)

	if sa.Status.IsStatusConditionTrue(v1alpha1.ReadyTokenConditionType) {
		return nil
	}

	if sa.Spec.TokenSecretRef == nil {
		logger.Info("no token secret ref found in service account, skipping token creation")
		return nil
	}

	token, err := r.ConsoleClient.CreateServiceAccountToken(ctx, *sa.Status.ID, []*console.ScopeAttributes{})
	if err != nil {
		logger.Info("failed to create service account token")
		return err
	}
	if token.Token == nil {
		logger.Info("service account token is empty")
		return fmt.Errorf("service account token is empty")
	}

	secret := &corev1.Secret{}
	err = r.Client.Get(ctx, types.NamespacedName{Name: sa.Spec.TokenSecretRef.Name, Namespace: getTokenSecretNamespace(sa)}, secret)
	if err != nil && !errors.IsNotFound(err) {
		logger.Info("failed to get token secret")
		return err
	}

	if err == nil {
		logger.Info("updating existing token secret")
		secret.StringData = map[string]string{credentials.CredentialsSecretTokenKey: *token.Token}
		if err = controllerutil.SetControllerReference(sa, secret, r.Scheme); err != nil {
			return err
		}
		err = r.Client.Update(ctx, secret)
		return err
	}

	logger.Info("creating new token secret")
	secret = &corev1.Secret{
		ObjectMeta: v1.ObjectMeta{Name: sa.Spec.TokenSecretRef.Name, Namespace: getTokenSecretNamespace(sa)},
		StringData: map[string]string{credentials.CredentialsSecretTokenKey: *token.Token},
	}
	if err = controllerutil.SetControllerReference(sa, secret, r.Scheme); err != nil {
		return err
	}
	return r.Client.Create(ctx, secret)
}

func getTokenSecretNamespace(sa *v1alpha1.ServiceAccount) string {
	if sa.Spec.TokenSecretRef.Namespace != "" {
		return sa.Spec.TokenSecretRef.Namespace
	}

	if sa.Namespace != "" {
		return sa.Namespace
	}

	return "default"
}

// SetupWithManager is responsible for initializing new reconciler within provided ctrl.Manager.
func (r *ServiceAccountReconciler) SetupWithManager(mgr ctrl.Manager) error {
	mgr.GetLogger().Info("Starting reconciler", "reconciler", "serviceaccount_reconciler")
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.ServiceAccount{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Owns(&corev1.Secret{}, builder.WithPredicates(predicate.ResourceVersionChangedPredicate{})).
		Complete(r)
}
