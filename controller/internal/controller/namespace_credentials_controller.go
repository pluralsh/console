package controller

import (
	"context"
	"fmt"

	"github.com/pluralsh/console/controller/internal/cache"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	"github.com/pluralsh/console/controller/api/v1alpha1"
	consoleclient "github.com/pluralsh/console/controller/internal/client"
	"github.com/pluralsh/console/controller/internal/utils"
)

const (
	NamespaceCredentialsFinalizer = "deployments.plural.sh/namespace-credentials-protection"
)

// NamespaceCredentialsReconciler reconciles a v1alpha1.NamespaceCredentials object.
// Implements reconcile.Reconciler and types.Controller
type NamespaceCredentialsReconciler struct {
	client.Client
	ConsoleClient    consoleclient.ConsoleClient
	Scheme           *runtime.Scheme
	CredentialsCache cache.NamespaceCredentialsCache
}

// +kubebuilder:rbac:groups=deployments.plural.sh,resources=namespacecredentialss,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=namespacecredentialss/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=namespacecredentialss/finalizers,verbs=update
// +kubebuilder:rbac:groups=core,resources=secrets,verbs=get;list;watch;patch

// Reconcile is part of the main kubernetes reconciliation loop which aims to sync v1alpha1.NamespaceCredentials
// with a global credentials map that will be later used by other reconcilers.
func (r *NamespaceCredentialsReconciler) Reconcile(ctx context.Context, req reconcile.Request) (_ reconcile.Result, reterr error) {
	nc := new(v1alpha1.NamespaceCredentials)
	if err := r.Get(ctx, req.NamespacedName, nc); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	scope, err := NewNamespaceCredentialsScope(ctx, r.Client, nc)
	if err != nil {
		utils.MarkCondition(nc.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, fmt.Sprintf("failed to create scope: %s", err.Error()))
		return ctrl.Result{}, err
	}

	// Always patch the object when exiting this function, so we can persist any object changes.
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()

	// If the object is not being deleted and if it does not have our finalizer, then lets add the finalizer.
	// This is equivalent to registering our finalizer.
	if nc.ObjectMeta.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(nc, NamespaceCredentialsFinalizer) {
		controllerutil.AddFinalizer(nc, NamespaceCredentialsFinalizer)
	}

	// If the object is being deleted, cleanup, remove the finalizer and stop reconciliation.
	if !nc.ObjectMeta.DeletionTimestamp.IsZero() {
		r.CredentialsCache.RemoveNamespaceCredentials(nc)
		controllerutil.RemoveFinalizer(nc, NamespaceCredentialsFinalizer)
		return ctrl.Result{}, nil
	}

	// Try to add namespace credentials to cache.
	if err := r.CredentialsCache.AddNamespaceCredentials(nc); err != nil {
		utils.MarkFalse(nc.SetCondition, v1alpha1.SynchronizedConditionType, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	utils.MarkTrue(nc.SetCondition, v1alpha1.SynchronizedConditionType, v1alpha1.SynchronizedConditionReason, "")

	return requeue, nil
}

// SetupWithManager is responsible for initializing new reconciler within provided ctrl.Manager.
func (r *NamespaceCredentialsReconciler) SetupWithManager(mgr ctrl.Manager) error {
	mgr.GetLogger().Info("Starting reconciler", "reconciler", "namespacecredentials_reconciler")
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.NamespaceCredentials{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(r)
}
