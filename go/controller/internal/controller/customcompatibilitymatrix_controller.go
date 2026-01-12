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

const CustomCompatibilityMatrixFinalizer = "deployments.plural.sh/custom-compatibility-matrix-protection"

// CustomCompatibilityMatrixReconciler reconciles a CustomCompatibilityMatrix object
type CustomCompatibilityMatrixReconciler struct {
	client.Client
	Scheme        *runtime.Scheme
	ConsoleClient consoleclient.ConsoleClient
}

//+kubebuilder:rbac:groups=deployments.plural.sh,resources=customcompatibilitymatrices,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=customcompatibilitymatrices/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=customcompatibilitymatrices/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.16.3/pkg/reconcile
func (r *CustomCompatibilityMatrixReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, reterr error) {
	logger := log.FromContext(ctx)

	ccm := &v1alpha1.CustomCompatibilityMatrix{}
	if err := r.Get(ctx, req.NamespacedName, ccm); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	scope, err := common.NewDefaultScope(ctx, r.Client, ccm)
	if err != nil {
		logger.Error(err, "failed to create scope")
		return ctrl.Result{}, err
	}
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()

	utils.MarkCondition(ccm.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	result, err := r.addOrRemoveFinalizer(ctx, ccm)
	if result != nil {
		return *result, err
	}

	sha, err := utils.HashObject(ccm.Spec)
	if err != nil {
		return ctrl.Result{}, err
	}
	if !ccm.Status.IsSHAEqual(sha) {
		consoleCCM, err := r.ConsoleClient.UpsertCustomCompatibilityMatrix(ctx, ccm.Attributes())
		if err != nil {
			utils.MarkCondition(ccm.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}
		ccm.Status.ID = &consoleCCM.ID
		ccm.Status.SHA = lo.ToPtr(sha)
	}

	utils.MarkCondition(ccm.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkCondition(ccm.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	return ccm.Spec.Reconciliation.Requeue(), nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *CustomCompatibilityMatrixReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		For(&v1alpha1.CustomCompatibilityMatrix{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(r)
}

func (r *CustomCompatibilityMatrixReconciler) addOrRemoveFinalizer(ctx context.Context, ccm *v1alpha1.CustomCompatibilityMatrix) (*ctrl.Result, error) {
	if ccm.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(ccm, CustomCompatibilityMatrixFinalizer) {
		controllerutil.AddFinalizer(ccm, CustomCompatibilityMatrixFinalizer)
	}

	if !ccm.DeletionTimestamp.IsZero() {
		if !ccm.Status.HasID() {
			controllerutil.RemoveFinalizer(ccm, CustomCompatibilityMatrixFinalizer)
			return &ctrl.Result{}, nil
		}
		if err := r.ConsoleClient.DeleteCustomCompatibilityMatrix(ctx, *ccm.Status.ID); err != nil && !errors.IsNotFound(err) {
			utils.MarkCondition(ccm.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return &ctrl.Result{}, err
		}
		controllerutil.RemoveFinalizer(ccm, CustomCompatibilityMatrixFinalizer)
	}

	return nil, nil
}
