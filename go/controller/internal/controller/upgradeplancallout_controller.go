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
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
)

const UpgradePlanCalloutFinalizer = "deployments.plural.sh/upgrade-plan-callout-protection"

// UpgradePlanCalloutReconciler reconciles a UpgradePlanCallout object
type UpgradePlanCalloutReconciler struct {
	client.Client
	ConsoleClient consoleclient.ConsoleClient
	Scheme        *runtime.Scheme
}

//+kubebuilder:rbac:groups=deployments.plural.sh,resources=upgradeplancallouts,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=upgradeplancallouts/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=upgradeplancallouts/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.16.3/pkg/reconcile
func (r *UpgradePlanCalloutReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, reterr error) {
	logger := log.FromContext(ctx)

	callout := &v1alpha1.UpgradePlanCallout{}
	if err := r.Get(ctx, req.NamespacedName, callout); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	scope, err := common.NewDefaultScope(ctx, r.Client, callout)
	if err != nil {
		logger.Error(err, "failed to create scope")
		return ctrl.Result{}, err
	}
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()

	utils.MarkCondition(callout.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	result, err := r.addOrRemoveFinalizer(ctx, callout)
	if result != nil {
		return *result, err
	}

	sha, err := utils.HashObject(callout.Spec)
	if err != nil {
		return ctrl.Result{}, err
	}
	if !callout.Status.IsSHAEqual(sha) {
		attr := callout.Attributes()
		consoleCallout, err := r.ConsoleClient.UpsertUpgradePlanCallout(ctx, attr)
		if err != nil {
			utils.MarkCondition(callout.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}
		callout.Status.ID = &consoleCallout.ID
		callout.Status.SHA = lo.ToPtr(sha)
	}

	utils.MarkCondition(callout.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkCondition(callout.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	return callout.Spec.Reconciliation.Requeue(), nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *UpgradePlanCalloutReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		For(&v1alpha1.UpgradePlanCallout{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(r)
}

func (r *UpgradePlanCalloutReconciler) addOrRemoveFinalizer(ctx context.Context, callout *v1alpha1.UpgradePlanCallout) (*ctrl.Result, error) {
	if callout.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(callout, UpgradePlanCalloutFinalizer) {
		controllerutil.AddFinalizer(callout, UpgradePlanCalloutFinalizer)
	}

	if !callout.DeletionTimestamp.IsZero() {
		if !callout.Status.HasID() {
			controllerutil.RemoveFinalizer(callout, UpgradePlanCalloutFinalizer)
			return &ctrl.Result{}, nil
		}
		if err := r.ConsoleClient.DeleteUpgradePlanCallout(ctx, callout.ConsoleName()); err != nil && !errors.IsNotFound(err) {
			utils.MarkCondition(callout.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return &ctrl.Result{}, err
		}
		controllerutil.RemoveFinalizer(callout, UpgradePlanCalloutFinalizer)
	}

	return nil, nil
}
