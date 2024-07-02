package controller

import (
	"context"

	corev1 "k8s.io/api/core/v1"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	"github.com/pluralsh/console/controller/api/v1alpha1"
	consoleclient "github.com/pluralsh/console/controller/internal/client"
	"github.com/pluralsh/console/controller/internal/utils"
)

// NamespaceCredentialsReconciler reconciles a v1alpha1.NamespaceCredentials object.
// Implements reconcile.Reconciler and types.Controller
type NamespaceCredentialsReconciler struct {
	client.Client
	ConsoleClient consoleclient.ConsoleClient
	Scheme        *runtime.Scheme
}

// +kubebuilder:rbac:groups=deployments.plural.sh,resources=namespacecredentialss,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=namespacecredentialss/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=namespacecredentialss/finalizers,verbs=update
// +kubebuilder:rbac:groups=core,resources=secrets,verbs=get;list;watch;patch

// Reconcile is part of the main kubernetes reconciliation loop which aims to sync v1alpha1.NamespaceCredentials
// with a global credentials map that will be later used by other reconcilers.
func (r *NamespaceCredentialsReconciler) Reconcile(ctx context.Context, req reconcile.Request) (_ reconcile.Result, reterr error) {
	logger := log.FromContext(ctx)

	nc := new(v1alpha1.NamespaceCredentials)
	if err := r.Get(ctx, req.NamespacedName, nc); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	scope, err := NewNamespaceCredentialsScope(ctx, r.Client, nc)
	if err != nil {
		logger.Error(err, "failed to create scope")
		utils.MarkCondition(nc.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Always patch object when exiting this function, so we can persist any object changes.
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()

	// Mark resource as not ready. This will be overridden in the end.
	utils.MarkCondition(nc.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	// TODO:
	// 		Create global concurrent map with mapping between namespace and credentials/client to use.
	//		Map has to be initialized before other reconcilers will start.
	//		Add impersonate func to console client interface that will switch tokens that are used. Then we can use separate clients for all reconcilers.
	//		Each reconciler has to check if it is reconciling object that should use namespace credentials instead of default ones.

	utils.MarkCondition(nc.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(nc.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

	return requeue, nil
}

// SetupWithManager is responsible for initializing new reconciler within provided ctrl.Manager.
func (r *NamespaceCredentialsReconciler) SetupWithManager(mgr ctrl.Manager) error {
	mgr.GetLogger().Info("Starting reconciler", "reconciler", "namespacecredentials_reconciler")
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.NamespaceCredentials{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Owns(&corev1.Secret{}, builder.WithPredicates(predicate.ResourceVersionChangedPredicate{})).
		Complete(r)
}
