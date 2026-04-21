package controller

import (
	"context"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	consoleclient "github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/common"
	"github.com/pluralsh/console/go/controller/internal/utils"
	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/api/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

// SentinelTriggerReconciler reconciles a SentinelTrigger object
type SentinelTriggerReconciler struct {
	client.Client
	Scheme        *runtime.Scheme
	ConsoleClient consoleclient.ConsoleClient
}

//+kubebuilder:rbac:groups=deployments.plural.sh,resources=sentineltriggers,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=sentineltriggers/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=sentineltriggers/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.16.3/pkg/reconcile
func (r *SentinelTriggerReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ reconcile.Result, reterr error) {
	logger := log.FromContext(ctx)

	trigger := new(v1alpha1.SentinelTrigger)
	if err := r.Get(ctx, req.NamespacedName, trigger); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	sentinel := &v1alpha1.Sentinel{}
	if err := r.Get(ctx, client.ObjectKey{Name: trigger.Spec.SentinelRef.Name, Namespace: lo.CoalesceOrEmpty(trigger.Spec.SentinelRef.Namespace, "default")}, sentinel); err != nil {
		utils.MarkCondition(trigger.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	if !sentinel.DeletionTimestamp.IsZero() {
		return ctrl.Result{}, nil
	}

	if !sentinel.Status.HasID() {
		logger.Info("sentinel is not ready", "name", sentinel.Name, "namespace", sentinel.Namespace)
		return ctrl.Result{}, nil
	}

	if err := utils.TryAddControllerRef(ctx, r.Client, sentinel, trigger, r.Scheme); err != nil {
		return ctrl.Result{}, err
	}

	scope, err := common.NewDefaultScope(ctx, r.Client, trigger)
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
	utils.MarkFalse(trigger.SetCondition, v1alpha1.ReadyConditionType, v1alpha1.ReadyConditionReason, "")

	sha, err := utils.HashObject(trigger.Spec)
	if err != nil {
		return ctrl.Result{}, err
	}
	// Check if resource already exists in the API and only sync the ID
	exists, err := r.isAlreadyExists(ctx, trigger)
	if err != nil {
		utils.MarkCondition(trigger.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	if !exists || !trigger.Status.IsSHAEqual(sha) {
		sr, err := r.ConsoleClient.RunSentinel(ctx, sentinel.Status.GetID())
		if err != nil {
			utils.MarkCondition(trigger.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}
		trigger.Status.ID = sr
		trigger.Status.SHA = lo.ToPtr(sha)
	}

	utils.MarkCondition(trigger.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkCondition(trigger.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return ctrl.Result{}, nil
}

func (r *SentinelTriggerReconciler) isAlreadyExists(ctx context.Context, trigger *v1alpha1.SentinelTrigger) (bool, error) {
	if !trigger.Status.HasID() {
		return false, nil
	}

	_, err := r.ConsoleClient.GetSentinelRun(ctx, trigger.Status.GetID())
	if err != nil {
		if errors.IsNotFound(err) {
			return false, nil
		}
		return false, err
	}

	return true, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *SentinelTriggerReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.SentinelTrigger{}).
		Complete(r)
}
