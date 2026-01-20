package controller

import (
	"context"
	"fmt"

	"github.com/pluralsh/console/go/controller/internal/common"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
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

const scopeHashAnnotation = "deployments.plural.sh/last-scope-hash"

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

	scope, err := common.NewDefaultScope(ctx, r.Client, sa)
	if err != nil {
		logger.Error(err, "failed to create scope")
		return ctrl.Result{}, err
	}
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
	if exists && !sa.Spec.Reconciliation.DriftDetect() {
		logger.V(9).Info("ServiceAccount already exists in the API, running in read-only mode")
		utils.MarkReadOnly(sa)
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

	return sa.Spec.Reconciliation.Requeue(), nil
}

func (r *ServiceAccountReconciler) handleExistingServiceAccount(ctx context.Context, sa *v1alpha1.ServiceAccount) (reconcile.Result, error) {
	exists, err := r.ConsoleClient.IsServiceAccountExists(ctx, sa.Spec.Email)
	if err != nil {
		return common.HandleRequeue(nil, err, sa.SetCondition)
	}

	if !exists {
		sa.Status.ID = nil
		utils.MarkCondition(sa.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonNotFound, v1alpha1.SynchronizedNotFoundConditionMessage.String())
		return common.Wait(), nil
	}

	apiServiceAccount, err := r.ConsoleClient.GetServiceAccount(ctx, sa.Spec.Email)
	if err != nil {
		return common.HandleRequeue(nil, err, sa.SetCondition)
	}

	sa.Status.ID = &apiServiceAccount.ID

	// utils.MarkCondition(sa.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	// utils.MarkCondition(sa.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return sa.Spec.Reconciliation.Requeue(), nil
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
	existingSA, err := r.ConsoleClient.GetServiceAccount(ctx, sa.Spec.Email)
	if err != nil {
		if !errors.IsNotFound(err) {
			return nil, err
		}
		return r.ConsoleClient.CreateServiceAccount(ctx, sa.Attributes())
	}

	// Update only if ServiceAccount has changed
	if changed {
		attr := sa.Attributes()
		return r.ConsoleClient.UpdateServiceAccount(ctx, existingSA.ID, attr)
	}

	return existingSA, nil
}

func (r *ServiceAccountReconciler) syncToken(ctx context.Context, sa *v1alpha1.ServiceAccount) error {
	if sa.Spec.TokenSecretRef == nil {
		return nil
	}

	if sa.Annotations == nil {
		sa.Annotations = make(map[string]string)
	}
	var err error
	currentScopeSHA := ""
	scopeSHA := sa.Annotations[scopeHashAnnotation]
	if len(sa.Spec.Scopes) > 0 {
		currentScopeSHA, err = utils.HashObject(sa.Spec.Scopes)
		if err != nil {
			return err
		}
	}
	// If scope hasn't changed, no need to recreate the token
	if scopeSHA == currentScopeSHA {
		return nil
	}
	sa.Annotations[scopeHashAnnotation] = currentScopeSHA

	token, err := r.ConsoleClient.CreateServiceAccountToken(ctx, *sa.Status.ID, sa.Spec.ScopeAttributes(), sa.Spec.TokenExpiry)
	if err != nil {
		return fmt.Errorf("failed to create service account token: %s", err.Error())
	}
	if token.Token == nil {
		return fmt.Errorf("service account token is empty")
	}

	secret := &corev1.Secret{}
	err = r.Get(ctx, types.NamespacedName{Name: sa.Spec.TokenSecretRef.Name, Namespace: getTokenSecretNamespace(sa)}, secret)
	if err != nil && !errors.IsNotFound(err) {
		return err
	}

	if err == nil {
		secret.StringData = map[string]string{credentials.CredentialsSecretTokenKey: *token.Token}
		if err = controllerutil.SetControllerReference(sa, secret, r.Scheme); err != nil {
			return err
		}
		return r.Update(ctx, secret)
	}

	secret = &corev1.Secret{
		ObjectMeta: v1.ObjectMeta{Name: sa.Spec.TokenSecretRef.Name, Namespace: getTokenSecretNamespace(sa)},
		StringData: map[string]string{credentials.CredentialsSecretTokenKey: *token.Token},
	}
	if err = controllerutil.SetControllerReference(sa, secret, r.Scheme); err != nil {
		return err
	}
	return r.Create(ctx, secret)
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
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		For(&v1alpha1.ServiceAccount{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Owns(&corev1.Secret{}, builder.WithPredicates(predicate.ResourceVersionChangedPredicate{})).
		Complete(r)
}
