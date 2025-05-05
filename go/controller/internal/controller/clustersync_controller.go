package controller

import (
	"context"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	consoleclient "github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/utils"
	"github.com/samber/lo"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
)

// ClusterSyncReconciler reconciles a ClusterSync object
type ClusterSyncReconciler struct {
	client.Client

	ConsoleClient consoleclient.ConsoleClient
	Scheme        *runtime.Scheme
}

//+kubebuilder:rbac:groups=deployments.plural.sh,resources=clustersyncs,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=clustersyncs/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=clustersyncs/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.16.3/pkg/reconcile
func (r *ClusterSyncReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, retErr error) {
	logger := log.FromContext(ctx)
	logger.V(5).Info("reconciling ClusterSync")

	clusterSync := new(v1alpha1.ClusterSync)
	if err := r.Get(ctx, req.NamespacedName, clusterSync); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	utils.MarkCondition(clusterSync.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(clusterSync.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, "")

	scope, err := NewDefaultScope(ctx, r.Client, clusterSync)
	if err != nil {
		utils.MarkCondition(clusterSync.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Always patch object when exiting this function, so we can persist any object changes.
	defer func() {
		if err := scope.PatchObject(); err != nil && retErr == nil {
			retErr = err
		}
	}()

	project, res, err := GetProject(ctx, r.Client, r.Scheme, clusterSync)
	if res != nil || err != nil {
		return handleRequeue(res, err, clusterSync.SetCondition)
	}

	clusterAPI, err := r.ConsoleClient.GetClusterByHandle(lo.ToPtr(clusterSync.GetName()))
	if err != nil {
		logger.V(5).Info("failed to get cluster by handle", "clusterHandle", clusterSync.GetName())
		utils.MarkCondition(clusterSync.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		if apierrors.IsNotFound(err) {
			return requeue, nil
		}
		return ctrl.Result{}, err
	}
	if project.Status.HasID() && project.Status.GetID() != clusterAPI.Project.ID {
		logger.V(5).Info("cluster project id does not match project id", "clusterProjectID", clusterAPI.Project.ID, "projectID", project.Status.GetID())
		utils.MarkCondition(clusterSync.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, "cluster project id does not match project id")
		return requeue, nil
	}

	return requeue, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *ClusterSyncReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		For(&v1alpha1.ClusterSync{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(r)
}
